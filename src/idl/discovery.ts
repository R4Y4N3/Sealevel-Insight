import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { AnalysisDiagnostic, IdlProgram } from '../model/report';
import { normalizeIdl } from './reconciliation';
import { pathToFileURL } from 'node:url';

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
      if (normalized) results.push({ ...normalized, sourceUri });
      else diagnostics.push({ id: `diagnostic:idl:unsupported:${relative}`, category: 'idl', severity: 'warning', message: `JSON file matched IDL patterns but was not a recognized IDL: ${relative}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } });
    } catch (error) { diagnostics.push({ id: `diagnostic:idl:malformed:${relative}`, category: 'idl', severity: 'error', message: `Malformed IDL ${relative}: ${error instanceof Error ? error.message : String(error)}`, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }); }
  }
  return { programs: results.sort((a, b) => a.sourceUri.localeCompare(b.sourceUri)), diagnostics };
}

async function findJson(directory: string, targetRoot = false): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory() && ['.git', 'node_modules', 'dist', 'dist-test'].includes(entry.name)) continue;
    if (entry.isDirectory() && targetRoot && entry.name !== 'idl') continue;
    if (entry.isDirectory()) files.push(...await findJson(file, entry.name === 'target'));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(file);
  }
  return files;
}

function globRegex(pattern: string): RegExp { let expression = '^'; const normalized = pattern.replace(/\\/g, '/'); for (let index = 0; index < normalized.length; index++) { const char = normalized[index]; if (char === '*' && normalized[index + 1] === '*') { index++; if (normalized[index + 1] === '/') { index++; expression += '(?:.*/)?'; } else expression += '.*'; } else if (char === '*') expression += '[^/]*'; else if (char === '?') expression += '[^/]'; else expression += char.replace(/[.+^${}()|[\]\\]/g, '\\$&'); } return new RegExp(`${expression}$`, 'i'); }
