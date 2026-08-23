import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { IdlProgram } from '../model/report';
import { normalizeIdl } from './reconciliation';

export async function discoverIdls(root: string): Promise<Array<IdlProgram & { sourceUri: string }>> {
  const files = await findJson(root);
  const results: Array<IdlProgram & { sourceUri: string }> = [];
  for (const file of files) {
    if (!/(^|[\\/])(target[\\/]idl|idl|generated)[\\/].*\.json$/i.test(file)) continue;
    try {
      const normalized = normalizeIdl(JSON.parse(await readFile(file, 'utf8')), `file://${file}`);
      if (normalized) results.push({ ...normalized, sourceUri: `file://${file}` });
    } catch { /* malformed metadata is reported by callers when surfaced */ }
  }
  return results.sort((a, b) => a.sourceUri.localeCompare(b.sourceUri));
}

async function findJson(directory: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (['.git', 'target', 'node_modules', 'dist', 'dist-test'].includes(entry.name) && entry.isDirectory()) {
      if (entry.name !== 'target') continue;
    }
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findJson(file));
    else if (entry.isFile() && entry.name.endsWith('.json')) files.push(file);
  }
  return files;
}
