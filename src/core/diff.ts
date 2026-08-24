import { ProgramUnit, WorkspaceReport } from '../model/report';

export interface Change<T = unknown> { id: string; before?: T; after?: T; fields?: Record<string, { before: unknown; after: unknown }>; }
export interface ReportDiff {
  summary: Record<string, number>;
  addedPrograms: string[];
  removedPrograms: string[];
  changedFunctions: Array<{ id: string; before?: number; after?: number; fields?: Record<string, { before: unknown; after: unknown }> }>;
  changes: Record<string, Change[]>;
  coverage: Record<string, { before: number; after: number }>;
}

export function diffReports(before: WorkspaceReport, after: WorkspaceReport): ReportDiff {
  const beforePrograms = new Map(before.programs.map(program => [program.name, program]));
  const afterPrograms = new Map(after.programs.map(program => [program.name, program]));
  const changedFunctions: ReportDiff['changedFunctions'] = [];
  const changes: Record<string, Change[]> = {};
  compareSection(changes, 'files', flatten(before, p => p.rustFiles.map(item => [item.uri, item])), flatten(after, p => p.rustFiles.map(item => [item.uri, item])), ['codeLines', 'commentLines', 'functions', 'unsafeBlocks']);
  compareSection(changes, 'instructions', flatten(before, p => p.instructions.map(item => [`${p.name}:${item.name}`, instructionShape(item)])), flatten(after, p => p.instructions.map(item => [`${p.name}:${item.name}`, instructionShape(item)])), ['complexity', 'reachableFunctions', 'cpis', 'pdas', 'accounts', 'complete']);
  compareSection(changes, 'stateTypes', flatten(before, p => (p.stateTypes ?? []).map(item => [`${p.name}:${item.name}`, item])), flatten(after, p => (p.stateTypes ?? []).map(item => [`${p.name}:${item.name}`, item])), ['serialization', 'staticSize', 'dynamicSize', 'zeroCopy']);
  compareSection(changes, 'accounts', flatten(before, p => p.accounts.map(item => [`${p.name}:${item.contextType ?? ''}:${item.name ?? item.type}:${item.ordinal ?? item.index ?? ''}`, item])), flatten(after, p => p.accounts.map(item => [`${p.name}:${item.contextType ?? ''}:${item.name ?? item.type}:${item.ordinal ?? item.index ?? ''}`, item])), ['signer', 'writable', 'optional', 'unchecked', 'ownerExpectation', 'addressExpectation', 'lifecycle']);
  compareSection(changes, 'cpis', flatten(before, p => p.securitySurface.cpiSites.map(item => [item.id ?? `${p.name}:${item.location.uri}:${item.location.startLine}:${item.location.startColumn}`, item])), flatten(after, p => p.securitySurface.cpiSites.map(item => [item.id ?? `${p.name}:${item.location.uri}:${item.location.startLine}:${item.location.startColumn}`, item])), ['target', 'targetKind', 'pdaSigned']);
  compareSection(changes, 'pdas', flatten(before, p => p.securitySurface.pdaSites.map(item => [item.id ?? `${p.name}:${item.location.uri}:${item.location.startLine}:${item.location.startColumn}`, item])), flatten(after, p => p.securitySurface.pdaSites.map(item => [item.id ?? `${p.name}:${item.location.uri}:${item.location.startLine}:${item.location.startColumn}`, item])), ['seeds', 'bump', 'usedAsSigner']);
  compareSection(changes, 'externalPrograms', flatten(before, p => (p.externalPrograms ?? []).map(item => [`${p.name}:${item.id}`, item])), flatten(after, p => (p.externalPrograms ?? []).map(item => [`${p.name}:${item.id}`, item])), ['cpiCount', 'signedCpiCount', 'programId']);
  compareSection(changes, 'dependencies', flatten(before, p => (p.packageDependencies ?? []).map(item => [`${p.name}:${item.kind}:${item.name}`, item])), flatten(after, p => (p.packageDependencies ?? []).map(item => [`${p.name}:${item.kind}:${item.name}`, item])), ['version', 'path', 'optional', 'features']);
  compareSection(changes, 'capabilities', flatten(before, p => (p.capabilities ?? []).map(item => [`${p.name}:${item.id}`, item])), flatten(after, p => (p.capabilities ?? []).map(item => [`${p.name}:${item.id}`, item])), []);
  compareSection(changes, 'idl', new Map((before.idl?.reconciliations ?? []).map(item => [item.item, item])), new Map((after.idl?.reconciliations ?? []).map(item => [item.item, item])), ['status', 'details']);
  for (const program of after.programs) for (const fn of program.functions) {
    const id = `${program.name}:${fn.name}`; const old = beforePrograms.get(program.name)?.functions.find(item => item.name === fn.name);
    if (!old) changedFunctions.push({ id, after: fn.complexity });
    else { const fields = fieldChanges(old, fn, ['complexity', 'codeLines', 'reachableFunctions', 'cpiCount', 'pdaCount', 'accountCount', 'unresolvedCalls']); if (Object.keys(fields).length) changedFunctions.push({ id, before: old.complexity, after: fn.complexity, fields }); }
  }
  for (const program of before.programs) for (const fn of program.functions) if (!afterPrograms.get(program.name)?.functions.some(item => item.name === fn.name)) changedFunctions.push({ id: `${program.name}:${fn.name}`, before: fn.complexity });
  changes.functions = changedFunctions;
  return {
    summary: numericDelta(before.summary, after.summary),
    addedPrograms: [...afterPrograms.keys()].filter(name => !beforePrograms.has(name)).sort(), removedPrograms: [...beforePrograms.keys()].filter(name => !afterPrograms.has(name)).sort(),
    changedFunctions: changedFunctions.sort(byId), changes,
    coverage: coverageDelta(before, after)
  };
}

function instructionShape(item: ProgramUnit['instructions'][number]): Record<string, unknown> { const surface = item.reachableSurface; return { complexity: surface?.reviewComplexity?.score ?? 0, reachableFunctions: surface?.functions.length ?? 0, cpis: surface?.cpis.length ?? 0, pdas: surface?.pdas.length ?? 0, accounts: surface?.accounts.length ?? 0, complete: surface?.complete ?? false }; }
function flatten(report: WorkspaceReport, values: (program: ProgramUnit) => Array<[string, unknown]>): Map<string, unknown> { return new Map(report.programs.flatMap(values)); }
function compareSection(target: Record<string, Change[]>, name: string, before: Map<string, unknown>, after: Map<string, unknown>, fields: string[]): void { const result: Change[] = []; for (const [id, value] of after) { const previous = before.get(id); if (previous === undefined) result.push({ id, after: value }); else { const changed = fieldChanges(previous, value, fields); if (Object.keys(changed).length) result.push({ id, before: previous, after: value, fields: changed }); } } for (const [id, value] of before) if (!after.has(id)) result.push({ id, before: value }); target[name] = result.sort(byId); }
function fieldChanges(before: unknown, after: unknown, fields: string[]): Record<string, { before: unknown; after: unknown }> { const result: Record<string, { before: unknown; after: unknown }> = {}; const left = asRecord(before), right = asRecord(after); for (const field of fields) if (stable(left[field]) !== stable(right[field])) result[field] = { before: left[field], after: right[field] }; return result; }
function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {}; }
function stable(value: unknown): string { return JSON.stringify(value, Object.keys(asRecord(value)).sort()); }
function numericDelta(before: WorkspaceReport['summary'], after: WorkspaceReport['summary']): Record<string, number> { const result: Record<string, number> = {}; for (const key of Object.keys(after) as Array<keyof typeof after>) result[key] = after[key] - before[key]; return result; }
function coverageDelta(before: WorkspaceReport, after: WorkspaceReport): Record<string, { before: number; after: number }> { const result: Record<string, { before: number; after: number }> = {}; const left = asRecord(before.coverage), right = asRecord(after.coverage); for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) { const a = asRecord(left[key]).percent, b = asRecord(right[key]).percent; if (typeof a === 'number' && typeof b === 'number' && a !== b) result[key] = { before: a, after: b }; } return result; }
function byId<T extends { id: string }>(a: T, b: T): number { return a.id.localeCompare(b.id); }
