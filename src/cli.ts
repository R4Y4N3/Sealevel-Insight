#!/usr/bin/env node
import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import { analyzeSources, RustSourceInput } from './analysis/analyzer';
import { buildScope } from './core/scope';
import { diffReports } from './core/diff';
import { markdownReport, portableReport, standaloneHtml } from './core/serialization';
import { discoverIdls } from './idl/discovery';
import { reconcileIdl } from './idl/reconciliation';
import { buildCargoGraph } from './discovery/cargoGraph';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'analyze';
  const root = path.resolve(args[1] ?? '.');
  const format = option(args, '--format') ?? 'json';
  if (command === 'scope') { await output(await buildScope(root), format, option(args, '--output')); return; }
  if (command === 'diff') {
    const before = JSON.parse(await readFile(path.resolve(args[1]), 'utf8'));
    const after = JSON.parse(await readFile(path.resolve(args[2]), 'utf8'));
    await output(diffReports(before, after), 'json', option(args, '--output')); return;
  }
  const sources = await rustSources(root);
  const wasm = path.resolve(__dirname, 'tree-sitter-rust.wasm');
  const runtime = path.resolve(__dirname, 'tree-sitter.wasm');
  const report = portableReport(await analyzeSources(sources, wasm, runtime), root);
  const idls = await discoverIdls(root);
  if (idls.length) {
    report.idl = reconcileIdl(report.programs[0] ?? { instructions: [] }, idls[0]);
    report.idl.programs = idls;
  }
  if (report.diagnostics.length && args.includes('--fail-on-analysis-error')) process.exitCode = 1;
  await output(report, format, option(args, '--output'));
}

async function rustSources(root: string): Promise<RustSourceInput[]> {
  const files = await collect(root);
  const rustFiles = files.filter(file => file.endsWith('.rs'));
  const manifestFiles = files.filter(file => path.basename(file) === 'Cargo.toml');
  const manifests = await Promise.all(manifestFiles.map(async file => ({ uri: file, text: await readFile(file, 'utf8') })));
  const sourceByDirectory = new Map<string, string[]>();
  for (const file of rustFiles) { const directory = manifestFiles.map(manifest => path.dirname(manifest)).filter(directory => file.startsWith(`${directory}${path.sep}`)).sort((a, b) => b.length - a.length)[0]; if (directory) sourceByDirectory.set(directory, [...(sourceByDirectory.get(directory) ?? []), await readFile(file, 'utf8')]); }
  const workspaceGraph = buildCargoGraph(manifests, sourceByDirectory);
  return Promise.all(rustFiles.map(async file => { const directory = [...sourceByDirectory.keys()].filter(item => file.startsWith(`${item}${path.sep}`)).sort((a, b) => b.length - a.length)[0]; const pkg = workspaceGraph.packages.find(item => item.rootUri === directory); return { uri: `file://${file}`, source: await readFile(file, 'utf8'), packageName: pkg?.name ?? path.basename(path.dirname(path.dirname(file))), packageKind: pkg?.kind, packageEvidence: pkg?.evidence, manifestUri: pkg?.manifestUri, workspaceGraph }; }));
}
async function collect(directory: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(directory, { withFileTypes: true }); const result: string[] = [];
  for (const entry of entries) { if (['.git', 'target', 'node_modules', 'dist', 'dist-test'].includes(entry.name)) continue; const file = path.join(directory, entry.name); if (entry.isDirectory()) result.push(...await collect(file)); else if (entry.isFile()) result.push(file); }
  return result;
}
async function output(value: unknown, format: string, target?: string): Promise<void> { const text = format === 'markdown' ? markdownReport(value as never) : format === 'html' ? standaloneHtml(value) : JSON.stringify(value, null, 2); if (target) { const { writeFile } = await import('node:fs/promises'); await writeFile(path.resolve(target), text); } else process.stdout.write(`${text}\n`); }
function option(args: string[], name: string): string | undefined { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; }
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
