import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { RustSourceInput } from '../analysis/analyzer';
import { WorkspaceReport } from '../model/report';
import { SCHEMA_VERSION, TOOL_VERSION } from './version';

export const CACHE_FORMAT_VERSION = '7';
export const ANALYZER_VERSION_FINGERPRINT = 'rust-grammar:0.24.0;web-tree-sitter:0.25.10;framework-adapters:0.7.0;audit-products:2;reachability:2;witness-paths:1;compilation-profile:1;dispatch-indirect-calls:2;state-account-dataflow:2.1;pinocchio-account-view:0.11;quasar-framework-abi:2;steel-semantics:2;token-asset-flow:2';

export function analysisCacheKey(sources: RustSourceInput[], config: unknown): string {
  const hash = createHash('sha256');
  hash.update(`sealevel-insight-cache:${CACHE_FORMAT_VERSION}:schema-${SCHEMA_VERSION}\n`);
  hash.update(`${ANALYZER_VERSION_FINGERPRINT}\n`);
  for (const source of [...sources].sort((a, b) => a.uri.localeCompare(b.uri))) { hash.update(source.uri); hash.update('\0'); hash.update(source.source); hash.update('\0'); }
  hash.update(stableJson(sources[0]?.workspaceGraph ?? {})); hash.update(stableJson(config));
  return hash.digest('hex');
}

export async function readAnalysisCache(directory: string, key: string): Promise<WorkspaceReport | undefined> {
  try {
    const value = JSON.parse(await readFile(path.join(directory, `${key}.json`), 'utf8')) as WorkspaceReport;
    // v0.6 caches predate Token & Asset Flow v2 and are structurally incomplete:
    // only same-schema caches are restored.
    return value?.schemaVersion === SCHEMA_VERSION && value.tool?.version === TOOL_VERSION ? value : undefined;
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT' || error instanceof SyntaxError) return undefined; throw error; }
}

export async function writeAnalysisCache(directory: string, key: string, report: WorkspaceReport): Promise<void> { await mkdir(directory, { recursive: true }); await writeFile(path.join(directory, `${key}.json`), JSON.stringify(report)); }
export async function clearAnalysisCache(directory: string): Promise<void> { await rm(directory, { recursive: true, force: true }); }

function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`; return JSON.stringify(value); }
