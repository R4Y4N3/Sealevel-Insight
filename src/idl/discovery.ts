import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { IdlProgram } from '../model/report';
import { normalizeIdl } from './reconciliation';
import { pathToFileURL } from 'node:url';

export async function discoverIdls(root: string): Promise<Array<IdlProgram & { sourceUri: string }>> {
  const files = await findJson(root);
  const results: Array<IdlProgram & { sourceUri: string }> = [];
  for (const file of files) {
    if (!/(^|[\\/])(target[\\/]idl|idl|generated)[\\/].*\.json$/i.test(file)) continue;
    try {
      const sourceUri = pathToFileURL(file).href;
      const normalized = normalizeIdl(JSON.parse(await readFile(file, 'utf8')), sourceUri);
      if (normalized) results.push({ ...normalized, sourceUri });
    } catch { /* malformed metadata is reported by callers when surfaced */ }
  }
  return results.sort((a, b) => a.sourceUri.localeCompare(b.sourceUri));
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
