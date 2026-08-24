import { IdlInstructionAccount, IdlProgram, IdlReport, IdlReconciliation, ProgramUnit } from '../model/report';
import * as path from 'node:path';
import { isResolvedDiscriminator } from './discriminator';

export function normalizeIdl(value: unknown, sourceUri?: string): IdlProgram | undefined {
  return normalizeIdls(value, sourceUri)[0];
}

/** Normalize every program in an IDL, including Codama RootNode.additionalPrograms. */
export function normalizeIdls(value: unknown, sourceUri?: string): IdlProgram[] {
  if (!value || typeof value !== 'object') return [];
  const raw = value as Record<string, unknown>;
  const programs = raw.kind === 'rootNode'
    ? [object(raw.program), ...records(raw.additionalPrograms)].filter(item => Object.keys(item).length)
    : [raw];
  return programs.map((programNode, index) => normalizeIdlProgram(programNode, raw, sourceUri, index)).filter((item): item is IdlProgram => !!item);
}

function normalizeIdlProgram(programNode: Record<string, unknown>, raw: Record<string, unknown>, sourceUri: string | undefined, index: number): IdlProgram | undefined {
  const metadata = object(programNode.metadata ?? raw.metadata);
  const instructions = records(programNode.instructions).map(item => ({
    name: nodeName(item), discriminator: normalizeDiscriminator(item.discriminator ?? object(item.discriminant).value) ?? codamaDiscriminator(item, 'arguments'),
    arguments: records(item.args ?? item.arguments).filter(arg => arg.defaultValueStrategy !== 'omitted').map(arg => ({ name: nodeName(arg), type: normalizeType(arg.type), docs: strings(arg.docs) })),
    accounts: flattenAccounts(records(item.accounts)), returns: normalizeType(item.returns ?? item.returnType), docs: strings(item.docs)
  }));
  if (!instructions.length && !('instructions' in programNode)) return undefined;
  const rawAccounts = records(programNode.accounts);
  const accountDefinitions = rawAccounts.map(item => ({ name: nodeName(item), discriminator: normalizeDiscriminator(item.discriminator) ?? codamaDiscriminator(item, 'data') }));
  const explicitTypes = records(programNode.types ?? programNode.definedTypes);
  const legacyAccountTypes = explicitTypes.length ? [] : records(programNode.accounts).filter(item => item.type !== undefined);
  const codamaAccountTypes: Record<string, unknown>[] = programNode.kind === 'programNode' ? rawAccounts.filter(item => item.data !== undefined).map(item => ({ ...item, type: codamaAccountData(item) })) : [];
  const result: IdlProgram = {
    name: string(programNode.name) ?? string(metadata.name), address: string(programNode.address) ?? string(programNode.programId) ?? string(programNode.publicKey),
    version: string(programNode.version ?? raw.version ?? metadata.version), spec: string(programNode.spec ?? raw.spec ?? metadata.spec),
    description: string(metadata.description), repository: string(metadata.repository), contact: string(metadata.contact), deployments: stringRecord(metadata.deployments),
    dependencies: records(metadata.dependencies).map(item => ({ name: string(item.name) ?? 'unknown', version: string(item.version) ?? 'unknown' })), docs: strings(programNode.docs), instructions,
    accounts: accountDefinitions,
    types: dedupeNamed([...explicitTypes, ...legacyAccountTypes, ...codamaAccountTypes].map(item => ({ name: nodeName(item), type: item.type, serialization: item.serialization, repr: item.repr, generics: array(item.generics), docs: strings(item.docs) }))),
    events: records(programNode.events).map(item => ({ name: nodeName(item), discriminator: normalizeDiscriminator(item.discriminator) ?? codamaDiscriminator(item, 'data') })),
    errors: records(programNode.errors).map(item => ({ name: nodeName(item), code: number(item.code), message: string(item.msg ?? item.message) })),
    constants: records(programNode.constants).map(item => ({ name: nodeName(item), type: normalizeType(item.type), value: normalizeValue(item.value), docs: strings(item.docs) })), sourceUri
  };
  result.validationErrors = index === 0 ? validateCurrentSolanaIdl(programNode, result) : [];
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
    compareDiscriminator(`instruction:${sourceInstruction.name}.discriminator`, sourceInstruction.discriminator, idlInstruction.discriminator, reconciliations);
    compareArguments(sourceInstruction.name, sourceInstruction.arguments ?? [], idlInstruction.arguments ?? [], reconciliations);
    const accountIds = program.relationships?.filter(item => item.instructionId === (sourceInstruction.id ?? sourceInstruction.name)).map(item => item.accountId) ?? [];
    const sourceAccounts = accountIds.map(id => (program.accounts ?? []).find(account => account.id === id)).filter((item): item is ProgramUnit['accounts'][number] => !!item);
    if (!sourceAccounts.length && sourceInstruction.contextType) reconciliations.push({ status: 'UNKNOWN', item: `accounts:${sourceInstruction.name}`, details: 'Source context exists but source account fields could not be resolved.' });
    else compareAccounts(sourceInstruction.name, sourceAccounts, idlInstruction.accounts, reconciliations);
  }
  compareNamed('state', (program.stateTypes ?? []).map(item => item.name), (idl.accounts ?? []).map(item => item.name), reconciliations);
  compareNamed('event', (program.events ?? []).map(item => item.name), (idl.events ?? []).map(item => item.name), reconciliations);
  compareNamed('error', (program.errors ?? []).map(item => item.name), (idl.errors ?? []).map(item => item.name), reconciliations);
  compareStateTypes(program.stateTypes ?? [], idl, reconciliations);
  for (const sourceEvent of program.events ?? []) {
    const idlEvent = idl.events?.find(item => normalizeName(item.name) === normalizeName(sourceEvent.name));
    if (idlEvent) compareDiscriminator(`event:${sourceEvent.name}.discriminator`, sourceEvent.discriminator, idlEvent.discriminator, reconciliations);
  }
  for (const sourceError of program.errors ?? []) {
    const idlError = idl.errors?.find(item => normalizeName(item.name) === normalizeName(sourceError.name)); if (!idlError) continue;
    if (sourceError.code !== undefined && idlError.code !== undefined && sourceError.code !== idlError.code) reconciliations.push({ status: 'MISMATCH', item: `error:${sourceError.name}.code`, details: `source=${sourceError.code}, IDL=${idlError.code}` });
    if (sourceError.message && idlError.message && sourceError.message !== idlError.message) reconciliations.push({ status: 'MISMATCH', item: `error:${sourceError.name}.message`, details: `source=${sourceError.message}, IDL=${idlError.message}` });
  }
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
function compareStateTypes(source: NonNullable<ProgramUnit['stateTypes']>, idl: IdlProgram, output: IdlReconciliation[]): void {
  const accountByName = new Map((idl.accounts ?? []).map(item => [normalizeName(item.name), item]));
  const typeByName = new Map((idl.types ?? []).map(item => [normalizeName(item.name), item]));
  for (const state of source) {
    const idlAccount = accountByName.get(normalizeName(state.name));
    if (idlAccount) compareDiscriminator(`state:${state.name}.discriminator`, state.discriminator, idlAccount.discriminator, output);
    const idlType = typeByName.get(normalizeName(state.name)); if (!idlType) continue;
    const fields = typeFields(idlType.type);
    if (!fields) continue;
    const sourceFields = state.fields.filter(item => !item.idlSkip).map(item => ({ ...item, name: item.idlName ?? item.name, type: item.idlType ?? item.type }));
    if (sourceFields.length !== fields.length) output.push({ status: 'MISMATCH', item: `state:${state.name}.fields`, details: `source count=${sourceFields.length}, IDL count=${fields.length}` });
    for (let index = 0; index < Math.min(sourceFields.length, fields.length); index++) {
      const actual = sourceFields[index], expected = fields[index]; const prefix = `state:${state.name}.field:${index}`;
      if (normalizeName(actual.name) !== normalizeName(expected.name)) output.push({ status: 'MISMATCH', item: `${prefix}.name`, details: `source=${actual.name}, IDL=${expected.name}` });
      const sourceType = normalizeType(actual.type), idlFieldType = normalizeType(expected.type);
      if (sourceType && idlFieldType && sourceType !== idlFieldType) output.push({ status: 'MISMATCH', item: `${prefix}.type`, details: `source=${sourceType}, IDL=${idlFieldType}` });
    }
  }
}
function compareDiscriminator(item: string, source: string | undefined, idl: string | undefined, output: IdlReconciliation[]): void {
  if (!source || !idl) return;
  const actual = normalizeDiscriminator(source), expected = normalizeDiscriminator(idl);
  if (actual === expected) return;
  output.push(isResolvedDiscriminator(actual) ? { status: 'MISMATCH', item, details: `source=${actual}, IDL=${expected}` } : { status: 'UNKNOWN', item, details: `source expression ${source} could not be evaluated locally; IDL=${expected}` });
}
function compareNamed(kind: string, source: string[], idl: string[], output: IdlReconciliation[]): void { const sourceSet = new Map(source.map(name => [normalizeName(name), name])), idlSet = new Map(idl.map(name => [normalizeName(name), name])); for (const [key, name] of sourceSet) if (!idlSet.has(key)) output.push({ status: 'SOURCE_ONLY', item: `${kind}:${name}` }); for (const [key, name] of idlSet) if (!sourceSet.has(key)) output.push({ status: 'IDL_ONLY', item: `${kind}:${name}` }); }
function flattenAccounts(items: Record<string, unknown>[], compositePath: string[] = []): IdlInstructionAccount[] { return items.flatMap(item => {
  if (Array.isArray(item.accounts)) { const group = string(item.name); return flattenAccounts(records(item.accounts), group ? [...compositePath, group] : compositePath); }
  const defaultValue = object(item.defaultValue);
  const resolver = object(item.resolver);
  return [{ name: nodeName(item), signer: item.isSigner === true || item.signer === true, writable: item.isMut === true || item.isWritable === true || item.writable === true, optional: item.isOptional === true || item.optional === true, address: string(item.address) ?? (defaultValue.kind === 'publicKeyValueNode' ? string(defaultValue.publicKey) : undefined) ?? (resolver.kind === 'const' ? string(resolver.address) : undefined), pda: item.pda ?? (defaultValue.kind === 'pdaValueNode' ? defaultValue : undefined) ?? (resolver.kind === 'pda' ? resolver : undefined), relations: strings(item.relations), docs: strings(item.docs), compositePath: compositePath.length ? compositePath : undefined }];
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
  const kind = string(type.kind);
  if (kind === 'numberTypeNode') return string(type.format);
  if (kind === 'publicKeyTypeNode') return 'Pubkey';
  if (kind === 'booleanTypeNode') return 'bool';
  if (kind === 'bytesTypeNode') return 'bytes';
  if (kind === 'stringTypeNode') return 'String';
  if (kind === 'definedTypeLinkNode') return string(type.name)?.replace(/\s+/g, '');
  if (kind === 'optionTypeNode') return `Option<${normalizeType(type.item) ?? 'unknown'}>`;
  if (kind === 'fixedSizeTypeNode' || kind === 'sizePrefixTypeNode') return normalizeType(type.type);
  if (kind === 'arrayTypeNode') {
    const count = object(type.count); const fixed = count.kind === 'fixedCountNode' ? number(count.value) : undefined;
    return fixed !== undefined ? `[${normalizeType(type.item) ?? 'unknown'};${fixed}]` : `Vec<${normalizeType(type.item) ?? 'unknown'}>`;
  }
  if (kind === 'tupleTypeNode') return `(${records(type.items ?? type.children).map(item => normalizeType(item) ?? 'unknown').join(',')})`;
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

function normalizeDiscriminator(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value) && value.every(item => typeof item === 'number')) return `[${value.join(',')}]`;
  const normalized = normalizeType(value);
  return normalized?.replace(/\s+/g, '');
}
function codamaDiscriminator(item: Record<string, unknown>, container: 'arguments' | 'data'): string | undefined {
  const discriminator = records(item.discriminators).find(candidate => candidate.kind === 'fieldDiscriminatorNode' && number(candidate.offset) === 0);
  if (!discriminator) return undefined;
  const fields = container === 'arguments' ? records(item.arguments) : records(object(item.data).fields);
  const field = fields.find(candidate => string(candidate.name) === string(discriminator.name));
  return normalizeCodamaValue(field?.defaultValue);
}
function normalizeCodamaValue(value: unknown): string | undefined {
  const node = object(value);
  if (node.kind === 'numberValueNode' && number(node.number) !== undefined) return String(number(node.number));
  if (node.kind === 'bytesValueNode' && node.encoding === 'base16' && typeof node.data === 'string' && /^[0-9a-f]*$/i.test(node.data) && node.data.length % 2 === 0) {
    return `[${[...Buffer.from(node.data, 'hex')].join(',')}]`;
  }
  if (node.kind === 'bytesValueNode' && Array.isArray(node.data)) return normalizeDiscriminator(node.data);
  return undefined;
}
function codamaAccountData(item: Record<string, unknown>): unknown {
  const data = object(item.data); if (data.kind !== 'structTypeNode') return item.data;
  return { ...data, fields: records(data.fields).filter(field => field.defaultValueStrategy !== 'omitted') };
}
function typeFields(value: unknown): Array<{ name: string; type: unknown }> | undefined {
  const type = object(value); if (type.kind !== 'struct' && type.kind !== 'structTypeNode') return undefined;
  return records(type.fields).filter(field => field.defaultValueStrategy !== 'omitted').map(field => ({ name: nodeName(field), type: field.type }));
}
function nodeName(item: Record<string, unknown>): string { return string(item.name) ?? string(item.idlName) ?? 'unknown'; }
function normalizeValue(value: unknown): string | undefined { return typeof value === 'string' ? value : normalizeCodamaValue(value) ?? (value === undefined ? undefined : stableJson(value)); }
function dedupeNamed<T extends { name: string }>(items: T[]): T[] { return [...new Map(items.map(item => [normalizeName(item.name), item])).values()]; }

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
