#!/usr/bin/env node
import * as path from 'node:path';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { analyzeSources, RustSourceInput } from './analysis/analyzer';
import { buildScope, ScopeConfig } from './core/scope';
import { diffReports } from './core/diff';
import { markdownReport, portableReport, standaloneHtml } from './core/serialization';
import { discoverIdlsDetailed } from './idl/discovery';
import { reconcileIdls } from './idl/reconciliation';
import { buildCargoGraph } from './discovery/cargoGraph';
import { buildCapabilities } from './analysis/capabilities';
import { enrichProgramIdentities } from './discovery/programIdentity';
import { analysisCacheKey, clearAnalysisCache, readAnalysisCache, writeAnalysisCache } from './core/cache';
import { AnalysisPolicy, evaluatePolicy } from './core/policy';
import { AnalysisDiagnostic, WorkspaceReport } from './model/report';
import { mapConcurrent } from './utils/concurrency';

interface CliAnalysisOptions { include: string[]; exclude: string[]; includeTests: boolean; enableIdl: boolean; cache: boolean; maxFileSize: number; }

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) { process.stdout.write(usage()); return; }
  const command = args[0] ?? 'analyze';
  if (command === 'cache') { if (args[1] !== 'clear') throw new Error(`cache requires the clear subcommand.\n\n${usage()}`); const root = path.resolve(positional(args.slice(2))[0] ?? '.'); await clearAnalysisCache(cacheDirectory(root)); process.stdout.write(`Cleared ${cacheDirectory(root)}\n`); return; }
  if (command === 'baseline') { if (args[1] !== 'save') throw new Error(`baseline requires the save subcommand.\n\n${usage()}`); const root = path.resolve(positional(args.slice(2))[0] ?? '.'); const report = await analyze(root, args); const target = path.resolve(option(args, '--output') ?? path.join(root, '.sealevel-insight-baseline.json')); await writeFile(target, JSON.stringify(portableReport(report, root), null, 2)); process.stdout.write(`Saved baseline ${target}\n`); return; }
  if (!['analyze', 'scope', 'diff'].includes(command)) throw new Error(`Unknown command: ${command}\n\n${usage()}`);
  const format = option(args, '--format') ?? 'json';
  if (!['json', 'markdown', 'html'].includes(format)) throw new Error(`Unsupported format: ${format}. Expected json, markdown, or html.`);
  if (command === 'diff') {
    const paths = positional(args.slice(1)); if (paths.length < 2) throw new Error(`diff requires two report paths.\n\n${usage()}`);
    const before = JSON.parse(await readFile(path.resolve(paths[0]), 'utf8')); const after = JSON.parse(await readFile(path.resolve(paths[1]), 'utf8'));
    await output(diffReports(before, after), format, option(args, '--output')); return;
  }
  const root = path.resolve(positional(args.slice(1))[0] ?? '.');
  if (command === 'scope') {
    const config: ScopeConfig | undefined = hasAny(args, ['--include', '--exclude', '--include-tests', '--include-generated', '--include-duplicates', '--scope-file']) ? { include: options(args, '--include'), exclude: options(args, '--exclude'), includeTests: args.includes('--include-tests'), includeGenerated: args.includes('--include-generated'), includeDuplicates: args.includes('--include-duplicates'), scopeFile: option(args, '--scope-file') } : undefined;
    await output(await buildScope(root, config), format, option(args, '--output')); return;
  }
  const report = await analyze(root, args);
  const policy = policyFrom(args); const policyResult = evaluatePolicy(report, policy);
  if (!policyResult.passed) { report.diagnostics.push(...policyResult.failures.map(message => `Policy: ${message}`)); if (!process.exitCode) process.exitCode = 2; }
  if (args.includes('--fail-on-analysis-error') && report.analysisDiagnostics?.some(item => item.severity === 'error')) process.exitCode = 1;
  await output(portableReport(report, root), format, option(args, '--output'));
}

async function analyze(root: string, args: string[]): Promise<WorkspaceReport> {
  const config: CliAnalysisOptions = {
    include: options(args, '--include').length ? options(args, '--include') : ['**/*.rs'],
    exclude: options(args, '--exclude').length ? options(args, '--exclude') : ['**/.git/**', '**/target/**', '**/node_modules/**', '**/dist/**', '**/dist-test/**', '**/.sealevel-insight-cache/**'],
    includeTests: args.includes('--include-tests'), enableIdl: args.includes('--enable-idl') || !args.includes('--disable-idl'), cache: !args.includes('--no-cache'),
    maxFileSize: numberOption(args, '--max-file-size', 5_242_880)
  };
  const collected = await rustSources(root, config);
  const cacheKey = analysisCacheKey(collected.sources, config); const cacheDir = cacheDirectory(root);
  if (config.cache) { const cached = await readAnalysisCache(cacheDir, cacheKey); if (cached) return cached; }
  const wasm = path.resolve(__dirname, 'tree-sitter-rust.wasm'); const runtime = path.resolve(__dirname, 'tree-sitter.wasm');
  const report = await analyzeSources(collected.sources, wasm, runtime);
  report.workspace = { name: path.basename(root), roots: [root] };
  report.analysisDiagnostics?.push(...collected.diagnostics); report.diagnostics.push(...collected.diagnostics.map(item => item.message));
  const identityDiagnostics = await enrichProgramIdentities(root, report.programs); report.analysisDiagnostics?.push(...identityDiagnostics); report.diagnostics.push(...identityDiagnostics.map(item => item.message));
  if (config.enableIdl) {
    const idlDiscovery = await discoverIdlsDetailed(root); report.analysisDiagnostics?.push(...idlDiscovery.diagnostics); report.diagnostics.push(...idlDiscovery.diagnostics.map(item => item.message));
    if (idlDiscovery.programs.length) { report.idl = reconcileIdls(report.programs, idlDiscovery.programs); for (const program of report.programs) program.capabilities = buildCapabilities(program, true); }
  }
  if (config.cache) await writeAnalysisCache(cacheDir, cacheKey, report);
  return report;
}

async function rustSources(root: string, config: CliAnalysisOptions): Promise<{ sources: RustSourceInput[]; diagnostics: AnalysisDiagnostic[] }> {
  const files = await collect(root); const diagnostics: AnalysisDiagnostic[] = [];
  const rustFiles: string[] = [];
  for (const file of files.filter(file => file.endsWith('.rs'))) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (!config.include.some(pattern => globRegex(pattern).test(relative)) || config.exclude.some(pattern => globRegex(pattern).test(relative)) || !config.includeTests && /(^|\/)(tests?|benches?)(\/|$)/.test(relative)) continue;
    const size = (await stat(file)).size;
    if (size > config.maxFileSize) { diagnostics.push({ id: `diagnostic:analysis:oversized:${relative}`, category: 'analysis', severity: 'info', message: `Skipped oversized Rust file ${relative} (${size} bytes > ${config.maxFileSize}).`, location: { uri: pathToFileURL(file).href, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }); continue; }
    rustFiles.push(file);
  }
  const manifestFiles = files.filter(file => path.basename(file) === 'Cargo.toml' && !config.exclude.some(pattern => globRegex(pattern).test(path.relative(root, file).split(path.sep).join('/'))));
  const manifests = await mapConcurrent(manifestFiles, 8, async file => ({ uri: file, text: await readFile(file, 'utf8'), fileUris: files.filter(candidate => candidate === path.join(path.dirname(file), 'build.rs') || candidate.startsWith(`${path.dirname(file)}${path.sep}`)) }));
  const sourceByDirectory = new Map<string, string[]>();
  for (const file of rustFiles) { const directory = nearestRoot(file, manifestFiles.map(path.dirname)); if (directory) sourceByDirectory.set(directory, [...(sourceByDirectory.get(directory) ?? []), await readFile(file, 'utf8')]); }
  const workspaceGraph = buildCargoGraph(manifests, sourceByDirectory);
  const sources = await mapConcurrent(rustFiles, 8, async file => { const directory = nearestRoot(file, [...sourceByDirectory.keys()]); const pkg = workspaceGraph.packages.find(item => item.rootUri === directory); return { uri: pathToFileURL(file).href, source: await readFile(file, 'utf8'), packageName: pkg?.name ?? path.basename(path.dirname(path.dirname(file))), packageId: pkg?.id, packageRoot: pkg?.rootUri, packageKind: pkg?.kind, packageEvidence: pkg?.evidence, manifestUri: pkg?.manifestUri, workspaceGraph }; });
  return { sources, diagnostics };
}

async function collect(directory: string): Promise<string[]> { const { readdir } = await import('node:fs/promises'); const entries = await readdir(directory, { withFileTypes: true }); const result: string[] = []; for (const entry of entries) { if (['.git', 'target', 'node_modules', 'dist', 'dist-test', '.sealevel-insight-cache'].includes(entry.name)) continue; const file = path.join(directory, entry.name); if (entry.isDirectory()) result.push(...await collect(file)); else if (entry.isFile()) result.push(file); } return result; }
async function output(value: unknown, format: string, target?: string): Promise<void> { const text = format === 'markdown' ? (isWorkspaceReport(value) ? markdownReport(value) : `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``) : format === 'html' ? standaloneHtml(value) : JSON.stringify(value, null, 2); if (target) await writeFile(path.resolve(target), text); else process.stdout.write(`${text}\n`); }
function isWorkspaceReport(value: unknown): value is WorkspaceReport { return !!value && typeof value === 'object' && 'schemaVersion' in value && 'summary' in value && 'programs' in value; }
function option(args: string[], name: string): string | undefined { const index = args.indexOf(name); if (index < 0) return undefined; const value = args[index + 1]; if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`); return value; }
function options(args: string[], name: string): string[] { const values: string[] = []; for (let index = 0; index < args.length; index++) if (args[index] === name) { const value = args[index + 1]; if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`); values.push(value); index++; } return values; }
function positional(args: string[]): string[] { const values: string[] = []; for (let index = 0; index < args.length; index++) { if (args[index].startsWith('--')) { if (valueOptions.has(args[index])) index++; continue; } values.push(args[index]); } return values; }
const valueOptions = new Set(['--format', '--output', '--include', '--exclude', '--scope-file', '--max-file-size', '--max-function-complexity', '--max-instruction-review-complexity', '--minimum-semantic-coverage']);
function numberOption(args: string[], name: string, fallback: number): number { const value = option(args, name); if (value === undefined) return fallback; const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${name} requires a non-negative number.`); return parsed; }
function policyFrom(args: string[]): AnalysisPolicy { return { maxFunctionComplexity: optionalNumber(args, '--max-function-complexity'), maxInstructionReviewComplexity: optionalNumber(args, '--max-instruction-review-complexity'), minimumSemanticCoverage: optionalNumber(args, '--minimum-semantic-coverage'), noParseErrors: args.includes('--no-parse-errors'), noIdlMismatches: args.includes('--no-idl-mismatches') }; }
function optionalNumber(args: string[], name: string): number | undefined { return args.includes(name) ? numberOption(args, name, 0) : undefined; }
function hasAny(args: string[], names: string[]): boolean { return names.some(name => args.includes(name)); }
function cacheDirectory(root: string): string { return path.join(root, '.sealevel-insight-cache'); }
function nearestRoot(file: string, roots: string[]): string | undefined { return roots.filter(root => file.startsWith(`${root}${path.sep}`)).sort((a, b) => b.length - a.length)[0]; }
function globRegex(pattern: string): RegExp { let expression = '^'; const normalized = pattern.replace(/\\/g, '/'); for (let index = 0; index < normalized.length; index++) { const char = normalized[index]; if (char === '*' && normalized[index + 1] === '*') { index++; if (normalized[index + 1] === '/') { index++; expression += '(?:.*/)?'; } else expression += '.*'; } else if (char === '*') expression += '[^/]*'; else if (char === '?') expression += '[^/]'; else expression += char.replace(/[.+^${}()|[\]\\]/g, '\\$&'); } return new RegExp(`${expression}$`); }
function usage(): string { return `Sealevel Insight\n\nUsage:\n  sealevel-insight analyze [root] [options]\n  sealevel-insight scope [root] [options]\n  sealevel-insight diff <before.json> <after.json> [--format json|markdown|html] [--output file]\n  sealevel-insight baseline save [root] [--output baseline.json]\n  sealevel-insight cache clear [root]\n\nAnalysis options:\n  --format json|markdown|html  --output file  --include glob  --exclude glob\n  --include-tests  --enable-idl  --disable-idl  --no-cache  --max-file-size bytes\n  --fail-on-analysis-error  --no-parse-errors  --no-idl-mismatches\n  --max-function-complexity n  --max-instruction-review-complexity n\n  --minimum-semantic-coverage ratio\n`; }

main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
