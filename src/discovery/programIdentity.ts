import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { parse } from '@iarna/toml';
import { AnalysisDiagnostic, ProgramUnit } from '../model/report';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { walkFiles } from './fileWalker';

export async function enrichProgramIdentities(root: string, programs: ProgramUnit[]): Promise<AnalysisDiagnostic[]> {
  const diagnostics: AnalysisDiagnostic[] = [];
  for (const file of await findConfigs(root)) {
    try {
      const raw = parse(await readFile(file, 'utf8')) as Record<string, unknown>;
      if (path.basename(file).toLowerCase() === 'anchor.toml') applyAnchor(raw, file, programs, diagnostics);
    } catch (error) { diagnostics.push({ id: `diagnostic:identity:config:${file}`, category: 'identity', severity: 'error', message: `Invalid framework config ${file}: ${error instanceof Error ? error.message : String(error)}`, location: location(file) }); }
  }
  return diagnostics;
}

export async function programIdentityFingerprint(root: string): Promise<string> { const hash = createHash('sha256'); for (const file of await findConfigs(root)) { hash.update(file); hash.update('\0'); hash.update(await readFile(file)); } return hash.digest('hex'); }

function applyAnchor(raw: Record<string, unknown>, file: string, programs: ProgramUnit[], diagnostics: AnalysisDiagnostic[]): void {
  const sections = object(raw.programs);
  for (const [cluster, entries] of Object.entries(sections)) {
    for (const [name, value] of Object.entries(object(entries))) {
      if (typeof value !== 'string') continue;
      const matches = programs.filter(program => normalize(program.name) === normalize(name));
      if (matches.length !== 1) { diagnostics.push({ id: `diagnostic:identity:anchor:${cluster}:${name}`, category: 'identity', severity: 'warning', message: `Anchor.toml program ${name} (${cluster}) could not be matched uniquely to a Cargo program.`, location: location(file) }); continue; }
      const program = matches[0]; const evidence = { description: `Anchor.toml ${cluster} program address ${value}`, location: location(file) };
      program.identity ??= { programId: value, sources: [], conflicts: [] };
      if (program.identity.programId && program.identity.programId !== value) { program.identity.conflicts.push(evidence); diagnostics.push({ id: `diagnostic:identity:conflict:${program.name}:${cluster}`, category: 'identity', severity: 'warning', message: `Program ID conflict for ${program.name}: source ${program.identity.programId}, Anchor.toml ${value}`, location: location(file) }); }
      else if (!program.identity.sources.some(item => item.description === evidence.description)) program.identity.sources.push(evidence);
    }
  }
}

async function findConfigs(directory: string): Promise<string[]> { return walkFiles(directory, { includeFile: (_relative, name) => /^(?:Anchor|Quasar)\.toml$/i.test(name) }); }
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function normalize(value: string): string { return value.replace(/[-_]/g, '').toLowerCase(); }
function location(file: string) { return { uri: pathToFileURL(file).href, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 }; }
