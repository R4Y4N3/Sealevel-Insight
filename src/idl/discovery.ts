import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { AnalysisDiagnostic, IdlProgram } from '../model/report';
import { normalizeIdls } from './reconciliation';
import { pathToFileURL } from 'node:url';
import { DEFAULT_PRUNED_DIRECTORIES, walkFiles } from '../discovery/fileWalker';

export const DEFAULT_IDL_PATTERNS = ['**/target/idl/*.json', '**/idl/**/*.json', '**/generated/idl/**/*.json', '**/codama*.json'];
export interface IdlDiscoveryResult { programs: Array<IdlProgram & { sourceUri: string }>; diagnostics: AnalysisDiagnostic[]; }

export async function discoverIdls(root: string, patterns: string[] = DEFAULT_IDL_PATTERNS): Promise<Array<IdlProgram & { sourceUri: string }>> {
  return (await discoverIdlsDetailed(root, patterns)).programs;
}

export async function discoverIdlsDetailed(root: string, patterns: string[] = DEFAULT_IDL_PATTERNS): Promise<IdlDiscoveryResult> {
  const rootPath = path.resolve(root);
  const files = await findJson(rootPath);
  const results: Array<IdlProgram & { sourceUri: string }> = [];
  const diagnostics: AnalysisDiagnostic[] = [];
  const selected = new Set(files.filter(file => {
    const relative = path.relative(rootPath, file).split(path.sep).join('/');
    return patterns.some(pattern => globRegex(pattern).test(relative));
  }));
  for (const configFile of files.filter(file => path.basename(file) === 'codama.json')) {
    try {
      const config = JSON.parse(await readFile(configFile, 'utf8')) as unknown;
      if (object(config).kind === 'rootNode') { selected.add(configFile); continue; }
      const references = [string(object(config).idl), ...strings(object(config).additionalIdls)].filter((item): item is string => !!item);
      for (const reference of references) {
        const resolved = path.resolve(path.dirname(configFile), reference);
        const relativeConfig = path.relative(rootPath, configFile).split(path.sep).join('/');
        const relativeToRoot = path.relative(rootPath, resolved);
        if (relativeToRoot === '..' || relativeToRoot.startsWith(`..${path.sep}`) || path.isAbsolute(relativeToRoot)) {
          diagnostics.push({ id: `diagnostic:idl:codama:outside:${relativeConfig}:${reference}`, category: 'idl', severity: 'warning', message: `Codama IDL reference is outside the analysis root and was not read: ${reference}`, location: location(configFile) });
        } else if (!files.includes(resolved)) {
          diagnostics.push({ id: `diagnostic:idl:codama:missing:${relativeConfig}:${reference}`, category: 'idl', severity: 'warning', message: `Codama IDL reference does not exist or is not a JSON file: ${reference}`, location: location(configFile) });
        } else selected.add(resolved);
      }
    } catch (error) {
      diagnostics.push({ id: `diagnostic:idl:codama:malformed:${path.relative(rootPath, configFile)}`, category: 'idl', severity: 'warning', message: `Malformed Codama configuration ${path.relative(rootPath, configFile)}: ${error instanceof Error ? error.message : String(error)}`, location: location(configFile) });
    }
  }
  for (const file of [...selected].sort()) {
    const relative = path.relative(rootPath, file).split(path.sep).join('/');
    const sourceUri = pathToFileURL(file).href;
    try {
      const normalized = normalizeIdls(JSON.parse(await readFile(file, 'utf8')), sourceUri);
      if (normalized.length) {
        results.push(...normalized.map(program => ({ ...program, sourceUri })));
        diagnostics.push(...normalized.flatMap(program => (program.validationErrors ?? []).map((message, index) => ({ id: `diagnostic:idl:schema:${relative}:${program.name ?? 'unknown'}:${index}`, category: 'idl' as const, severity: 'warning' as const, message: `IDL ${relative}${program.name ? ` (${program.name})` : ''}: ${message}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }))));
      }
      else diagnostics.push({ id: `diagnostic:idl:unsupported:${relative}`, category: 'idl', severity: 'warning', message: `JSON file matched IDL patterns but was not a recognized IDL: ${relative}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } });
    } catch (error) { diagnostics.push({ id: `diagnostic:idl:malformed:${relative}`, category: 'idl', severity: 'error', message: `Malformed IDL ${relative}: ${error instanceof Error ? error.message : String(error)}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }); }
  }
  return { programs: results.sort((a, b) => a.sourceUri.localeCompare(b.sourceUri) || (a.name ?? '').localeCompare(b.name ?? '')), diagnostics };
}

async function findJson(root: string): Promise<string[]> {
  const pruned = new Set(DEFAULT_PRUNED_DIRECTORIES); pruned.delete('target');
  return walkFiles(root, {
    prunedDirectories: pruned,
    shouldDescend: relative => { const parts = relative.split('/'); const target = parts.lastIndexOf('target'); return target < 0 || parts.length === target + 1 || parts[target + 1] === 'idl'; },
    includeFile: (_relative, name) => name.endsWith('.json')
  });
}

function globRegex(pattern: string): RegExp { let expression = '^'; const normalized = pattern.replace(/\\/g, '/'); for (let index = 0; index < normalized.length; index++) { const char = normalized[index]; if (char === '*' && normalized[index + 1] === '*') { index++; if (normalized[index + 1] === '/') { index++; expression += '(?:.*/)?'; } else expression += '.*'; } else if (char === '*') expression += '[^/]*'; else if (char === '?') expression += '[^/]'; else expression += char.replace(/[.+^${}()|[\]\\]/g, '\\$&'); } return new RegExp(`${expression}$`, 'i'); }
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function string(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function location(file: string) { return { uri: pathToFileURL(file).href, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 }; }
