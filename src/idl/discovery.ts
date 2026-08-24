import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { AnalysisDiagnostic, IdlProgram } from '../model/report';
import { normalizeIdl } from './reconciliation';
import { pathToFileURL } from 'node:url';
import { DEFAULT_PRUNED_DIRECTORIES, walkFiles } from '../discovery/fileWalker';

export const DEFAULT_IDL_PATTERNS = ['**/target/idl/*.json', '**/idl/**/*.json', '**/generated/idl/**/*.json', '**/codama*.json'];
export interface IdlDiscoveryResult { programs: Array<IdlProgram & { sourceUri: string }>; diagnostics: AnalysisDiagnostic[]; }

export async function discoverIdls(root: string, patterns: string[] = DEFAULT_IDL_PATTERNS): Promise<Array<IdlProgram & { sourceUri: string }>> {
  return (await discoverIdlsDetailed(root, patterns)).programs;
}

export async function discoverIdlsDetailed(root: string, patterns: string[] = DEFAULT_IDL_PATTERNS): Promise<IdlDiscoveryResult> {
  const files = await findJson(root);
  const results: Array<IdlProgram & { sourceUri: string }> = [];
  const diagnostics: AnalysisDiagnostic[] = [];
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    if (!patterns.some(pattern => globRegex(pattern).test(relative))) continue;
    const sourceUri = pathToFileURL(file).href;
    try {
      const normalized = normalizeIdl(JSON.parse(await readFile(file, 'utf8')), sourceUri);
      if (normalized) {
        results.push({ ...normalized, sourceUri });
        diagnostics.push(...(normalized.validationErrors ?? []).map((message, index) => ({ id: `diagnostic:idl:schema:${relative}:${index}`, category: 'idl' as const, severity: 'warning' as const, message: `IDL ${relative}: ${message}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } })));
      }
      else diagnostics.push({ id: `diagnostic:idl:unsupported:${relative}`, category: 'idl', severity: 'warning', message: `JSON file matched IDL patterns but was not a recognized IDL: ${relative}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } });
    } catch (error) { diagnostics.push({ id: `diagnostic:idl:malformed:${relative}`, category: 'idl', severity: 'error', message: `Malformed IDL ${relative}: ${error instanceof Error ? error.message : String(error)}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }); }
  }
  return { programs: results.sort((a, b) => a.sourceUri.localeCompare(b.sourceUri)), diagnostics };
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
