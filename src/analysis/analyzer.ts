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
import { countLines, splitRustExpressions } from '../utils/text';
import { buildCallGraph } from './callGraph';
import { buildRustSymbolIndex, RustSymbolIndex } from './symbolIndex';
import { enrichUnifiedSemantics } from './semanticModel';
import { applyReviewComplexity } from './reviewComplexity';
import { buildCapabilities } from './capabilities';
import { validateReport } from './invariants';
import { enrichNativeAccountSemantics } from './accountSemantics';
import { enrichMetadataFrameworks } from '../adapters/metadataAdapter';
import { mapConcurrent } from '../utils/concurrency';

export interface RustSourceInput { uri: string; source: string; packageName?: string; packageId?: string; packageRoot?: string; manifestUri?: string; packageKind?: PackageKind; packageEvidence?: Evidence[]; workspaceGraph?: WorkspaceGraph; }
export class AnalysisCancelledError extends Error { constructor() { super('Analysis cancelled.'); this.name = 'AnalysisCancelledError'; } }

export async function analyzeSources(inputs: RustSourceInput[], wasmPath: string, runtimeWasmPath?: string, isCancelled: () => boolean = () => false): Promise<WorkspaceReport> {
  const parsed = await mapConcurrent(inputs, 8, input => { if (isCancelled()) throw new AnalysisCancelledError(); return parseRust(input.uri, input.source, wasmPath, runtimeWasmPath); });
  if (isCancelled()) throw new AnalysisCancelledError();
  const workspaceGraph = inputs.find(input => input.workspaceGraph)?.workspaceGraph;
  const analysisDiagnostics = [
    ...parsed.filter(file => file.error).map((file, index) => ({ id: `diagnostic:parse:${index}`, severity: 'error' as const, category: 'parse' as const, message: file.error!, location: { uri: file.uri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } })),
    ...(workspaceGraph?.diagnostics ?? [])
  ];
  const diagnostics = analysisDiagnostics.map(item => `${item.location?.uri ? `${item.location.uri}: ` : ''}${item.message}`);
  const programs = new Map<string, ProgramUnit>();
  const parsedByPackage = new Map<string, Array<{ uri: string; root: RustNode; packageName: string; packageRoot?: string }>>();
  const files: FileMetric[] = [];
  parsed.forEach((file, index) => {
    const input = inputs[index];
    const metric = fileMetric(file);
    files.push(metric);
    const name = input.packageName ?? packageFromUri(input.uri);
    const cargoPackage = workspaceGraph?.packages.find(pkg => pkg.id === input.packageId || pkg.name === name);
    const program = programs.get(name) ?? emptyProgram(name, input.manifestUri, input.packageKind, input.packageEvidence);
    if (cargoPackage) { program.rootUri = cargoPackage.rootUri; program.packageId = cargoPackage.id; program.packageConfidence = cargoPackage.confidence; program.packageDependencies = cargoPackage.dependencies; }
    program.rustFiles.push(metric);
    if (file.tree) extract(file, program);
    if (file.tree) parsedByPackage.set(name, [...(parsedByPackage.get(name) ?? []), { uri: file.uri, root: file.tree.rootNode, packageName: name, packageRoot: input.packageRoot ?? cargoPackage?.rootUri }]);
    programs.set(name, program);
  });
  const list = [...programs.values()];
  const symbolIndexes = new Map<string, RustSymbolIndex>();
  for (const program of list) {
    if (isCancelled()) throw new AnalysisCancelledError();
    const indexedFiles = parsedByPackage.get(program.name) ?? [];
    const symbolIndex = buildRustSymbolIndex(indexedFiles);
    symbolIndexes.set(program.name, symbolIndex);
    program.symbols = symbolIndex.symbols;
    for (const fn of program.functions) {
      const symbol = symbolIndex.symbols.find(item => (item.kind === 'function' || item.kind === 'method') && item.location.uri === fn.location.uri && item.location.startLine === fn.location.startLine && item.shortName === fn.name);
      if (symbol) fn.qualifiedName = symbol.qualifiedName;
    }
  }
  for (const program of list) program.callGraph = buildCallGraph(parsedByPackage.get(program.name) ?? [], program.functions, symbolIndexes.get(program.name));
  resolveCrossPackageCalls(list, symbolIndexes);
  for (const program of list) {
    if (isCancelled()) throw new AnalysisCancelledError();
    const callGraph = program.callGraph!;
    for (const fn of program.functions) {
      const calls = callGraph.calls.filter(call => call.caller === fn.qualifiedName);
      fn.directCalls = calls.map(call => call.id);
      fn.resolvedCalls = calls.filter(call => call.status === 'resolved').length;
      fn.unresolvedCalls = calls.filter(call => call.status !== 'resolved').length;
    }
    resolveInstructionAccounts(program);
    buildArchitecture(program);
    buildExternalPrograms(program);
    propagateReachableSurface(program);
    linkReachableSemantics(program);
    program.reviewHotspots = applyReviewComplexity(program);
    program.capabilities = buildCapabilities(program);
  }
  const allSurface = list.map(program => program.securitySurface);
  const reviewProfile = list.flatMap(program => program.reviewHotspots ?? []).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const report: WorkspaceReport = {
    schemaVersion: '0.6.0', tool: { name: 'Sealevel Insight', version: '0.6.0' },
    generatedAt: new Date().toISOString(),
    programs: list,
    files,
    diagnostics,
    analysisDiagnostics,
    reviewProfile,
    workspaceGraph,
    coverage: coverageFor(list, files),
    summary: {
      rustFiles: files.length, loc: sum(files, 'lines'), codeLoc: sum(files, 'codeLines'), blankLines: sum(files, 'blankLines'), commentLines: sum(files, 'commentLines'),
      functions: list.reduce((n, p) => n + p.functions.length, 0), instructions: list.reduce((n, p) => n + p.instructions.length, 0), accounts: list.reduce((n, p) => n + p.accounts.length, 0),
      signerSignals: sumSurface(allSurface, 'signerSignals'), writableSignals: sumSurface(allSurface, 'writableSignals'), rawOrUncheckedAccounts: sumSurface(allSurface, 'rawOrUncheckedAccounts'),
      pdas: sumSurface(allSurface, 'pdaSites', true), cpis: sumSurface(allSurface, 'cpiSites', true), pdaSignedCpis: allSurface.reduce((n, s) => n + s.cpiSites.filter(cpi => cpi.pdaSigned).length, 0), unsafeBlocks: sumSurface(allSurface, 'unsafeBlocks')
    }
  };
  const invariantDiagnostics = validateReport(report);
  report.analysisDiagnostics!.push(...invariantDiagnostics);
  report.diagnostics.push(...invariantDiagnostics.map(item => item.message));
  return report;
}

function resolveCrossPackageCalls(programs: ProgramUnit[], indexes: Map<string, RustSymbolIndex>): void {
  const byPackageId = new Map(programs.filter(program => program.packageId).map(program => [program.packageId!, program]));
  for (const program of programs) {
    const graph = program.callGraph; const index = indexes.get(program.name); if (!graph || !index) continue;
    for (const call of graph.calls.filter(item => item.status === 'external' || item.status === 'unresolved')) {
      let expression = call.sourceExpression ?? '';
      const module = index.modulesByFile.get(call.location.uri) ?? 'crate';
      const first = expression.split('::')[0];
      const imported = index.imports.find(item => item.fileUri === call.location.uri && item.module === module && !item.glob && item.alias === first);
      if (imported) expression = `${imported.target}${expression.slice(first.length)}`;
      const prefix = expression.split('::')[0];
      const dependency = (program.packageDependencies ?? []).find(item => item.internalPackageId && normalizeCrateName(item.name) === normalizeCrateName(prefix));
      const targetProgram = dependency?.internalPackageId ? byPackageId.get(dependency.internalPackageId) : undefined;
      if (!targetProgram) continue;
      const relative = expression.includes('::') ? expression.split('::').slice(1).join('::') : '';
      const candidates = (targetProgram.symbols ?? []).filter(symbol => (symbol.kind === 'function' || symbol.kind === 'method') && symbol.visibility.startsWith('pub') && (relative ? symbol.qualifiedName === `crate::${relative}` : symbol.shortName === expression));
      const qualified = (symbol: typeof candidates[number]) => `${targetProgram.name}::${symbol.qualifiedName.replace(/^crate::/, '')}`;
      if (candidates.length !== 1) { if (candidates.length > 1) { call.status = 'ambiguous'; call.candidateTargets = candidates.map(qualified).sort(); call.confidence = 0.35; } continue; }
      const symbol = candidates[0]; const target = qualified(symbol);
      call.status = 'resolved'; call.resolved = true; call.target = target; call.callee = target; call.candidateTargets = [target]; call.confidence = 0.88;
      call.evidence.push({ description: `public function resolved through internal Cargo dependency ${dependency!.name}`, location: call.location });
      graph.symbols.push(target); graph.edges.push({ source: call.caller, target, confidence: 0.88 });
      program.symbols ??= []; program.symbols.push({ ...symbol, id: `symbol:cross-package:${program.name}:${symbol.id}`, qualifiedName: target, evidence: [...symbol.evidence, { description: `indexed internal dependency ${targetProgram.name}` }] });
    }
    graph.symbols = [...new Set(graph.symbols)].sort(); graph.edges = [...new Map(graph.edges.map(edge => [`${edge.source}:${edge.target}`, edge])).values()];
  }
}
function normalizeCrateName(value: string): string { return value.replace(/-/g, '_'); }

function extract(file: ParsedRustFile, program: ProgramUnit): void {
  const root = file.tree!.rootNode;
  const source = file.source;
  const uri = file.uri;
  enrichUnifiedSemantics(root, uri, program);
  for (const match of source.matchAll(/declare_id!\s*\(\s*"([^"]+)"\s*\)/g)) {
    const location = offsetLocation(uri, source, match.index, match.index + match[0].length);
    const evidence = { description: `declare_id! program address ${match[1]}`, location };
    program.identity ??= { programId: match[1], sources: [], conflicts: [] };
    if (program.identity.programId && program.identity.programId !== match[1]) program.identity.conflicts.push(evidence);
    else { program.identity.programId = match[1]; program.identity.sources.push(evidence); }
  }
  for (const match of source.matchAll(/(?:pub\s+)?(?:const|static)\s+(?:PROGRAM_)?ID\s*:[^=]+?=\s*(?:pubkey|address)!\s*\(\s*"([^"]+)"\s*\)/g)) {
    const location = offsetLocation(uri, source, match.index, match.index + match[0].length);
    const evidence = { description: `constant program address ${match[1]}`, location };
    program.identity ??= { programId: match[1], sources: [], conflicts: [] };
    if (program.identity.programId && program.identity.programId !== match[1]) program.identity.conflicts.push(evidence); else program.identity.sources.push(evidence);
  }
  program.frameworkEvidence = dedupeEvidence([...program.frameworkEvidence, ...detectFramework(source, uri), ...enrichPinocchio(source), ...enrichNative(source), ...enrichSteel(source), ...enrichQuasar(source)]);
  const anchorSyntax = enrichAnchor(root, uri);
  const quasarSource = /quasar[-_]lang|quasar-spl|quasar::/.test(source);
  const anchor = !quasarSource && (/anchor[-_]lang|anchor_lang::|anchor_spl::|\bContext\s*</.test(source) || /derive\s*\(\s*Accounts/.test(source))
    ? anchorSyntax : { instructions: quasarSource ? [] : anchorSyntax.instructions, accounts: [] };
  program.instructions.push(...anchor.instructions);
    program.accounts.push(...anchor.accounts);
  const steel = enrichSteelSemantics(root, uri);
  const quasar = enrichQuasarSemantics(root, uri);
  const metadata = enrichMetadataFrameworks(root, uri);
  program.frameworkEvidence = dedupeEvidence([...program.frameworkEvidence, ...metadata.evidence]);
  program.instructions.push(...steel.instructions, ...quasar.instructions);
  program.instructions.push(...metadata.instructions);
  program.accounts.push(...steel.accounts, ...quasar.accounts, ...metadata.accounts);
    for (const account of anchor.accounts) {
      const seeds = account.constraints?.filter(constraint => constraint.kind === 'seeds').flatMap(constraint => { const expression = constraint.expression ?? ''; return expression.startsWith('[') && expression.endsWith(']') ? splitRustExpressions(expression.slice(1, -1)) : [expression]; });
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
    const functionLines = countLines(fn.text);
    const returnType = fn.childForFieldName('return_type')?.text ?? fn.children.find(child => child?.type === 'return_type')?.text?.replace(/^->\s*/, '');
    const modifiers = children.find(child => child.type === 'function_modifiers')?.text ?? '';
    const metric: FunctionMetric = { name, qualifiedName: `${program.name}::${name}`, location: loc(uri, fn), lines: fn.endPosition.row - fn.startPosition.row + 1, codeLines: functionLines.codeLines, complexity: sourceComplexity(fn), parameters: descendants(fn, 'parameter').length, isPublic: visibility.startsWith('pub'), visibility, isUnsafe: modifiers.includes('unsafe'), isAsync: modifiers.includes('async'), returnType, unsafeBlocks: descendants(fn, 'unsafe_block').length };
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
  enrichNativeAccountSemantics(root, uri, program);
  for (const type of ['AccountInfo', 'AccountView', 'Signer', 'UncheckedAccount', 'Account<', 'InterfaceAccount', 'Program<', 'SystemAccount']) {
    for (const index of indexesOf(source, type)) program.accounts.push({ id: `${uri}:account:${index}`, type, wrapperType: type.replace(/<.*$/, ''), raw: /AccountInfo|AccountView/.test(type), unchecked: /UncheckedAccount/.test(type), location: offsetLocation(uri, source, index, index + type.length), confidence: 0.7, evidence: [{ description: 'account-related type usage' }] });
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
  const addPda = (node: RustNode, api: string, evidence: string, confidence: number) => {
    const args = callArguments(node);
    const seedArgument = args[0]?.replace(/^&/, '').trim();
    const parsedSeeds = seedArgument?.startsWith('[') && seedArgument.endsWith(']') ? splitRustExpressions(seedArgument.slice(1, -1)) : seedArgument ? [seedArgument] : undefined;
    surface.pdaSites.push({ id: `${uri}:pda:${node.startPosition.row + 1}:${node.startPosition.column}`, location: loc(uri, node), enclosingFunction: metric.name, derivationApi: api, seeds: parsedSeeds, programIdExpression: args[1], evidence: [{ description: evidence, location: loc(uri, node) }], confidence });
  };
  const addCpi = (node: RustNode, api: string, signed: boolean, target?: string) => {
    const args = callArguments(node);
    const kind = target ? targetKind(target) : inferTargetKind(api);
    const resolvedTarget = target ?? targetForKind(kind);
    surface.cpiSites.push({ id: `${uri}:cpi:${node.startPosition.row + 1}:${node.startPosition.column}`, location: loc(uri, node), functionName: metric.name, invocationApi: api, instructionExpression: args[0], accountArguments: args.slice(1), signerPdaIds: [], target: resolvedTarget, targetKind: kind, evidence: [{ description: `AST CPI call to ${api}`, location: loc(uri, node) }], pdaSigned: signed, confidence: resolvedTarget ? 0.95 : 0.8 });
  };
  for (const call of calls) {
    const api = call.childForFieldName('function')?.text ?? '';
    if (/find_program_address|create_program_address(?:_const)?/.test(api)) addPda(call, api, 'PDA derivation call', 0.95);
    if (/invoke_signed|new_with_signer/.test(api)) addCpi(call, api, true);
    else if (/^(?:.*::)?invoke$|CpiContext::new$|cpi::invoke$|\.invoke$/.test(api)) addCpi(call, api, false);
    else if (isKnownCpiWrapper(api)) addCpi(call, api, false, targetForKind(inferTargetKind(api)));
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
  const functionCpis = surface.cpiSites.filter(site => site.functionName === metric.name && site.pdaSigned);
  const functionPdas = surface.pdaSites.filter(site => site.enclosingFunction === metric.name);
  if (functionCpis.length && functionPdas.length) for (const pda of functionPdas) { pda.usedAsSigner = true; pda.relatedCpiIds = functionCpis.map(site => site.id!).filter(Boolean); for (const cpi of functionCpis) cpi.signerPdaIds = [...new Set([...(cpi.signerPdaIds ?? []), pda.id!])]; }
  void source;
}

function targetKind(target: string): import('../model/report').ExternalProgramKind {
  if (/system/i.test(target)) return 'system-program';
  if (/token_2022|token2022/i.test(target)) return 'token-2022';
  if (/associated/i.test(target)) return 'associated-token';
  if (/memo/i.test(target)) return 'memo';
  if (/stake/i.test(target)) return 'stake';
  if (/vote/i.test(target)) return 'vote';
  if (/lookup.*table|address_lookup/i.test(target)) return 'address-lookup-table';
  if (/compute.*budget/i.test(target)) return 'compute-budget';
  if (/ed25519/i.test(target)) return 'ed25519';
  if (/secp256k1/i.test(target)) return 'secp256k1';
  if (/secp256r1/i.test(target)) return 'secp256r1';
  if (/token/i.test(target)) return 'spl-token';
  return 'custom';
}

function inferTargetKind(api: string): import('../model/report').ExternalProgramKind { if (/pinocchio[_-]system|system_instruction|system_program|SystemProgram/i.test(api)) return 'system-program'; if (/token[_-]2022/i.test(api)) return 'token-2022'; if (/associated[_-]token|AssociatedToken/i.test(api)) return 'associated-token'; if (/memo/i.test(api)) return 'memo'; if (/stake/i.test(api)) return 'stake'; if (/vote/i.test(api)) return 'vote'; if (/lookup.*table|address_lookup/i.test(api)) return 'address-lookup-table'; if (/compute.*budget/i.test(api)) return 'compute-budget'; if (/ed25519/i.test(api)) return 'ed25519'; if (/secp256k1/i.test(api)) return 'secp256k1'; if (/secp256r1/i.test(api)) return 'secp256r1'; if (/anchor_spl.*token|pinocchio[_-]token|spl_token|token::/i.test(api)) return 'spl-token'; return /invoke|CpiContext|\.invoke/.test(api) ? 'dynamic' : 'unknown'; }
function targetForKind(kind: import('../model/report').ExternalProgramKind): string | undefined { return kind === 'dynamic' || kind === 'unknown' ? undefined : kind; }
function isKnownCpiWrapper(api: string): boolean { return /(?:anchor_spl|pinocchio[_-](?:system|token|associated|memo)|quasar_spl|quasar::cpi|steel::cpi)/i.test(api) && /(?:transfer|mint|burn|close|create|initialize|invoke|assign|allocate)/i.test(api); }
function callArguments(node: RustNode): string[] { return node.childForFieldName('arguments')?.namedChildren.filter((item): item is RustNode => !!item).map(item => item.text) ?? []; }

function extractNativeParameters(fn: RustNode, metric: FunctionMetric, program: ProgramUnit): void {
  if (!/process_instruction|entrypoint|AccountInfo|AccountView/.test(fn.text)) return;
  for (const parameter of descendants(fn, 'parameter')) {
    const type = parameter.childForFieldName('type')?.text ?? '';
    const name = parameter.children.find(child => child?.type === 'identifier')?.text ?? '';
    if (!/AccountInfo|AccountView/.test(type) || /\[\s*(?:AccountInfo|AccountView)/.test(type) || !name) continue;
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
  const edges = new Map<string, string[]>();
  for (const edge of graph.edges) edges.set(edge.source, [...(edges.get(edge.source) ?? []), edge.target]);
  for (const instruction of program.instructions) {
    const handlerName = instruction.handler ?? instruction.functionName ?? instruction.name;
    const exactHandler = program.functions.find(fn => fn.name === handlerName && fn.location.uri === instruction.location.uri && fn.location.startLine === instruction.location.startLine);
    const handlerCandidates = program.functions.filter(fn => fn.name === handlerName);
    const handler = exactHandler?.qualifiedName ?? (handlerCandidates.length === 1 ? handlerCandidates[0].qualifiedName : undefined) ?? handlerName;
    const functions = new Set<string>();
    const queue = [handler];
    while (queue.length) {
      const current = queue.shift()!;
      if (functions.has(current)) continue;
      functions.add(current);
      queue.push(...(edges.get(current) ?? []).filter(next => !functions.has(next)));
    }
    const sites = [...functions].map(name => byName.get(name)).filter((fn): fn is FunctionMetric => !!fn);
    const reachableCalls = graph.calls.filter(call => functions.has(call.caller));
    const unresolvedCalls = reachableCalls.filter(call => call.status === 'unresolved' || call.status === 'external' || call.status === 'dynamic').map(call => call.id);
    const ambiguousCalls = reachableCalls.filter(call => call.status === 'ambiguous').map(call => call.id);
    const crossPackageFunctions = [...functions].filter(name => !byName.has(name) && reachableCalls.some(call => call.status === 'resolved' && call.target === name));
    const reachableCpiSites = program.securitySurface.cpiSites.filter(site => sites.some(fn => fn.name === site.functionName));
    const cpis = reachableCpiSites.map(site => site.id ?? '');
    const pdas = program.securitySurface.pdaSites.filter(site => sites.some(fn => fn.name === site.enclosingFunction)).map(site => site.id ?? '');
    const accountIds = program.relationships?.filter(rel => rel.instructionId === (instruction.id ?? instruction.name)).map(rel => rel.accountId) ?? [];
    const externalPrograms = reachableCpiSites.map(site => `external:${site.target ?? site.invocationApi ?? 'unknown'}`);
    for (const external of program.externalPrograms ?? []) if (externalPrograms.includes(external.id)) external.calledByInstructions = [...new Set([...external.calledByInstructions, instruction.id ?? instruction.name])].sort();
    const incompleteReasons = [...(unresolvedCalls.length ? [`${unresolvedCalls.length} unresolved/external/dynamic calls`] : []), ...(ambiguousCalls.length ? [`${ambiguousCalls.length} ambiguous calls`] : []), ...(crossPackageFunctions.length ? [`${crossPackageFunctions.length} cross-package functions indexed but not merged into this program's semantic surface`] : [])];
    instruction.reachableSurface = { directHandler: handler, functions: [...functions].sort(), unresolvedCalls, ambiguousCalls, complete: !incompleteReasons.length, incompleteReasons, directAccounts: [...new Set(accountIds)].sort(), accounts: [...new Set(accountIds)].sort(), directCpis: reachableCpiSites.filter(site => site.functionName === handlerName).map(site => site.id ?? ''), cpis: [...new Set(cpis)].sort(), signedCpis: reachableCpiSites.filter(site => site.pdaSigned).map(site => site.id ?? ''), dynamicCpis: reachableCpiSites.filter(site => site.targetKind === 'dynamic' || !site.target).map(site => site.id ?? ''), directPdas: program.securitySurface.pdaSites.filter(site => site.enclosingFunction === handlerName).map(site => site.id ?? ''), pdas: [...new Set(pdas)].sort(), externalPrograms: [...new Set(externalPrograms)].sort(), unsafeFunctions: sites.filter(fn => fn.isUnsafe).map(fn => fn.qualifiedName ?? fn.name), unsafeBlocks: sites.reduce((sum, fn) => sum + (fn.unsafeBlocks ?? 0), 0), reachableCyclomaticComplexity: sites.reduce((sum, fn) => sum + fn.complexity, 0) };
    for (const fn of sites) { fn.reachableFunctions = [...functions].sort(); fn.cpiCount = cpis.length; fn.pdaCount = pdas.length; }
  }
}

function emptyProgram(name: string, manifestUri?: string, packageKind: PackageKind = 'unknown', packageEvidence: Evidence[] = []): ProgramUnit {
  return { name, manifestUri, packageKind, packageEvidence, rustFiles: [], functions: [], instructions: [], accounts: [], frameworkEvidence: [], securitySurface: { signerSignals: 0, writableSignals: 0, ownerValidationSignals: 0, addressValidationSignals: 0, remainingAccounts: 0, rawOrUncheckedAccounts: 0, manualAccountIteration: 0, unsafeBlocks: 0, manualSignerChecks: 0, manualOwnerChecks: 0, manualWritableChecks: 0, manualAddressChecks: 0, manualSerialization: 0, reallocOperations: 0, unsafeFunctions: 0, cpiSites: [], pdaSites: [] }, relationships: [], architecture: { nodes: [], edges: [] } };
}

function fileMetric(file: ParsedRustFile): FileMetric {
  const counts = countLines(file.source);
  const root = file.tree?.rootNode;
  return { uri: file.uri, ...counts, functions: root ? descendants(root, 'function_item').length : 0, structs: root ? descendants(root, 'struct_item').length : 0, enums: root ? descendants(root, 'enum_item').length : 0, traits: root ? descendants(root, 'trait_item').length : 0, implBlocks: root ? descendants(root, 'impl_item').length : 0, unsafeBlocks: root ? descendants(root, 'unsafe_block').length : 0, macroInvocations: root ? descendants(root, 'macro_invocation').length : 0, attributes: root ? descendants(root, 'attribute_item').length : 0, useStatements: root ? descendants(root, 'use_declaration').length : 0, functionCalls: root ? descendants(root, 'call_expression').length : 0, methodCalls: root ? descendants(root, 'call_expression').filter(node => (node.childForFieldName('function')?.text ?? '').includes('.')).length : 0, matches: root ? descendants(root, 'match_expression').length : 0, loops: root ? descendants(root, ['loop_expression', 'while_expression', 'for_expression']).length : 0, parseError: file.error };
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
  const calls = programs.flatMap(program => program.callGraph?.calls ?? []);
  const relationships = programs.flatMap(program => program.relationships ?? []);
  const accounts = programs.flatMap(program => program.accounts);
  const unresolvedReasons: Record<string, number> = {};
  for (const call of calls.filter(item => item.status !== 'resolved')) unresolvedReasons[`${call.status ?? 'unresolved'} calls`] = (unresolvedReasons[`${call.status ?? 'unresolved'} calls`] ?? 0) + 1;
  return { parsedFiles: ratio(files.filter(file => !file.parseError).length, files.length), cargoPackages: ratio(programs.filter(program => !!program.packageId).length, programs.length), programsClassified: ratio(programs.filter(program => program.packageKind && program.packageKind !== 'unknown').length, programs.length), instructions: ratio(programs.reduce((sum, program) => sum + program.instructions.filter(item => item.confidence >= 0.7).length, 0), totalInstructions), handlers: ratio(programs.reduce((sum, program) => sum + program.instructions.filter(item => !!item.handler || !!item.functionName).length, 0), totalInstructions), instructionContexts: ratio(programs.reduce((sum, program) => sum + program.instructions.filter(instruction => !!instruction.contextType).length, 0), totalInstructions), accountRelationships: ratio(relationships.filter(item => accounts.some(account => account.id === item.accountId)).length, relationships.length), calls: ratio(calls.filter(call => call.status === 'resolved').length, calls.length), reachableSurfaces: ratio(programs.reduce((sum, program) => sum + program.instructions.filter(item => item.reachableSurface?.complete).length, 0), totalInstructions), cpiTargets: ratio(programs.reduce((sum, program) => sum + program.securitySurface.cpiSites.filter(site => !!site.target).length, 0), totalCpis), pdaSeeds: ratio(programs.reduce((sum, program) => sum + program.securitySurface.pdaSites.filter(site => !!site.seeds?.length).length, 0), totalPdas), programIds: ratio(programs.filter(program => !!program.identity?.programId).length, programs.length), unresolvedReasons };
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
    const key = `${account.location.uri}:${account.location.startLine}:${account.location.startColumn}:${account.type}:${account.name ?? ''}`;
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
  for (const fn of program.functions) nodes.push({ id: fn.qualifiedName ?? `function:${program.name}:${fn.name}:${fn.location.uri}:${fn.location.startLine}`, type: 'function', label: fn.qualifiedName ?? fn.name, location: fn.location });
  for (const edge of program.callGraph?.edges ?? []) if (!nodes.some(node => node.id === edge.target)) { const symbol = program.symbols?.find(item => item.qualifiedName === edge.target); nodes.push({ id: edge.target, type: 'function', label: edge.target, location: symbol?.location }); }
  for (const edge of program.callGraph?.edges ?? []) edges.push({ source: edge.source, target: edge.target, type: 'calls' });
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
    const existing = grouped.get(id) ?? { id, name, programId: cpi.targetProgramId, kind: cpi.targetKind ?? 'unknown', locations: [], calledByInstructions: [], cpiCount: 0, signedCpiCount: 0, confidence: cpi.confidence, evidence: [], cpiSiteIds: [] };
    existing.locations.push(cpi.location);
    if (instructionId) existing.calledByInstructions.push(instructionId);
    existing.cpiCount++;
    if (cpi.pdaSigned) existing.signedCpiCount++;
    existing.confidence = Math.max(existing.confidence, cpi.confidence);
    existing.evidence.push(...cpi.evidence);
    if (cpi.id) existing.cpiSiteIds!.push(cpi.id);
    grouped.set(id, existing);
  }
  program.externalPrograms = [...grouped.values()].map(item => ({ ...item, locations: [...new Map(item.locations.map(location => [`${location.uri}:${location.startLine}:${location.startColumn}`, location])).values()], calledByInstructions: [...new Set(item.calledByInstructions)].sort(), cpiSiteIds: [...new Set(item.cpiSiteIds)].sort(), evidence: [...new Map(item.evidence.map(evidence => [`${evidence.description}:${evidence.location?.uri ?? ''}:${evidence.location?.startLine ?? ''}`, evidence])).values()] }));
}

function resolveInstructionAccounts(program: ProgramUnit): void {
  program.relationships ??= [];
  for (const instruction of program.instructions) {
    if (!instruction.contextType) continue;
    for (const account of program.accounts.filter(item => item.contextType === instruction.contextType)) {
      if (!account.id) account.id = `account:${program.name}:${account.location.uri}:${account.location.startLine}:${account.name ?? account.type}`;
      program.relationships.push({ instructionId: instruction.id ?? instruction.name, accountId: account.id, relationship: account.signer ? 'signer' : account.writable ? 'writes' : account.unchecked || account.raw ? 'unchecked' : 'reads' });
    }
  }
  program.relationships = [...new Map(program.relationships.map(item => [`${item.instructionId}:${item.accountId}:${item.relationship}`, item])).values()];
}

function linkReachableSemantics(program: ProgramUnit): void {
  for (const instruction of program.instructions) {
    const surface = instruction.reachableSurface;
    if (!surface) continue;
    const shortNames = new Set(surface.functions.map(name => name.split('::').at(-1) ?? name));
    const instructionId = instruction.id ?? instruction.name;
    const sysvars = (program.sysvars ?? []).filter(item => item.functionName && shortNames.has(item.functionName));
    const runtime = (program.runtimeOperations ?? []).filter(item => item.functionName && shortNames.has(item.functionName));
    surface.sysvars = sysvars.map(item => item.id);
    surface.syscalls = runtime.map(item => item.id);
    surface.stateTypes = program.accounts.filter(account => account.id && surface.accounts.includes(account.id) && account.stateType).map(account => account.stateType!);
    surface.events = (program.events ?? []).filter(event => event.emissionSites.some(site => program.functions.some(fn => shortNames.has(fn.name) && fn.location.uri === site.uri && fn.location.startLine <= site.startLine && fn.location.endLine >= site.endLine))).map(event => event.id);
    surface.errors = (program.errors ?? []).filter(error => error.useSites.some(site => program.functions.some(fn => shortNames.has(fn.name) && fn.location.uri === site.uri && fn.location.startLine <= site.startLine && fn.location.endLine >= site.endLine))).map(error => error.id);
    for (const item of [...sysvars, ...runtime]) item.instructionIds = [...new Set([...item.instructionIds, instructionId])].sort();
    for (const cpi of program.securitySurface.cpiSites.filter(item => item.id && surface.cpis.includes(item.id))) cpi.reachableInstructions = [...new Set([...(cpi.reachableInstructions ?? []), instructionId])].sort();
    for (const pda of program.securitySurface.pdaSites.filter(item => item.id && surface.pdas.includes(item.id))) pda.reachableInstructions = [...new Set([...(pda.reachableInstructions ?? []), instructionId])].sort();
  }
}
