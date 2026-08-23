import { AccountInfo, ArchitectureEdge, ArchitectureNode, CpiSite, Evidence, FileMetric, FunctionMetric, InstructionInfo, PdaSite, ProgramUnit, SecuritySurface, WorkspaceReport, PackageKind, WorkspaceGraph } from '../model/report';
import { parseRust, ParsedRustFile } from '../parser/rustParser';
import { descendants, field, nodeText, RustNode } from '../parser/rustAst';
import { sourceComplexity } from './complexity';
import { detectFramework } from '../discovery/frameworkDetector';
import { enrichAnchor } from '../adapters/anchorAdapter';
import { enrichNative } from '../adapters/nativeAdapter';
import { enrichPinocchio } from '../adapters/pinocchioAdapter';
import { enrichSteel } from '../adapters/steelAdapter';
import { enrichQuasar } from '../adapters/quasarAdapter';
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
  for (const program of list) program.callGraph = buildCallGraph(parsedByPackage.get(program.name) ?? [], program.functions);
  const allSurface = list.map(program => program.securitySurface);
  return {
    schemaVersion: '0.5.0', tool: { name: 'Sealevel Insight', version: '0.5.0' },
    generatedAt: new Date().toISOString(),
    programs: list,
    files,
    diagnostics,
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
  program.frameworkEvidence = dedupeEvidence([...program.frameworkEvidence, ...detectFramework(source, uri), ...enrichPinocchio(source), ...enrichNative(source), ...enrichSteel(source), ...enrichQuasar(source)]);
  const anchor = enrichAnchor(root, uri);
  program.instructions.push(...anchor.instructions);
    program.accounts.push(...anchor.accounts);
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
    const metric: FunctionMetric = { name, location: loc(uri, fn), lines: fn.endPosition.row - fn.startPosition.row + 1, complexity: sourceComplexity(fn), parameters: descendants(fn, 'parameter').length, isPublic: visibility.startsWith('pub'), visibility, isUnsafe: children.some(child => child.type === 'function_modifiers' && child.text.includes('unsafe')) };
    program.functions.push(metric);
    if (fn.text.includes('process_instruction') || fn.text.includes('entrypoint!')) program.instructions.push({ id: `instruction:${uri}:${name}:${metric.location.startLine}`, name, location: metric.location, confidence: 0.8, evidence: [{ description: 'native/custom entrypoint pattern', location: metric.location }], functionName: name });
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
  buildArchitecture(program);
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
    } else uniqueAccounts.set(key, { ...account, id: `account:${program.name}:${key}` });
  }
  program.accounts = [...uniqueAccounts.values()];
  const nodes: ArchitectureNode[] = [{ id: `program:${program.name}`, type: 'program', label: program.name }];
  const edges: ArchitectureEdge[] = [];
  const relationships = program.relationships ?? [];
  for (const instruction of program.instructions) {
    const instructionId = `instruction:${program.name}:${instruction.name}`;
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
    const target = cpi.target ?? 'external-program';
    const targetId = `external:${target}`;
    if (!nodes.some(node => node.id === targetId)) nodes.push({ id: targetId, type: 'external-program', label: target, location: cpi.location });
    const instruction = program.instructions.find(item => item.functionName === cpi.functionName);
    edges.push({ source: instruction ? `instruction:${program.name}:${instruction.name}` : `program:${program.name}`, target: targetId, type: 'cpi' });
  }
  for (const pda of program.securitySurface.pdaSites) {
    const pdaId = pda.id ?? `pda:${pda.location.uri}:${pda.location.startLine}`;
    nodes.push({ id: pdaId, type: 'pda', label: 'PDA', location: pda.location });
    const instruction = program.instructions.find(item => item.name === pda.enclosingInstruction || item.functionName === pda.enclosingFunction);
    edges.push({ source: instruction ? `instruction:${program.name}:${instruction.name}` : `program:${program.name}`, target: pdaId, type: 'derives' });
  }
  program.architecture = { nodes: [...new Map(nodes.map(node => [node.id, node])).values()], edges: [...new Map(edges.map(edge => [`${edge.source}:${edge.target}:${edge.type}`, edge])).values()] };
  program.relationships = [...new Map(relationships.map(item => [`${item.instructionId}:${item.accountId}:${item.relationship}`, item])).values()];
}
