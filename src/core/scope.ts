import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

export interface ScopeConfig { include?: string[]; exclude?: string[]; }
export interface ScopeFile { path: string; sha256: string; inScope: boolean; duplicateOf?: string; generated: boolean; test: boolean; }
export interface ScopeReport { files: ScopeFile[]; inScope: string[]; excluded: string[]; duplicates: string[]; }

export async function buildScope(root: string, config: ScopeConfig = {}): Promise<ScopeReport> {
  const files = (await walk(root)).sort();
  const result: ScopeFile[] = [];
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    const source = await readFile(file);
    const sha256 = createHash('sha256').update(source).digest('hex');
    const inScope = matches(relative, config.include ?? ['**/*']) && !matches(relative, config.exclude ?? ['**/target/**', '**/node_modules/**', '**/.git/**', '**/tests/**', '**/generated/**']);
    result.push({ path: relative, sha256, inScope, generated: /generated|target\//i.test(relative), test: /(^|\/)(tests?|benches?)\//i.test(relative) });
  }
  const groups = new Map<string, ScopeFile[]>();
  for (const file of result) groups.set(file.sha256, [...(groups.get(file.sha256) ?? []), file]);
  for (const group of groups.values()) {
    const canonical = group.find(file => file.inScope) ?? group[0];
    for (const file of group) if (file !== canonical) file.duplicateOf = canonical.path;
  }
  return { files: result.sort((a, b) => a.path.localeCompare(b.path)), inScope: result.filter(file => file.inScope && !file.duplicateOf).map(file => file.path), excluded: result.filter(file => !file.inScope).map(file => file.path), duplicates: result.filter(file => !!file.duplicateOf).map(file => file.path) };
}

async function walk(directory: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (['.git', 'target', 'node_modules', 'dist', 'dist-test'].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full)); else if (entry.isFile()) files.push(full);
  }
  return files;
}

function matches(value: string, patterns: string[]): boolean {
  return patterns.some(pattern => globRegex(pattern).test(value));
}

function globRegex(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, '/');
  let expression = '^';
  for (let index = 0; index < normalized.length; index++) {
    const current = normalized[index];
    if (current === '*' && normalized[index + 1] === '*') {
      index++;
      if (normalized[index + 1] === '/') { index++; expression += '(?:.*/)?'; }
      else expression += '.*';
    } else if (current === '*') expression += '[^/]*';
    else if (current === '?') expression += '[^/]';
    else expression += current.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`${expression}$`);
}
