import { IdlProgram, IdlReport, IdlReconciliation, ProgramUnit } from '../model/report';
import * as path from 'node:path';

export function normalizeIdl(value: unknown, sourceUri?: string): IdlProgram | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const programNode = raw.kind === 'rootNode' && raw.program && typeof raw.program === 'object' ? raw.program as Record<string, unknown> : raw;
  const instructions = records(programNode.instructions).map(item => ({
    name: string(item.name) ?? 'unknown', discriminator: normalizeType(item.discriminator),
    arguments: records(item.args ?? item.arguments).map(arg => ({ name: string(arg.name) ?? 'unknown', type: normalizeType(arg.type) })),
    accounts: flattenAccounts(records(item.accounts))
  }));
  if (!instructions.length && !('instructions' in programNode)) return undefined;
  return {
    name: string(programNode.name), address: string(programNode.address) ?? string(programNode.programId) ?? string(programNode.publicKey),
    version: string(raw.version ?? object(raw.metadata).version), spec: string(raw.spec), instructions,
    types: records(programNode.types ?? programNode.accounts).map(item => ({ name: string(item.name) ?? 'unknown', type: item.type })),
    events: records(programNode.events).map(item => ({ name: string(item.name) ?? 'unknown' })),
    errors: records(programNode.errors).map(item => ({ name: string(item.name) ?? 'unknown', code: number(item.code), message: string(item.msg ?? item.message) })), sourceUri
  };
}

export function reconcileIdl(program: Pick<ProgramUnit, 'instructions' | 'identity'> & Partial<Pick<ProgramUnit, 'accounts' | 'relationships' | 'stateTypes' | 'events' | 'errors'>>, idl: IdlProgram): IdlReport {
  const sourceNames = new Set(program.instructions.map(instruction => instruction.name));
  const idlNames = new Set(idl.instructions.map(instruction => instruction.name));
  const reconciliations: IdlReconciliation[] = [...sourceNames].sort().map(name => ({ status: idlNames.has(name) ? 'MATCHED' as const : 'SOURCE_ONLY' as const, item: `instruction:${name}` }));
  reconciliations.push(...[...idlNames].filter(name => !sourceNames.has(name)).sort().map(name => ({ status: 'IDL_ONLY' as const, item: `instruction:${name}` })));
  for (const sourceInstruction of program.instructions) {
    const idlInstruction = idl.instructions.find(item => item.name === sourceInstruction.name);
    if (!idlInstruction) continue;
    compareArguments(sourceInstruction.name, sourceInstruction.arguments ?? [], idlInstruction.arguments ?? [], reconciliations);
    const accountIds = program.relationships?.filter(item => item.instructionId === (sourceInstruction.id ?? sourceInstruction.name)).map(item => item.accountId) ?? [];
    const sourceAccounts = accountIds.map(id => (program.accounts ?? []).find(account => account.id === id)).filter((item): item is ProgramUnit['accounts'][number] => !!item);
    if (!sourceAccounts.length && sourceInstruction.contextType) reconciliations.push({ status: 'UNKNOWN', item: `accounts:${sourceInstruction.name}`, details: 'Source context exists but source account fields could not be resolved.' });
    else compareAccounts(sourceInstruction.name, sourceAccounts, idlInstruction.accounts, reconciliations);
  }
  compareNamed('state', (program.stateTypes ?? []).map(item => item.name), (idl.types ?? []).map(item => item.name), reconciliations);
  compareNamed('event', (program.events ?? []).map(item => item.name), (idl.events ?? []).map(item => item.name), reconciliations);
  compareNamed('error', (program.errors ?? []).map(item => item.name), (idl.errors ?? []).map(item => item.name), reconciliations);
  const diagnostics = program.identity?.programId && idl.address && program.identity.programId !== idl.address ? [`Program ID mismatch: source ${program.identity.programId}, IDL ${idl.address}`] : [];
  if (diagnostics.length) reconciliations.push({ status: 'MISMATCH', item: 'programId', details: diagnostics[0] });
  return { programs: [idl], reconciliations, diagnostics: [...diagnostics, ...reconciliations.filter(item => item.status === 'MISMATCH').map(item => `${item.item}: ${item.details ?? 'source and IDL differ'}`)] };
}

export function reconcileIdls(programs: ProgramUnit[], idls: IdlProgram[]): IdlReport {
  const reconciliations: IdlReconciliation[] = []; const diagnostics: string[] = [];
  for (const idl of idls) {
    const sourceName = idl.name ?? (idl.sourceUri ? path.basename(idl.sourceUri, '.json') : '');
    const normalizedName = normalizeName(sourceName);
    const matches = programs.filter(program => (idl.address && program.identity?.programId === idl.address) || (normalizedName && normalizeName(program.name) === normalizedName));
    const program = matches.length === 1 ? matches[0] : programs.length === 1 ? programs[0] : undefined;
    if (!program) { diagnostics.push(`Could not match IDL ${idl.sourceUri ?? idl.address ?? '<unknown>'} to a source program.`); reconciliations.push(...idl.instructions.map(instruction => ({ status: 'IDL_ONLY' as const, item: `instruction:${instruction.name}` }))); continue; }
    if (idl.address) {
      const evidence = { description: `IDL program address ${idl.address}`, location: idl.sourceUri ? { uri: idl.sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } : undefined };
      program.identity ??= { programId: idl.address, sources: [], conflicts: [] };
      if (program.identity.programId && program.identity.programId !== idl.address) program.identity.conflicts.push(evidence);
      else if (!program.identity.sources.some(item => item.description === evidence.description)) program.identity.sources.push(evidence);
    }
    const result = reconcileIdl(program, idl); reconciliations.push(...result.reconciliations); diagnostics.push(...result.diagnostics);
  }
  return { programs: idls, reconciliations, diagnostics: [...new Set(diagnostics)] };
}

function compareArguments(instruction: string, source: Array<{ name: string; type?: string }>, idl: Array<{ name: string; type?: string }>, output: IdlReconciliation[]): void {
  if (source.length !== idl.length) output.push({ status: 'MISMATCH', item: `instruction:${instruction}.arguments`, details: `source count=${source.length}, IDL count=${idl.length}` });
  for (let index = 0; index < Math.min(source.length, idl.length); index++) {
    if (source[index].name !== idl[index].name) output.push({ status: 'MISMATCH', item: `instruction:${instruction}.argument:${index}`, details: `source name=${source[index].name}, IDL name=${idl[index].name}` });
    if (source[index].type && idl[index].type && normalizeType(source[index].type) !== normalizeType(idl[index].type)) output.push({ status: 'MISMATCH', item: `instruction:${instruction}.argument:${source[index].name}.type`, details: `source=${source[index].type}, IDL=${idl[index].type}` });
  }
}
function compareAccounts(instruction: string, source: ProgramUnit['accounts'], idl: IdlProgram['instructions'][number]['accounts'], output: IdlReconciliation[]): void {
  if (source.length !== idl.length) output.push({ status: 'MISMATCH', item: `instruction:${instruction}.accounts`, details: `source count=${source.length}, IDL count=${idl.length}` });
  for (let index = 0; index < Math.min(source.length, idl.length); index++) {
    const actual = source[index], expected = idl[index]; const prefix = `instruction:${instruction}.account:${expected.name}`;
    if (actual.name !== expected.name) output.push({ status: 'MISMATCH', item: `${prefix}.order`, details: `source account ${index}=${actual.name}, IDL account ${index}=${expected.name}` });
    for (const [key, sourceValue, idlValue] of [['signer', !!actual.signer, !!expected.signer], ['writable', !!actual.writable, !!expected.writable], ['optional', !!actual.optional, !!expected.optional]] as const) if (sourceValue !== idlValue) output.push({ status: 'MISMATCH', item: `${prefix}.${key}`, details: `source ${key}=${sourceValue}, IDL ${key}=${idlValue}` });
    const sourcePda = !!actual.constraints?.some(item => item.kind === 'seeds'); if (expected.pda !== undefined && sourcePda !== !!expected.pda) output.push({ status: 'MISMATCH', item: `${prefix}.pda`, details: `source PDA=${sourcePda}, IDL PDA=${!!expected.pda}` });
  }
}
function compareNamed(kind: string, source: string[], idl: string[], output: IdlReconciliation[]): void { const sourceSet = new Set(source), idlSet = new Set(idl); for (const name of sourceSet) if (!idlSet.has(name)) output.push({ status: 'SOURCE_ONLY', item: `${kind}:${name}` }); for (const name of idlSet) if (!sourceSet.has(name)) output.push({ status: 'IDL_ONLY', item: `${kind}:${name}` }); }
function flattenAccounts(items: Record<string, unknown>[]): IdlProgram['instructions'][number]['accounts'] { return items.flatMap(item => Array.isArray(item.accounts) ? flattenAccounts(records(item.accounts)) : [{ name: string(item.name) ?? 'unknown', signer: item.isSigner === true || item.signer === true, writable: item.isMut === true || item.writable === true, optional: item.optional === true, pda: item.pda }]); }
function records(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : []; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function string(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
function number(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }
function normalizeType(value: unknown): string | undefined { if (value === undefined) return undefined; return typeof value === 'string' ? value.replace(/\s+/g, '') : JSON.stringify(value); }
function normalizeName(value: string): string { return value.replace(/[-_]/g, '').toLowerCase(); }
