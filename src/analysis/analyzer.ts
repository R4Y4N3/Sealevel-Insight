import { AccountInfo, ArchitectureEdge, ArchitectureNode, Evidence, FileMetric, FunctionMetric, ProgramUnit, SecuritySurface, WorkspaceReport, PackageKind, WorkspaceGraph } from '../model/report';
import { parseRust, ParsedRustFile } from '../parser/rustParser';
import { descendants, field, nodeText, RustNode } from '../parser/rustAst';
import { sourceComplexity } from './complexity';
import { detectFramework } from '../discovery/frameworkDetector';
import { enrichAnchor } from '../adapters/anchorAdapter';
import { enrichNative } from '../adapters/nativeAdapter';
import { enrichPinocchio } from '../adapters/pinocchioAdapter';
import { enrichSteel } from '../adapters/steelAdapter';
import { enrichQuasar } from '../adapters/quasarAdapter';
import { enrichSteelSemantics } from '../adapters/steelAdapter';
import { enrichQuasarSemantics } from '../adapters/quasarAdapter';
import { countLines } from '../utils/text';
import { buildCallGraph } from './callGraph';

export interface RustSourceInput { uri: string; source: string; packageName?: string; manifestUri?: string; packageKind?: PackageKind; packageEvidence?: Evidence[]; workspaceGraph?: WorkspaceGraph; }

export async function analyzeSources(inputs: RustSourceInput[], wasmPath: string, runtimeWasmPath?: string): Promise<WorkspaceReport> {
  const parsed = await Promise.all(inputs.map(input => parseRust(input.uri, input.source, wasmPath, runtimeWasmPath)));
  const diagnostics = parsed.filter(file => file.error).map(file => `${file.uri}: ${file.error}`);
  const programs = new Map<string, ProgramUnit>();
  const parsedByPackage = new Map<string, Array<{ uri: string; root: RustNode }>>();
  const files: FileMetric[] = [];
  parsed.forEach((file, index) => {
    const input = inputs[index];
    const metric = fileMetric(file);
    files.push(metric);
    const name = input.packageName ?? packageFromUri(input.uri);
    const program = programs.get(name) ?? emptyProgram(name, input.manifestUri, input.packageKind, input.packageEvidence);
    program.rustFiles.push(metric);
    if (file.tree) extract(file, program);
    if (file.tree) parsedByPackage.set(name, [...(parsedByPackage.get(name) ?? []), { uri: file.uri, root: file.tree.rootNode }]);
    programs.set(name, program);
  });
  const list = [...programs.values()];
  for (const program of list) {
    program.callGraph = buildCallGraph(parsedByPackage.get(program.name) ?? [], program.functions);
    buildArchitecture(program);
    buildExternalPrograms(program);
    propagateReachableSurface(program);
    program.reviewHotspots = reviewHotspotsFor(program);
  }
  const allSurface = list.map(program => program.securitySurface);
  const reviewProfile = list.flatMap(program => program.reviewHotspots ?? []).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return {
    schemaVersion: '0.5.0', tool: { name: 'Sealevel Insight', version: '0.5.0' },
    generatedAt: new Date().toISOString(),
    programs: list,
    files,
    diagnostics,
    reviewProfile,
    workspaceGraph: inputs.find(input => input.workspaceGraph)?.workspaceGraph,
    coverage: coverageFor(list, files),
    summary: {
      rustFiles: files.length, loc: sum(files, 'lines'), codeLoc: sum(files, 'codeLines'), blankLines: sum(files, 'blankLines'), commentLines: sum(files, 'commentLines'),
      functions: list.reduce((n, p) => n + p.functions.length, 0), instructions: list.reduce((n, p) => n + p.instructions.length, 0), accounts: list.reduce((n, p) => n + p.accounts.length, 0),
      signerSignals: sumSurface(allSurface, 'signerSignals'), writableSignals: sumSurface(allSurface, 'writableSignals'), rawOrUncheckedAccounts: sumSurface(allSurface, 'rawOrUncheckedAccounts'),
      pdas: sumSurface(allSurface, 'pdaSites', true), cpis: sumSurface(allSurface, 'cpiSites', true), pdaSignedCpis: allSurface.reduce((n, s) => n + s.cpiSites.filter(cpi => cpi.pdaSigned).length, 0), unsafeBlocks: sumSurface(allSurface, 'unsafeBlocks')
    }
  };
}

function extract(file: ParsedRustFile, program: ProgramUnit): void {
  const root = file.tree!.rootNode;
  const source = file.source;
  const uri = file.uri;
  for (const match of source.matchAll(/declare_id!\s*\(\s*"([^"]+)"\s*\)/g)) {
    const location = offsetLocation(uri, source, match.index, match.index + match[0].length);
    const evidence = { description: `declare_id! program address ${match[1]}`, location };
    program.identity ??= { programId: match[1], sources: [], conflicts: [] };
    if (program.identity.programId && program.identity.programId !== match[1]) program.identity.conflicts.push(evidence);
    else { program.identity.programId = match[1]; program.identity.sources.push(evidence); }
  }
  program.frameworkEvidence = dedupeEvidence([...program.frameworkEvidence, ...detectFramework(source, uri), ...enrichPinocchio(source), ...enrichNative(source), ...enrichSteel(source), ...enrichQuasar(source)]);
  const anchor = enrichAnchor(root, uri);
  program.instructions.push(...anchor.instructions);
    program.accounts.push(...anchor.accounts);
  const steel = enrichSteelSemantics(root, uri);
  const quasar = enrichQuasarSemantics(root, uri);
  program.instructions.push(...steel.instructions, ...quasar.instructions);
  program.accounts.push(...steel.accounts, ...quasar.accounts);
    for (const account of anchor.accounts) {
      const seeds = account.constraints?.filter(constraint => constraint.kind === 'seeds').map(constraint => constraint.expression ?? '');
      if (seeds?.length) program.securitySurface.pdaSites.push({ id: `pda:${account.id}`, location: account.location, seeds, bump: account.constraints?.find(constraint => constraint.kind === 'bump')?.expression, enclosingInstruction: anchor.instructions.find(instruction => instruction.contextType === account.contextType)?.name, evidence: [{ description: 'Anchor account seeds constraint', location: account.location }], confidence: 0.95 });
      if (account.signer) program.securitySurface.signerSignals++;
      if (account.writable) program.securitySurface.writableSignals++;
      if (account.unchecked) program.securitySurface.rawOrUncheckedAccounts++;
    }
  const anchorContexts = new Map(anchor.instructions.map(instruction => [instruction.contextType, instruction]));
  for (const fn of descendants(root, 'function_item')) {
    const name = nodeText(field(fn, 'name'));
    const children = fn.children.filter((child): child is RustNode => child !== null);
    const visibility = children.find(child => child.type === 'visibility_modifier')?.text ?? 'private';
    const metric: FunctionMetric = { name, qualifiedName: `${program.name}::${name}`, location: loc(uri, fn), lines: fn.endPosition.row - fn.startPosition.row + 1, complexity: sourceComplexity(fn), parameters: descendants(fn, 'parameter').length, isPublic: visibility.startsWith('pub'), visibility, isUnsafe: children.some(child => child.type === 'function_modifiers' && child.text.includes('unsafe')) };
    program.functions.push(metric);
    if (fn.text.includes('process_instruction') || fn.text.includes('entrypoint!')) program.instructions.push({ id: `instruction:${uri}:${name}:${metric.location.startLine}`, name, handler: name, location: metric.location, confidence: 0.8, evidence: [{ description: 'native/custom entrypoint pattern', location: metric.location }], functionName: name });
    extractNativeParameters(fn, metric, program);
    extractSites(fn, metric, program, source, uri);
    if (metric.isUnsafe) program.securitySurface.unsafeFunctions++;
    const context = contextTypeFromFunction(fn.text);
    const instruction = anchorContexts.get(context);
    if (instruction && instruction.contextType) {
      instruction.contextType = context;
      for (const account of anchor.accounts.filter(account => account.contextType === context)) {
        program.relationships ??= [];
        program.relationships.push({ instructionId: instruction.id ?? instruction.name, accountId: account.id ?? account.name ?? account.type, relationship: account.signer ? 'signer' : account.writable ? 'writes' : account.unchecked ? 'unchecked' : 'reads' });
      }
    }
  }
  for (const type of ['AccountInfo', 'AccountView', 'Signer', 'UncheckedAccount', 'Account<', 'InterfaceAccount', 'Program<', 'SystemAccount']) {
    for (const index of indexesOf(source, type)) program.accounts.push({ id: `${uri}:account:${index}`, type, location: offsetLocation(uri, source, index, index + type.length), confidence: 0.7, evidence: [{ description: 'account-related type usage' }] });
  }
  program.securitySurface.unsafeBlocks += descendants(root, 'unsafe_block').length;
  program.securitySurface.manualSerialization += (source.match(/try_from_slice|serialize|deserialize|borsh/g) ?? []).length;
  program.securitySurface.cpiSites = [...new Map(program.securitySurface.cpiSites.map(site => [site.id, site])).values()];
  program.securitySurface.pdaSites = [...new Map(program.securitySurface.pdaSites.map(site => [site.id, site])).values()];
}

function extractSites(fn: RustNode, metric: FunctionMetric, program: ProgramUnit, source: string, uri: string): void {
  const surface = program.securitySurface;
  const text = fn.text;
  const calls = descendants(fn, 'call_expression');
  const addPda = (node: RustNode, evidence: string, confidence: number) => surface.pdaSites.push({ id: `${uri}:pda:${node.startPosition.row + 1}:${node.startPosition.column}`, location: loc(uri, node), enclosingFunction: metric.name, seeds: node.childForFieldName('arguments')?.text ? [node.childForFieldName('arguments')!.text] : undefined, evidence: [{ description: evidence, location: loc(uri, node) }], confidence });
  const addCpi = (node: RustNode, api: string, signed: boolean, target?: string) => surface.cpiSites.push({ id: `${uri}:cpi:${node.startPosition.row + 1}:${node.startPosition.column}`, location: loc(uri, node), functionName: metric.name, invocationApi: api, target, targetKind: target ? targetKind(target) : 'unknown', evidence: [{ description: `AST call to ${api}`, location: loc(uri, node) }], pdaSigned: signed, confidence: 0.9 });
  for (const call of calls) {
    const api = call.childForFieldName('function')?.text ?? '';
    if (/find_program_address|create_program_address(?:_const)?/.test(api)) addPda(call, 'PDA derivation call', 0.95);
    if (/invoke_signed|new_with_signer/.test(api)) addCpi(call, api, true);
    else if (/^(?:.*::)?invoke$|CpiContext::new$|cpi::invoke$/.test(api)) addCpi(call, api, false);
    else if (/(transfer|mint_to|burn|close_account|system_instruction)::/.test(api)) addCpi(call, api, false, api);
  }
  if (/seeds\s*=|signer_seeds/.test(fn.text)) surface.pdaSites.push({ id: `${uri}:pda:attribute:${metric.location.startLine}`, location: metric.location, enclosingFunction: metric.name, evidence: [{ description: 'Anchor or signer seed expression', location: metric.location }], confidence: 0.8 });
  const occurrence = (pattern: RegExp) => (text.match(pattern) ?? []).length;
  surface.signerSignals += occurrence(/is_signer/g);
  surface.writableSignals += occurrence(/is_writable/g);
  surface.ownerValidationSignals += occurrence(/\.owner\(|owner\s*==/g);
  surface.addressValidationSignals += occurrence(/address\s*=|key\(\)\s*==/g);
  surface.remainingAccounts += occurrence(/remaining_accounts/g);
  surface.rawOrUncheckedAccounts += occurrence(/UncheckedAccount|AccountInfo|AccountView/g);
  surface.manualAccountIteration += occurrence(/accounts\.iter|next_account_info|remaining_accounts\.iter/g);
  surface.manualSignerChecks += occurrence(/is_signer/g);
  surface.manualOwnerChecks += occurrence(/\.owner\(|owner\s*==/g);
  surface.manualWritableChecks += occurrence(/is_writable/g);
  surface.manualAddressChecks += occurrence(/key\(\)\s*==|address\s*==/g);
  surface.reallocOperations += occurrence(/realloc|resize/g);
  void source;
}

function targetKind(target: string): 'system-program' | 'spl-token' | 'token-2022' | 'associated-token' | 'custom' | 'dynamic' | 'unknown' {
  if (/system/i.test(target)) return 'system-program';
  if (/token_2022|token2022/i.test(target)) return 'token-2022';
  if (/token/i.test(target)) return 'spl-token';
  if (/associated/i.test(target)) return 'associated-token';
  return 'custom';
}

function extractNativeParameters(fn: RustNode, metric: FunctionMetric, program: ProgramUnit): void {
  if (!/process_instruction|entrypoint|AccountInfo|AccountView/.test(fn.text)) return;
  for (const parameter of descendants(fn, 'parameter')) {
    const type = parameter.childForFieldName('type')?.text ?? '';
    const name = parameter.children.find(child => child?.type === 'identifier')?.text ?? '';
    if (!/AccountInfo|AccountView/.test(type) || !name) continue;
    const account: AccountInfo = { id: `account:${metric.location.uri}:parameter:${name}:${metric.location.startLine}`, name, type, location: loc(metric.location.uri, parameter), confidence: 0.8, evidence: [{ description: 'native account parameter', location: loc(metric.location.uri, parameter) }] };
    program.accounts.push(account);
    const instruction = program.instructions.find(item => item.functionName === metric.name);
    if (instruction) { program.relationships ??= []; program.relationships.push({ instructionId: instruction.id ?? instruction.name, accountId: account.id!, relationship: 'unknown' }); }
  }
}

function propagateReachableSurface(program: ProgramUnit): void {
  const graph = program.callGraph;
  if (!graph) return;
  const byName = new Map(program.functions.map(fn => [fn.qualifiedName ?? fn.name, fn]));
  const qualifiedByShortName = new Map(program.functions.map(fn => [fn.name, fn.qualifiedName ?? fn.name]));
  const edges = new Map<string, string[]>();
  for (const edge of graph.edges) edges.set(edge.source, [...(edges.get(edge.source) ?? []), edge.target]);
  for (const instruction of program.instructions) {
    const handler = qualifiedByShortName.get(instruction.handler ?? instruction.functionName ?? instruction.name) ?? instruction.handler ?? instruction.functionName ?? instruction.name;
    const functions = new Set<string>();
    const queue = [handler];
    while (queue.length) {
      const current = queue.shift()!;
      if (functions.has(current)) continue;
      functions.add(current);
      queue.push(...(edges.get(current) ?? []).filter(next => !functions.has(next)));
    }
    const sites = [...functions].map(name => byName.get(name)).filter((fn): fn is FunctionMetric => !!fn);
    const reachableCpiSites = program.securitySurface.cpiSites.filter(site => sites.some(fn => fn.name === site.functionName));
    const cpis = reachableCpiSites.map(site => site.id ?? '');
    const pdas = program.securitySurface.pdaSites.filter(site => sites.some(fn => fn.name === site.enclosingFunction)).map(site => site.id ?? '');
    const accountIds = program.relationships?.filter(rel => rel.instructionId === (instruction.id ?? instruction.name)).map(rel => rel.accountId) ?? [];
    const externalPrograms = reachableCpiSites.map(site => `external:${site.target ?? site.invocationApi ?? 'unknown'}`);
    for (const external of program.externalPrograms ?? []) if (externalPrograms.includes(external.id)) external.calledByInstructions = [...new Set([...external.calledByInstructions, instruction.id ?? instruction.name])].sort();
    instruction.reachableSurface = { functions: [...functions].sort(), accounts: [...new Set(accountIds)].sort(), cpis: [...new Set(cpis)].sort(), pdas: [...new Set(pdas)].sort(), externalPrograms: [...new Set(externalPrograms)].sort() };
    for (const fn of sites) { fn.reachableFunctions = [...functions].sort(); fn.cpiCount = cpis.length; fn.pdaCount = pdas.length; }
  }
}

function emptyProgram(name: string, manifestUri?: string, packageKind: PackageKind = 'unknown', packageEvidence: Evidence[] = []): ProgramUnit {
  return { name, manifestUri, packageKind, packageEvidence, rustFiles: [], functions: [], instructions: [], accounts: [], frameworkEvidence: [], securitySurface: { signerSignals: 0, writableSignals: 0, ownerValidationSignals: 0, addressValidationSignals: 0, remainingAccounts: 0, rawOrUncheckedAccounts: 0, manualAccountIteration: 0, unsafeBlocks: 0, manualSignerChecks: 0, manualOwnerChecks: 0, manualWritableChecks: 0, manualAddressChecks: 0, manualSerialization: 0, reallocOperations: 0, unsafeFunctions: 0, cpiSites: [], pdaSites: [] }, relationships: [], architecture: { nodes: [], edges: [] } };
}

function fileMetric(file: ParsedRustFile): FileMetric {
  const counts = countLines(file.source);
  const root = file.tree?.rootNode;
  return { uri: file.uri, ...counts, functions: root ? descendants(root, 'function_item').length : 0, structs: root ? descendants(root, 'struct_item').length : 0, enums: root ? descendants(root, 'enum_item').length : 0, traits: root ? descendants(root, 'trait_item').length : 0, implBlocks: root ? descendants(root, 'impl_item').length : 0, unsafeBlocks: root ? descendants(root, 'unsafe_block').length : 0, macroInvocations: root ? descendants(root, 'macro_invocation').length : 0, parseError: file.error };
}

function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
function offsetLocation(uri: string, source: string, start: number, end: number) { const before = source.slice(0, start).split(/\r?\n/); const endLines = source.slice(0, end).split(/\r?\n/); return { uri, startLine: before.length, startColumn: before.at(-1)!.length, endLine: endLines.length, endColumn: endLines.at(-1)!.length }; }
function indexesOf(source: string, value: string): number[] { const result: number[] = []; let index = source.indexOf(value); while (index >= 0) { result.push(index); index = source.indexOf(value, index + value.length); } return result; }
function packageFromUri(uri: string): string { return uri.split('/').slice(-2, -1)[0] || 'workspace'; }
function contextTypeFromFunction(source: string): string | undefined {
  const match = /Context\s*<([^>]*)/.exec(source);
  return match?.[1].split(',').map(part => part.trim().replace(/<.*$/, '')).reverse().find(part => /^[A-Z][A-Za-z0-9_]*$/.test(part));
}
function sum(files: FileMetric[], key: 'lines' | 'codeLines' | 'blankLines' | 'commentLines'): number { return files.reduce((total, file) => total + file[key], 0); }
function sumSurface(surfaces: SecuritySurface[], key: keyof SecuritySurface, array = false): number { return surfaces.reduce((total, surface) => total + (array ? (surface[key] as unknown[]).length : surface[key] as number), 0); }

function coverageFor(programs: ProgramUnit[], files: FileMetric[]) {
  const totalInstructions = programs.reduce((sum, program) => sum + program.instructions.length, 0);
  const totalCpis = programs.reduce((sum, program) => sum + program.securitySurface.cpiSites.length, 0);
  const totalPdas = programs.reduce((sum, program) => sum + program.securitySurface.pdaSites.length, 0);
  const ratio = (resolved: number, total: number) => ({ resolved, total, percent: total ? resolved / total : 1 });
  return { parsedFiles: ratio(files.filter(file => !file.parseError).length, files.length), instructionContexts: ratio(programs.reduce((sum, program) => sum + program.instructions.filter(instruction => !!instruction.contextType).length, 0), totalInstructions), cpiTargets: ratio(programs.reduce((sum, program) => sum + program.securitySurface.cpiSites.filter(site => !!site.target).length, 0), totalCpis), pdaSeeds: ratio(programs.reduce((sum, program) => sum + program.securitySurface.pdaSites.filter(site => !!site.seeds?.length).length, 0), totalPdas) };
}

function dedupeEvidence(items: import('../model/report').FrameworkEvidence[]): import('../model/report').FrameworkEvidence[] {
  const byFramework = new Map<string, import('../model/report').FrameworkEvidence>();
  for (const item of items) {
    const existing = byFramework.get(item.framework);
    if (!existing) byFramework.set(item.framework, { ...item, evidence: [...item.evidence] });
    else {
      existing.confidence = Math.max(existing.confidence, item.confidence);
      const known = new Set(existing.evidence.map(evidence => evidence.description));
      existing.evidence.push(...item.evidence.filter(evidence => !known.has(evidence.description)));
    }
  }
  return [...byFramework.values()];
}

function buildArchitecture(program: ProgramUnit): void {
  const uniqueAccounts = new Map<string, AccountInfo>();
  for (const account of program.accounts) {
    const key = `${account.location.uri}:${account.location.startLine}:${account.type}`;
    const existing = uniqueAccounts.get(key);
    if (existing) {
      existing.signer ||= account.signer;
      existing.writable ||= account.writable;
      existing.unchecked ||= account.unchecked;
      existing.constraints = [...(existing.constraints ?? []), ...(account.constraints ?? [])];
    } else uniqueAccounts.set(key, { ...account, id: account.id ?? `account:${program.name}:${key}` });
  }
  program.accounts = [...uniqueAccounts.values()];
  const nodes: ArchitectureNode[] = [{ id: `program:${program.name}`, type: 'program', label: program.name }];
  const edges: ArchitectureEdge[] = [];
  const relationships = program.relationships ?? [];
  for (const instruction of program.instructions) {
    const instructionId = architectureInstructionId(program, instruction);
    nodes.push({ id: instructionId, type: 'instruction', label: instruction.name, location: instruction.location });
    edges.push({ source: `program:${program.name}`, target: instructionId, type: 'uses' });
    if (instruction.contextType) {
      const contextId = `context:${program.name}:${instruction.contextType}`;
      nodes.push({ id: contextId, type: 'function', label: instruction.contextType, location: instruction.location });
      edges.push({ source: instructionId, target: contextId, type: 'uses' });
    }
    for (const relationship of relationships.filter(item => item.instructionId === (instruction.id ?? instruction.name))) {
      const account = program.accounts.find(item => item.id === relationship.accountId);
      if (!account) continue;
      const accountId = account.id ?? relationship.accountId;
      nodes.push({ id: accountId, type: 'account', label: account.name ?? account.type, location: account.location });
      edges.push({ source: instructionId, target: accountId, type: relationship.relationship === 'signer' ? 'signs' : relationship.relationship === 'writes' ? 'writes' : relationship.relationship === 'reads' ? 'reads' : 'uses' });
    }
  }
  for (const cpi of program.securitySurface.cpiSites) {
    const target = cpi.target ?? cpi.invocationApi ?? 'unknown';
    const targetId = `external:${target}`;
    if (!nodes.some(node => node.id === targetId)) nodes.push({ id: targetId, type: 'external-program', label: target, location: cpi.location });
    const instruction = program.instructions.find(item => item.functionName === cpi.functionName);
    edges.push({ source: instruction ? architectureInstructionId(program, instruction) : `program:${program.name}`, target: targetId, type: 'cpi' });
  }
  for (const pda of program.securitySurface.pdaSites) {
    const pdaId = pda.id ?? `pda:${pda.location.uri}:${pda.location.startLine}`;
    nodes.push({ id: pdaId, type: 'pda', label: 'PDA', location: pda.location });
    const instruction = program.instructions.find(item => item.name === pda.enclosingInstruction || item.functionName === pda.enclosingFunction);
    edges.push({ source: instruction ? architectureInstructionId(program, instruction) : `program:${program.name}`, target: pdaId, type: 'derives' });
  }
  program.architecture = { nodes: [...new Map(nodes.map(node => [node.id, node])).values()], edges: [...new Map(edges.map(edge => [`${edge.source}:${edge.target}:${edge.type}`, edge])).values()] };
  program.relationships = [...new Map(relationships.map(item => [`${item.instructionId}:${item.accountId}:${item.relationship}`, item])).values()];
}

function architectureInstructionId(program: ProgramUnit, instruction: ProgramUnit['instructions'][number]): string {
  return instruction.id ?? `instruction:${program.name}:${instruction.name}:${instruction.location.uri}:${instruction.location.startLine}`;
}

function buildExternalPrograms(program: ProgramUnit): void {
  const grouped = new Map<string, NonNullable<ProgramUnit['externalPrograms']>[number]>();
  for (const cpi of program.securitySurface.cpiSites) {
    const name = cpi.target ?? cpi.invocationApi ?? 'unknown';
    const id = `external:${name}`;
    const instruction = program.instructions.find(item => item.functionName === cpi.functionName || item.handler === cpi.functionName);
    const instructionId = instruction?.id ?? instruction?.name;
    const existing = grouped.get(id) ?? { id, name, kind: cpi.targetKind ?? 'unknown', locations: [], calledByInstructions: [], cpiCount: 0, signedCpiCount: 0, confidence: cpi.confidence, evidence: [] };
    existing.locations.push(cpi.location);
    if (instructionId) existing.calledByInstructions.push(instructionId);
    existing.cpiCount++;
    if (cpi.pdaSigned) existing.signedCpiCount++;
    existing.confidence = Math.max(existing.confidence, cpi.confidence);
    existing.evidence.push(...cpi.evidence);
    grouped.set(id, existing);
  }
  program.externalPrograms = [...grouped.values()].map(item => ({ ...item, locations: [...new Map(item.locations.map(location => [`${location.uri}:${location.startLine}:${location.startColumn}`, location])).values()], calledByInstructions: [...new Set(item.calledByInstructions)].sort(), evidence: [...new Map(item.evidence.map(evidence => [`${evidence.description}:${evidence.location?.uri ?? ''}:${evidence.location?.startLine ?? ''}`, evidence])).values()] }));
}

function reviewHotspotsFor(program: ProgramUnit): NonNullable<ProgramUnit['reviewHotspots']> {
  const hotspots: NonNullable<ProgramUnit['reviewHotspots']> = [];
  for (const fn of program.functions) {
    const reasons: string[] = [];
    if (fn.complexity >= 10) reasons.push(`cyclomatic complexity ${fn.complexity}`);
    if (fn.isUnsafe) reasons.push('unsafe function');
    const cpis = program.securitySurface.cpiSites.filter(site => site.functionName === fn.name).length;
    const pdas = program.securitySurface.pdaSites.filter(site => site.enclosingFunction === fn.name).length;
    if (cpis >= 2) reasons.push(`${cpis} CPI sites`);
    if (pdas >= 2) reasons.push(`${pdas} PDA derivations`);
    if (reasons.length) hotspots.push({ id: `hotspot:function:${fn.qualifiedName ?? fn.name}:${fn.location.uri}:${fn.location.startLine}`, label: fn.name, score: fn.complexity + cpis * 3 + pdas * 2 + (fn.isUnsafe ? 8 : 0), reasons, location: fn.location });
  }
  for (const account of program.accounts.filter(item => item.unchecked || /AccountInfo|AccountView/.test(item.type))) {
    hotspots.push({ id: `hotspot:account:${account.id ?? `${account.location.uri}:${account.location.startLine}`}`, label: account.name ?? account.type, score: 6 + (account.writable ? 3 : 0) + (account.signer ? 2 : 0), reasons: [account.unchecked ? 'unchecked account type' : 'raw account type', ...(account.writable ? ['writable account signal'] : []), ...(account.signer ? ['signer account signal'] : [])], location: account.location });
  }
  return [...new Map(hotspots.map(item => [item.id, item])).values()].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
