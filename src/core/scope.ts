import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

export interface ScopeConfig { include?: string[]; exclude?: string[]; includeTests?: boolean; includeGenerated?: boolean; includeDuplicates?: boolean; scopeFile?: string; }
export interface ScopeFile { path: string; sha256: string; inScope: boolean; duplicateOf?: string; generated: boolean; test: boolean; }
export interface ScopeReport { files: ScopeFile[]; inScope: string[]; outOfScope: string[]; excluded: string[]; tests: string[]; generated: string[]; duplicates: string[]; diagnostics: string[]; configSource?: string; }

export async function buildScope(root: string, config?: ScopeConfig): Promise<ScopeReport> {
  const loaded = config ? { config: { ...config }, diagnostics: [] as string[], source: undefined as string | undefined } : await loadScopeConfig(root);
  config = loaded.config;
  if (config.scopeFile) {
    const scopePath = path.resolve(root, config.scopeFile);
    try { mergeScopeFile(config, await readScopeFile(scopePath, loaded.diagnostics)); loaded.source = scopePath; }
    catch (error) { loaded.diagnostics.push(`Invalid scope file ${config.scopeFile}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const files = (await walk(root)).sort();
  const result: ScopeFile[] = [];
  for (const file of files) {
    const relative = path.relative(root, file).split(path.sep).join('/');
    const source = await readFile(file);
    const normalized = source.toString('utf8').replace(/\r\n?/g, '\n');
    const sha256 = createHash('sha256').update(normalized).digest('hex');
    const generated = /(^|\/)(generated|target)(\/|$)/i.test(relative);
    const test = /(^|\/)(tests?|benches?)(\/|$)/i.test(relative);
    const excludedByPattern = matches(relative, config.exclude ?? ['**/target/**', '**/node_modules/**', '**/.git/**']);
    const inScope = matches(relative, config.include ?? ['**/*']) && !excludedByPattern && (config.includeTests === true || !test) && (config.includeGenerated === true || !generated);
    result.push({ path: relative, sha256, inScope, generated, test });
  }
  const groups = new Map<string, ScopeFile[]>();
  for (const file of result) groups.set(file.sha256, [...(groups.get(file.sha256) ?? []), file]);
  for (const group of groups.values()) {
    const canonical = group.find(file => file.inScope) ?? group[0];
    for (const file of group) if (file !== canonical) file.duplicateOf = canonical.path;
  }
  const includeDuplicate = config.includeDuplicates === true;
  return { files: result.sort((a, b) => a.path.localeCompare(b.path)), inScope: result.filter(file => file.inScope && (includeDuplicate || !file.duplicateOf)).map(file => file.path), outOfScope: result.filter(file => !file.inScope).map(file => file.path), excluded: result.filter(file => !file.inScope && !file.test && !file.generated).map(file => file.path), tests: result.filter(file => file.test).map(file => file.path), generated: result.filter(file => file.generated).map(file => file.path), duplicates: result.filter(file => !!file.duplicateOf).map(file => file.path), diagnostics: loaded.diagnostics, configSource: loaded.source };
}

async function loadScopeConfig(root: string): Promise<{ config: ScopeConfig; diagnostics: string[]; source?: string }> {
  const diagnostics: string[] = [];
  const configPath = path.join(root, '.sealevel-insight.json');
  try {
    const raw = JSON.parse(await readFile(configPath, 'utf8')) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('configuration must be a JSON object');
    const value = raw as Record<string, unknown>;
    const config: ScopeConfig = { include: stringArray(value.include), exclude: stringArray(value.exclude), includeTests: boolean(value.includeTests), includeGenerated: boolean(value.includeGenerated), includeDuplicates: boolean(value.includeDuplicates), scopeFile: typeof value.scopeFile === 'string' ? value.scopeFile : undefined };
    if (config.scopeFile) mergeScopeFile(config, await readScopeFile(path.resolve(root, config.scopeFile), diagnostics));
    return { config, diagnostics, source: configPath };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') diagnostics.push(`Invalid .sealevel-insight.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  const scopeFile = path.join(root, 'scopefile.txt');
  try { const config: ScopeConfig = {}; mergeScopeFile(config, await readScopeFile(scopeFile, diagnostics)); return { config, diagnostics, source: scopeFile }; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') diagnostics.push(`Invalid scopefile.txt: ${error instanceof Error ? error.message : String(error)}`); }
  return { config: {}, diagnostics };
}

async function readScopeFile(file: string, diagnostics: string[]): Promise<ScopeConfig> {
  const include: string[] = [], exclude: string[] = [];
  for (const [index, raw] of (await readFile(file, 'utf8')).split(/\r?\n/).entries()) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    if (line.startsWith('!') || line.startsWith('-')) exclude.push(line.slice(1).trim());
    else include.push(line.startsWith('+') ? line.slice(1).trim() : line);
    if (!(line.startsWith('!') || line.startsWith('-') || line.startsWith('+') || line.includes('*') || line.includes('/'))) diagnostics.push(`scopefile.txt line ${index + 1} is treated as an include path: ${line}`);
  }
  return { include: include.length ? include : undefined, exclude: exclude.length ? exclude : undefined };
}
function mergeScopeFile(target: ScopeConfig, source: ScopeConfig): void { target.include = [...(target.include ?? []), ...(source.include ?? [])]; target.exclude = [...(target.exclude ?? []), ...(source.exclude ?? [])]; }
function stringArray(value: unknown): string[] | undefined { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && !!item) : undefined; }
function boolean(value: unknown): boolean | undefined { return typeof value === 'boolean' ? value : undefined; }

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
