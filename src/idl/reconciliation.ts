import { IdlInstructionAccount, IdlProgram, IdlReport, IdlReconciliation, ProgramUnit } from '../model/report';
import * as path from 'node:path';

export function normalizeIdl(value: unknown, sourceUri?: string): IdlProgram | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const programNode = raw.kind === 'rootNode' && raw.program && typeof raw.program === 'object' ? raw.program as Record<string, unknown> : raw;
  const metadata = object(programNode.metadata ?? raw.metadata);
  const instructions = records(programNode.instructions).map(item => ({
    name: string(item.name) ?? 'unknown', discriminator: normalizeType(item.discriminator),
    arguments: records(item.args ?? item.arguments).map(arg => ({ name: string(arg.name) ?? 'unknown', type: normalizeType(arg.type), docs: strings(arg.docs) })),
    accounts: flattenAccounts(records(item.accounts)), returns: normalizeType(item.returns ?? item.returnType), docs: strings(item.docs)
  }));
  if (!instructions.length && !('instructions' in programNode)) return undefined;
  const accountDefinitions = records(programNode.accounts).map(item => ({ name: string(item.name) ?? 'unknown', discriminator: normalizeType(item.discriminator) }));
  const explicitTypes = records(programNode.types);
  const legacyAccountTypes = explicitTypes.length ? [] : records(programNode.accounts).filter(item => item.type !== undefined);
  const result: IdlProgram = {
    name: string(programNode.name) ?? string(metadata.name), address: string(programNode.address) ?? string(programNode.programId) ?? string(programNode.publicKey),
    version: string(programNode.version ?? raw.version ?? metadata.version), spec: string(programNode.spec ?? raw.spec ?? metadata.spec),
    description: string(metadata.description), repository: string(metadata.repository), contact: string(metadata.contact), deployments: stringRecord(metadata.deployments),
    dependencies: records(metadata.dependencies).map(item => ({ name: string(item.name) ?? 'unknown', version: string(item.version) ?? 'unknown' })), docs: strings(programNode.docs), instructions,
    accounts: accountDefinitions,
    types: [...explicitTypes, ...legacyAccountTypes].map(item => ({ name: string(item.name) ?? 'unknown', type: item.type, serialization: item.serialization, repr: item.repr, generics: array(item.generics), docs: strings(item.docs) })),
    events: records(programNode.events).map(item => ({ name: string(item.name) ?? 'unknown', discriminator: normalizeType(item.discriminator) })),
    errors: records(programNode.errors).map(item => ({ name: string(item.name) ?? 'unknown', code: number(item.code), message: string(item.msg ?? item.message) })),
    constants: records(programNode.constants).map(item => ({ name: string(item.name) ?? 'unknown', type: normalizeType(item.type), value: string(item.value), docs: strings(item.docs) })), sourceUri
  };
  result.validationErrors = validateCurrentSolanaIdl(programNode, result);
  return result;
}

export function reconcileIdl(program: Pick<ProgramUnit, 'instructions' | 'identity'> & Partial<Pick<ProgramUnit, 'accounts' | 'relationships' | 'stateTypes' | 'events' | 'errors'>>, idl: IdlProgram): IdlReport {
  const sourceByName = uniqueByNormalizedName(program.instructions);
  const idlByName = uniqueByNormalizedName(idl.instructions);
  const reconciliations: IdlReconciliation[] = [...sourceByName].sort(([a], [b]) => a.localeCompare(b)).map(([normalized, sourceInstruction]) => ({ status: idlByName.has(normalized) ? 'MATCHED' as const : 'SOURCE_ONLY' as const, item: `instruction:${sourceInstruction.name}` }));
  reconciliations.push(...[...idlByName].filter(([name]) => !sourceByName.has(name)).sort(([a], [b]) => a.localeCompare(b)).map(([, instruction]) => ({ status: 'IDL_ONLY' as const, item: `instruction:${instruction.name}` })));
  for (const sourceInstruction of program.instructions) {
    const idlInstruction = idlByName.get(normalizeName(sourceInstruction.name));
    if (!idlInstruction) continue;
    if (sourceInstruction.discriminator && idlInstruction.discriminator && normalizeType(sourceInstruction.discriminator) !== normalizeType(idlInstruction.discriminator)) reconciliations.push({ status: 'MISMATCH', item: `instruction:${sourceInstruction.name}.discriminator`, details: `source=${sourceInstruction.discriminator}, IDL=${idlInstruction.discriminator}` });
    compareArguments(sourceInstruction.name, sourceInstruction.arguments ?? [], idlInstruction.arguments ?? [], reconciliations);
    const accountIds = program.relationships?.filter(item => item.instructionId === (sourceInstruction.id ?? sourceInstruction.name)).map(item => item.accountId) ?? [];
    const sourceAccounts = accountIds.map(id => (program.accounts ?? []).find(account => account.id === id)).filter((item): item is ProgramUnit['accounts'][number] => !!item);
    if (!sourceAccounts.length && sourceInstruction.contextType) reconciliations.push({ status: 'UNKNOWN', item: `accounts:${sourceInstruction.name}`, details: 'Source context exists but source account fields could not be resolved.' });
    else compareAccounts(sourceInstruction.name, sourceAccounts, idlInstruction.accounts, reconciliations);
  }
  compareNamed('state', (program.stateTypes ?? []).map(item => item.name), (idl.accounts ?? []).map(item => item.name), reconciliations);
  compareNamed('event', (program.events ?? []).map(item => item.name), (idl.events ?? []).map(item => item.name), reconciliations);
  compareNamed('error', (program.errors ?? []).map(item => item.name), (idl.errors ?? []).map(item => item.name), reconciliations);
  const validationDiagnostics = (idl.validationErrors ?? []).map(message => `IDL validation: ${message}`);
  for (const [index, message] of validationDiagnostics.entries()) reconciliations.push({ status: 'MISMATCH', item: `idl.schema:${index}`, details: message });
  const identityDiagnostic = program.identity?.programId && idl.address && program.identity.programId !== idl.address ? `Program ID mismatch: source ${program.identity.programId}, IDL ${idl.address}` : undefined;
  if (identityDiagnostic) reconciliations.push({ status: 'MISMATCH', item: 'programId', details: identityDiagnostic });
  const diagnostics = [...validationDiagnostics, ...(identityDiagnostic ? [identityDiagnostic] : [])];
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
    if (normalizeName(source[index].name) !== normalizeName(idl[index].name)) output.push({ status: 'MISMATCH', item: `instruction:${instruction}.argument:${index}`, details: `source name=${source[index].name}, IDL name=${idl[index].name}` });
    if (source[index].type && idl[index].type && normalizeType(source[index].type) !== normalizeType(idl[index].type)) output.push({ status: 'MISMATCH', item: `instruction:${instruction}.argument:${source[index].name}.type`, details: `source=${source[index].type}, IDL=${idl[index].type}` });
  }
}
function compareAccounts(instruction: string, source: ProgramUnit['accounts'], idl: IdlProgram['instructions'][number]['accounts'], output: IdlReconciliation[]): void {
  if (source.length !== idl.length) output.push({ status: 'MISMATCH', item: `instruction:${instruction}.accounts`, details: `source count=${source.length}, IDL count=${idl.length}` });
  for (let index = 0; index < Math.min(source.length, idl.length); index++) {
    const actual = source[index], expected = idl[index]; const prefix = `instruction:${instruction}.account:${expected.name}`;
    if (normalizeName(actual.name ?? '') !== normalizeName(expected.name)) output.push({ status: 'MISMATCH', item: `${prefix}.order`, details: `source account ${index}=${actual.name}, IDL account ${index}=${expected.name}` });
    for (const [key, sourceValue, idlValue] of [['signer', !!actual.signer, !!expected.signer], ['writable', !!actual.writable, !!expected.writable], ['optional', !!actual.optional, !!expected.optional]] as const) if (sourceValue !== idlValue) output.push({ status: 'MISMATCH', item: `${prefix}.${key}`, details: `source ${key}=${sourceValue}, IDL ${key}=${idlValue}` });
    const sourcePda = !!actual.constraints?.some(item => item.kind === 'seeds'); if (expected.pda !== undefined && sourcePda !== !!expected.pda) output.push({ status: 'MISMATCH', item: `${prefix}.pda`, details: `source PDA=${sourcePda}, IDL PDA=${!!expected.pda}` });
    if (expected.address) {
      if (!actual.addressExpectation) output.push({ status: 'UNKNOWN', item: `${prefix}.address`, details: `IDL address=${expected.address}; source address validation could not be resolved.` });
      else if (normalizeType(actual.addressExpectation) !== normalizeType(expected.address)) output.push({ status: 'MISMATCH', item: `${prefix}.address`, details: `source=${actual.addressExpectation}, IDL=${expected.address}` });
    }
    if (expected.relations?.length) {
      const sourceRelations = actual.relations?.filter(item => item.kind === 'has-one').map(item => normalizeName(item.target)).sort();
      const idlRelations = expected.relations.map(normalizeName).sort();
      if (!sourceRelations) output.push({ status: 'UNKNOWN', item: `${prefix}.relations`, details: `IDL relations=${expected.relations.join(', ')}; source relations could not be resolved.` });
      else if (sourceRelations.join(',') !== idlRelations.join(',')) output.push({ status: 'MISMATCH', item: `${prefix}.relations`, details: `source=${sourceRelations.join(', ') || 'none'}, IDL=${idlRelations.join(', ')}` });
    }
  }
}
function compareNamed(kind: string, source: string[], idl: string[], output: IdlReconciliation[]): void { const sourceSet = new Map(source.map(name => [normalizeName(name), name])), idlSet = new Map(idl.map(name => [normalizeName(name), name])); for (const [key, name] of sourceSet) if (!idlSet.has(key)) output.push({ status: 'SOURCE_ONLY', item: `${kind}:${name}` }); for (const [key, name] of idlSet) if (!sourceSet.has(key)) output.push({ status: 'IDL_ONLY', item: `${kind}:${name}` }); }
function flattenAccounts(items: Record<string, unknown>[], compositePath: string[] = []): IdlInstructionAccount[] { return items.flatMap(item => {
  if (Array.isArray(item.accounts)) { const group = string(item.name); return flattenAccounts(records(item.accounts), group ? [...compositePath, group] : compositePath); }
  return [{ name: string(item.name) ?? 'unknown', signer: item.isSigner === true || item.signer === true, writable: item.isMut === true || item.writable === true, optional: item.optional === true, address: string(item.address), pda: item.pda, relations: strings(item.relations), docs: strings(item.docs), compositePath: compositePath.length ? compositePath : undefined }];
}); }
function records(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object') : []; }
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function string(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
function number(value: unknown): number | undefined { return typeof value === 'number' && Number.isFinite(value) ? value : undefined; }
function strings(value: unknown): string[] | undefined { const result = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; return result.length ? result : undefined; }
function array(value: unknown): unknown[] | undefined { return Array.isArray(value) ? value : undefined; }
function stringRecord(value: unknown): Record<string, string | null> | undefined { const entries = Object.entries(object(value)).filter((entry): entry is [string, string | null] => typeof entry[1] === 'string' || entry[1] === null); return entries.length ? Object.fromEntries(entries) : undefined; }
function normalizeType(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'string') return canonicalPrimitive(value.replace(/\s+/g, ''));
  const type = object(value);
  if ('option' in type) return `Option<${normalizeType(type.option) ?? 'unknown'}>`;
  if ('vec' in type) return `Vec<${normalizeType(type.vec) ?? 'unknown'}>`;
  if (Array.isArray(type.array)) return `[${normalizeType(type.array[0]) ?? 'unknown'};${normalizeArrayLength(type.array[1])}]`;
  if (typeof type.generic === 'string') return type.generic;
  const defined = type.defined;
  if (typeof defined === 'string') return defined.replace(/\s+/g, '');
  const definition = object(defined);
  if (typeof definition.name === 'string') {
    const generics = records(definition.generics).map(item => item.kind === 'type' ? normalizeType(item.type) : string(item.value)).filter((item): item is string => !!item);
    return `${definition.name}${generics.length ? `<${generics.join(',')}>` : ''}`;
  }
  return stableJson(value);
}
function normalizeArrayLength(value: unknown): string { if (typeof value === 'number') return String(value); return string(object(value).generic) ?? stableJson(value); }
function canonicalPrimitive(value: string): string { return value === 'pubkey' ? 'Pubkey' : value; }
function stableJson(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`; return JSON.stringify(value); }
function normalizeName(value: string): string { return value.replace(/[-_]/g, '').toLowerCase(); }
function uniqueByNormalizedName<T extends { name: string }>(items: T[]): Map<string, T> { return new Map(items.map(item => [normalizeName(item.name), item])); }

function validateCurrentSolanaIdl(raw: Record<string, unknown>, normalized: IdlProgram): string[] {
  if (normalized.spec !== '0.1.0') return [];
  const errors: string[] = [];
  const metadata = object(raw.metadata);
  if (!normalized.address) errors.push('v0.1.0 requires address.');
  for (const field of ['name', 'version', 'spec']) if (typeof metadata[field] !== 'string') errors.push(`v0.1.0 requires metadata.${field}.`);
  for (const [index, instruction] of records(raw.instructions).entries()) {
    if (!Array.isArray(instruction.discriminator)) errors.push(`instructions[${index}] requires a byte-array discriminator.`);
    if (!Array.isArray(instruction.accounts)) errors.push(`instructions[${index}] requires accounts.`);
    if (!Array.isArray(instruction.args)) errors.push(`instructions[${index}] requires args.`);
  }
  return errors;
}
