import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { RustSourceInput } from '../analysis/analyzer';
import { WorkspaceReport } from '../model/report';

export const CACHE_FORMAT_VERSION = '1';
export const ANALYZER_VERSION_FINGERPRINT = 'rust-grammar:0.24.0;web-tree-sitter:0.25.10;framework-adapters:0.6.0';

export function analysisCacheKey(sources: RustSourceInput[], config: unknown): string {
  const hash = createHash('sha256');
  hash.update(`sealevel-insight-cache:${CACHE_FORMAT_VERSION}:schema-0.6.0\n`);
  hash.update(`${ANALYZER_VERSION_FINGERPRINT}\n`);
  for (const source of [...sources].sort((a, b) => a.uri.localeCompare(b.uri))) { hash.update(source.uri); hash.update('\0'); hash.update(source.source); hash.update('\0'); }
  hash.update(stableJson(sources[0]?.workspaceGraph ?? {})); hash.update(stableJson(config));
  return hash.digest('hex');
}

export async function readAnalysisCache(directory: string, key: string): Promise<WorkspaceReport | undefined> {
  try {
    const value = JSON.parse(await readFile(path.join(directory, `${key}.json`), 'utf8')) as WorkspaceReport;
    return value?.schemaVersion === '0.6.0' && value.tool?.version === '0.6.0' ? value : undefined;
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return undefined; throw error; }
}

export async function writeAnalysisCache(directory: string, key: string, report: WorkspaceReport): Promise<void> { await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, `${key}.json`), JSON.stringify(report)); }
export async function clearAnalysisCache(directory: string): Promise<void> { await rm(directory, { recursive: true, force: true }); }

function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`; return JSON.stringify(value); }
