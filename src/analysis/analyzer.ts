import { AccountInfo, ArchitectureEdge, ArchitectureNode, CompilationProfile, Evidence, FileMetric, FunctionMetric, ProgramUnit, SecuritySurface, WorkspaceReport, PackageKind, WorkspaceGraph } from '../model/report';
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
import { refreshAuditProducts } from './auditProducts';
import { analyzeConditionalCompilation, CfgFileAnalysis } from './cfg';
import { attachReachabilityWitnesses } from './reachabilityWitness';
import { enrichStateDataflow } from './stateDataflow';

export interface RustSourceInput { uri: string; source: string; packageName?: string; packageId?: string; packageRoot?: string; manifestUri?: string; packageKind?: PackageKind; packageEvidence?: Evidence[]; workspaceGraph?: WorkspaceGraph; }
export interface AnalysisOptions { compilationProfile?: CompilationProfile; }
export class AnalysisCancelledError extends Error { constructor() { super('Analysis cancelled.'); this.name = 'AnalysisCancelledError'; } }

export async function analyzeSources(inputs: RustSourceInput[], wasmPath: string, runtimeWasmPath?: string, isCancelled: () => boolean = () => false, options: AnalysisOptions = {}): Promise<WorkspaceReport> {
  const compilationProfile = options.compilationProfile ? { ...options.compilationProfile, cfgOptions: [...new Set(options.compilationProfile.cfgOptions.map(item => item.trim()).filter(Boolean))].sort(), evidence: dedupeSemanticEvidence(options.compilationProfile.evidence) } : undefined;
  const originalParsed = await mapConcurrent(inputs, 8, input => { if (isCancelled()) throw new AnalysisCancelledError(); return parseRust(input.uri, input.source, wasmPath, runtimeWasmPath); });
  if (isCancelled()) throw new AnalysisCancelledError();
  const workspaceGraph = inputs.find(input => input.workspaceGraph)?.workspaceGraph;
  const cfgAnalyses = originalParsed.map((file, index) => {
    const input = inputs[index]; const pkg = workspaceGraph?.packages.find(item => item.id === input.packageId || item.name === input.packageName);
    return file.tree ? analyzeConditionalCompilation(file.tree.rootNode, file.uri, file.source, pkg?.enabledFeatures, compilationProfile) : { source: file.source, inactiveItems: 0, unknownItems: 0, unknownPredicates: [], unknownRanges: [] } satisfies CfgFileAnalysis;
  });
  const parsed = await mapConcurrent(originalParsed, 8, async (file, index) => cfgAnalyses[index].source === file.source ? file : parseRust(file.uri, cfgAnalyses[index].source, wasmPath, runtimeWasmPath));
  const analysisDiagnostics = [
    ...originalParsed.filter(file => file.error).map((file, index) => ({ id: `diagnostic:parse:${index}`, severity: 'error' as const, category: 'parse' as const, message: file.error!, location: { uri: file.uri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } })),
    ...(workspaceGraph?.diagnostics ?? [])
  ];
  const diagnostics = analysisDiagnostics.map(item => `${item.location?.uri ? `${item.location.uri}: ` : ''}${item.message}`);
  const programs = new Map<string, ProgramUnit>();
  const parsedByPackage = new Map<string, Array<{ uri: string; root: RustNode; packageName: string; packageRoot?: string }>>();
  const files: FileMetric[] = [];
  parsed.forEach((file, index) => {
    const input = inputs[index];
    const metric = fileMetric(originalParsed[index]);
    files.push(metric);
    const name = input.packageName ?? packageFromUri(input.uri);
    const cargoPackage = workspaceGraph?.packages.find(pkg => pkg.id === input.packageId || pkg.name === name);
    const program = programs.get(name) ?? emptyProgram(name, input.manifestUri, input.packageKind, input.packageEvidence);
    if (cargoPackage) { program.rootUri = cargoPackage.rootUri; program.packageId = cargoPackage.id; program.cargoMetadataId = cargoPackage.metadataId; program.packageConfidence = cargoPackage.confidence; program.packageDependencies = cargoPackage.dependencies; }
    program.rustFiles.push(metric);
    if (file.tree) extract(file, program);
    applyConditionalCompilation(program, file.uri, cfgAnalyses[index], cargoPackage?.enabledFeatures);
    if (file.tree) parsedByPackage.set(name, [...(parsedByPackage.get(name) ?? []), { uri: file.uri, root: file.tree.rootNode, packageName: name, packageRoot: input.packageRoot ?? cargoPackage?.rootUri }]);
    programs.set(name, program);
  });
  const list = [...programs.values()];
  for (const program of list) mergeInstructionEvidence(program);
  const symbolIndexes = new Map<string, RustSymbolIndex>();
  for (const program of list) {
    if (isCancelled()) throw new AnalysisCancelledError();
    const indexedFiles = parsedByPackage.get(program.name) ?? [];
    const symbolIndex = buildRustSymbolIndex(indexedFiles);
    symbolIndexes.set(program.name, symbolIndex);
    program.symbols = symbolIndex.symbols;
    for (const fn of program.functions) {
      const symbol = symbolIndex.symbols.find(item => (item.kind === 'function' || item.kind === 'method' || item.kind === 'associated-function') && item.location.uri === fn.location.uri && item.location.startLine === fn.location.startLine && item.location.startColumn === fn.location.startColumn && item.shortName === fn.name);
      if (symbol) { fn.qualifiedName = symbol.qualifiedName; symbol.cfgStatus = fn.cfgStatus; symbol.cfgPredicates = fn.cfgPredicates; }
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
      fn.unresolvedCalls = calls.filter(call => call.status === 'unresolved' || call.status === 'ambiguous' || call.status === 'dynamic').length;
    }
    linkFrameworkPdas(program);
    resolveInstructionAccounts(program);
    buildExternalPrograms(program);
    propagateReachableSurface(program);
    enrichStateDataflow((parsedByPackage.get(program.name) ?? []).map(item => ({ uri: item.uri, root: item.root })), program);
    resolveInstructionAccounts(program);
    buildArchitecture(program);
    linkReachableSemantics(program);
  }
  propagateCrossPackageSurfaces(list);
  attachReachabilityWitnesses(list);
  for (const program of list) {
    program.reviewHotspots = applyReviewComplexity(program);
    program.capabilities = buildCapabilities(program);
  }
  const allSurface = list.map(program => program.securitySurface);
  const reviewProfile = list.flatMap(program => program.reviewHotspots ?? []).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const report: WorkspaceReport = {
    schemaVersion: '0.6.0', tool: { name: 'Sealevel Insight', version: '0.6.0' },
    generatedAt: new Date().toISOString(),
    compilationProfile,
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
  refreshAuditProducts(report);
  const invariantDiagnostics = validateReport(report);
  report.analysisDiagnostics!.push(...invariantDiagnostics);
  report.diagnostics.push(...invariantDiagnostics.map(item => item.message));
  return report;
}

function applyConditionalCompilation(program: ProgramUnit, uri: string, analysis: CfgFileAnalysis, enabledFeatures?: string[]): void {
  const summary = program.conditionalCompilation ?? { featureKnowledge: enabledFeatures ? 'cargo-metadata' as const : 'unknown' as const, enabledFeatures: [], inactiveItems: 0, unknownItems: 0, unknownPredicates: [], evidence: [] };
  if (enabledFeatures) summary.featureKnowledge = 'cargo-metadata';
  summary.enabledFeatures = [...new Set([...summary.enabledFeatures, ...(enabledFeatures ?? [])])].sort();
  summary.inactiveItems += analysis.inactiveItems; summary.unknownItems += analysis.unknownItems;
  summary.unknownPredicates = [...new Set([...summary.unknownPredicates, ...analysis.unknownPredicates])].sort();
  summary.evidence = [...summary.evidence, ...(analysis.inactiveItems ? [{ description: `${analysis.inactiveItems} cfg-disabled item(s) excluded from semantic reachability in ${uri}` }] : []), ...analysis.unknownRanges.flatMap(item => item.evidence)];
  program.conditionalCompilation = summary;
  const annotate = (item: { location: import('../model/sourceLocation').SourceLocation; cfgStatus?: 'active' | 'unknown'; cfgPredicates?: string[] }) => {
    const ranges = analysis.unknownRanges.filter(range => item.location.uri === uri && (item.location.startLine > range.startLine || item.location.startLine === range.startLine && item.location.startColumn >= range.startColumn) && (item.location.endLine < range.endLine || item.location.endLine === range.endLine && item.location.endColumn <= range.endColumn));
    if (!ranges.length) return; item.cfgStatus = 'unknown'; item.cfgPredicates = [...new Set(ranges.flatMap(range => range.predicates))].sort();
  };
  program.functions.filter(item => item.location.uri === uri).forEach(annotate);
  program.instructions.filter(item => item.location.uri === uri).forEach(annotate);
}

function resolveCrossPackageCalls(programs: ProgramUnit[], indexes: Map<string, RustSymbolIndex>): void {
  const byPackageId = new Map(programs.filter(program => program.packageId).map(program => [program.packageId!, program]));
  const byMetadataId = new Map(programs.filter(program => program.cargoMetadataId).map(program => [program.cargoMetadataId!, program]));
  for (const program of programs) {
    const graph = program.callGraph; const index = indexes.get(program.name); if (!graph || !index) continue;
    for (const call of graph.calls.filter(item => item.status === 'external' || item.status === 'unresolved')) {
      let expression = call.sourceExpression ?? '';
      const module = index.modulesByFile.get(call.location.uri) ?? 'crate';
      const first = expression.split('::')[0];
      const imported = index.imports.find(item => item.fileUri === call.location.uri && item.module === module && !item.glob && item.alias === first);
      if (imported) expression = `${imported.target}${expression.slice(first.length)}`;
      const prefix = expression.split('::')[0];
      const dependency = (program.packageDependencies ?? []).find(item => item.kind === 'normal' && normalizeCrateName(item.name) === normalizeCrateName(prefix) && (item.internalPackageId || item.resolvedPackageIds?.some(id => byMetadataId.has(id))));
      const targetProgram = dependency?.internalPackageId ? byPackageId.get(dependency.internalPackageId) : dependency?.resolvedPackageIds?.map(id => byMetadataId.get(id)).find((item): item is ProgramUnit => !!item);
      if (!targetProgram) continue;
      const relative = expression.includes('::') ? expression.split('::').slice(1).join('::') : '';
      const candidates = (targetProgram.symbols ?? []).filter(symbol => (symbol.kind === 'function' || symbol.kind === 'method' || symbol.kind === 'associated-function') && symbol.visibility === 'pub' && (relative ? symbol.qualifiedName === `crate::${relative}` : symbol.shortName === expression));
      const qualified = (symbol: typeof candidates[number]) => `${targetProgram.name}::${symbol.qualifiedName.replace(/^crate::/, '')}`;
      if (candidates.length !== 1) {
        call.resolved = false;
        if (candidates.length > 1) { call.status = 'ambiguous'; call.candidateTargets = candidates.map(qualified).sort(); call.confidence = 0.35; call.resolutionReason = `multiple public functions in internal Cargo dependency ${targetProgram.name} match ${expression}`; }
        else { call.status = 'unresolved'; call.candidateTargets = []; call.confidence = 0.25; call.resolutionReason = `internal Cargo dependency ${targetProgram.name} is known, but no externally public indexed function matches ${expression}`; }
        continue;
      }
      const symbol = candidates[0]; const target = qualified(symbol);
      call.status = 'resolved'; call.resolved = true; call.target = target; call.callee = target; call.candidateTargets = [target]; call.confidence = 0.88; call.resolutionReason = `one public function matched through internal Cargo dependency ${dependency!.name}`;
      call.evidence.push({ description: `public function resolved through internal Cargo dependency ${dependency!.name}`, location: call.location });
      graph.symbols.push(target); graph.edges.push({ source: call.caller, target, confidence: 0.88 });
      program.symbols ??= []; program.symbols.push({ ...symbol, id: `symbol:cross-package:${program.name}:${symbol.id}`, qualifiedName: target, evidence: [...symbol.evidence, { description: `indexed internal dependency ${targetProgram.name}` }] });
    }
    graph.symbols = [...new Set(graph.symbols)].sort(); graph.edges = [...new Map(graph.edges.map(edge => [`${edge.source}:${edge.target}`, edge])).values()];
  }
}

function mergeInstructionEvidence(program: ProgramUnit): void {
  const replacements = new Map<string, string>(); const merged: ProgramUnit['instructions'] = [];
  for (const group of [...new Set(program.instructions.map(item => item.name))].map(name => program.instructions.filter(item => item.name === name))) {
    const metadata = group.find(item => item.evidence.some(evidence => /ShankInstruction|Steel instruction!/.test(evidence.description)));
    const dispatch = group.find(item => item.evidence.some(evidence => /dispatch match arm/.test(evidence.description)));
    if (!metadata || !dispatch) { merged.push(...group); continue; }
    const canonical = { ...dispatch, contextType: metadata.contextType, discriminator: metadata.discriminator ?? dispatch.discriminator, arguments: metadata.arguments?.length ? metadata.arguments : dispatch.arguments, confidence: Math.max(metadata.confidence, dispatch.confidence), evidence: [...metadata.evidence, ...dispatch.evidence] };
    for (const item of group) replacements.set(item.id ?? item.name, canonical.id ?? canonical.name);
    merged.push(canonical);
  }
  program.instructions = merged;
  program.relationships = (program.relationships ?? []).map(item => ({ ...item, instructionId: replacements.get(item.instructionId) ?? item.instructionId }));
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
  for (const [framework, accounts] of [['anchor', anchor.accounts], ['quasar', quasar.accounts], ['steel', steel.accounts]] as const) for (const account of accounts) {
    const state = program.stateTypes?.find(item => item.name === account.stateType); if (!state) continue;
    state.framework = framework;
    state.discriminator ??= account.constraints?.find(item => item.kind === 'discriminator')?.expression;
  }
  if (quasarSource) for (const struct of descendants(root, 'struct_item')) {
    const seedsBody = /#\[seeds\s*\(([\s\S]*?)\)\]/.exec(attributesBefore(struct))?.[1]; if (!seedsBody) continue;
    const stateType = nodeText(field(struct, 'name')); const seeds = splitRustExpressions(seedsBody).map(item => item.replace(/\s*:\s*[A-Za-z_][A-Za-z0-9_:<>]*/g, '').trim()).filter(Boolean);
    program.securitySurface.pdaSites.push({ id: `pda:quasar-template:${program.name}:${stateType}`, location: loc(uri, struct), derivationApi: `${stateType}::seeds`, seeds, evidence: [{ description: `Quasar #[seeds] template for ${stateType}`, location: loc(uri, struct) }], confidence: 0.92 });
  }
    for (const [framework, semanticAccounts, semanticInstructions] of [['Anchor', anchor.accounts, anchor.instructions], ['Quasar', quasar.accounts, quasar.instructions]] as const) for (const account of semanticAccounts) {
      const seeds = account.constraints?.filter(constraint => constraint.kind === 'seeds').flatMap(constraint => { const expression = constraint.expression ?? ''; return expression.startsWith('[') && expression.endsWith(']') ? splitRustExpressions(expression.slice(1, -1)) : [expression]; });
      if (seeds?.length) { const id = `pda:${account.id}`; account.pdaId = id; program.securitySurface.pdaSites.push({ id, location: account.location, seeds, bump: account.constraints?.find(constraint => constraint.kind === 'bump')?.expression, relatedAccountId: account.id, enclosingInstruction: semanticInstructions.find(instruction => instruction.contextType === account.contextType)?.name, evidence: [{ description: `${framework} account PDA constraint`, location: account.location }], confidence: 0.95 }); }
      const initConstraint = account.constraints?.find(constraint => constraint.kind === 'init' || constraint.kind === 'init_if_needed' || constraint.kind === 'init(idempotent)');
      if (initConstraint) {
        const enclosingInstruction = semanticInstructions.find(instruction => instruction.contextType === account.contextType)?.name;
        const associatedToken = account.constraints?.some(item => item.kind.startsWith('associated_token::'));
        const target = associatedToken ? 'associated-token' : 'system-program'; const targetKind = associatedToken ? 'associated-token' as const : 'system-program' as const;
        const idempotent = initConstraint.kind === 'init_if_needed' || initConstraint.kind === 'init(idempotent)';
        const operation = associatedToken ? idempotent ? 'associated-token.create-idempotent' : 'associated-token.create' : 'system.create-account';
        const operationCategory = associatedToken ? 'token-account-create' as const : 'account-creation' as const;
        program.securitySurface.cpiSites.push({ id: `cpi:${framework.toLowerCase()}:init:${account.id}`, location: account.location, enclosingInstruction, invocationApi: `${framework} ${initConstraint.kind} account constraint`, instructionExpression: initConstraint.expression, accountArguments: [account.name ?? account.type, account.constraints?.find(item => item.kind === 'payer')?.expression ?? 'payer'], target, targetKind, operation, operationCategory, pdaSigned: !!seeds?.length, signerPdaIds: seeds?.length ? [`pda:${account.id}`] : [], evidence: [{ description: `${framework} ${initConstraint.kind} constraint generates an ${associatedToken ? 'Associated Token Program' : 'System Program'} CPI`, location: account.location }], confidence: 0.94 });
      }
      if (account.signer) program.securitySurface.signerSignals++;
      if (account.writable) program.securitySurface.writableSignals++;
      if (account.unchecked) program.securitySurface.rawOrUncheckedAccounts++;
    }
  const semanticContexts = new Map([...anchor.instructions, ...quasar.instructions].map(instruction => [instruction.contextType, instruction]));
  for (const fn of descendants(root, 'function_item')) {
    // Required and default trait members are not concrete entrypoints until a
    // matching impl is selected. Their impl bodies are visited independently.
    if (hasAncestor(fn, 'trait_item')) continue;
    const name = nodeText(field(fn, 'name'));
    const children = fn.children.filter((child): child is RustNode => child !== null);
    const visibility = children.find(child => child.type === 'visibility_modifier')?.text ?? 'private';
    const functionLines = countLines(fn.text);
    const returnType = fn.childForFieldName('return_type')?.text ?? fn.children.find(child => child?.type === 'return_type')?.text?.replace(/^->\s*/, '');
    const modifiers = children.find(child => child.type === 'function_modifiers')?.text ?? '';
    const metric: FunctionMetric = { name, qualifiedName: `${program.name}::${name}`, location: loc(uri, fn), lines: fn.endPosition.row - fn.startPosition.row + 1, codeLines: functionLines.codeLines, complexity: sourceComplexity(fn), parameters: descendants(fn, 'parameter').length, isPublic: visibility.startsWith('pub'), visibility, isUnsafe: modifiers.includes('unsafe'), isAsync: modifiers.includes('async'), returnType, unsafeBlocks: descendants(fn, 'unsafe_block').length };
    program.functions.push(metric);
    extractNativeParameters(fn, metric, program);
    extractSites(fn, metric, program, source, uri);
    if (metric.isUnsafe) program.securitySurface.unsafeFunctions++;
    const context = contextTypeFromFunction(fn.text);
    const instruction = semanticContexts.get(context);
    if (instruction && instruction.contextType) {
      instruction.contextType = context;
      for (const account of anchor.accounts.filter(account => account.contextType === context)) {
        program.relationships ??= [];
        program.relationships.push({ instructionId: instruction.id ?? instruction.name, accountId: account.id ?? account.name ?? account.type, relationship: account.signer ? 'signer' : account.writable ? 'writes' : account.unchecked ? 'unchecked' : 'reads' });
      }
    }
  }
  enrichNativeAccountSemantics(root, uri, program);
  for (const macro of descendants(root, 'macro_invocation')) {
    const entrypoint = /(?:^|::)(?:entrypoint|program_entrypoint|lazy_program_entrypoint)!\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(macro.text)?.[1]; if (!entrypoint) continue;
    const dispatched = program.instructions.some(item => item.handler && item.handler !== entrypoint && item.location.uri === uri);
    if (dispatched || program.instructions.some(item => item.handler === entrypoint)) continue;
    const fn = program.functions.find(item => item.name === entrypoint && item.location.uri === uri); if (!fn) continue;
    program.instructions.push({ id: `instruction:${uri}:entrypoint:${entrypoint}:${fn.location.startLine}`, name: entrypoint, handler: entrypoint, functionName: entrypoint, location: fn.location, confidence: 0.92, evidence: [{ description: `explicit entrypoint! macro targets ${entrypoint}`, location: loc(uri, macro) }] });
  }
  if (!program.instructions.some(item => item.location.uri === uri)) for (const fn of program.functions.filter(item => item.location.uri === uri && item.name === 'process_instruction')) {
    program.instructions.push({ id: `instruction:${uri}:entrypoint:${fn.name}:${fn.location.startLine}`, name: fn.name, handler: fn.name, functionName: fn.name, location: fn.location, confidence: 0.78, evidence: [{ description: 'conventional Solana process_instruction entrypoint', location: fn.location }] });
  }
  program.securitySurface.unsafeBlocks += descendants(root, 'unsafe_block').length;
  program.securitySurface.manualSerialization += (source.match(/try_from_slice|serialize|deserialize|borsh/g) ?? []).length;
  program.securitySurface.cpiSites = [...new Map(program.securitySurface.cpiSites.map(site => [site.id, site])).values()];
  program.securitySurface.pdaSites = [...new Map(program.securitySurface.pdaSites.map(site => [site.id, site])).values()];
}

function hasAncestor(node: RustNode, type: string): boolean {
  let parent = node.parent;
  while (parent) { if (parent.type === type) return true; parent = parent.parent; }
  return false;
}

function extractSites(fn: RustNode, metric: FunctionMetric, program: ProgramUnit, source: string, uri: string): void {
  const surface = program.securitySurface;
  const text = fn.text;
  const calls = descendants(fn, 'call_expression');
  const bindings = new Map(descendants(fn, 'let_declaration').map(node => [(node.childForFieldName('pattern')?.text ?? '').replace(/^mut\s+/, '').trim(), node.childForFieldName('value')?.text ?? node.text.split('=').slice(1).join('=').replace(/;\s*$/, '').trim()] as const).filter(([name]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)));
  const addPda = (node: RustNode, api: string, evidence: string, confidence: number, seedIndex = 0, programIndex = 1, bumpIndex?: number) => {
    const args = callArguments(node);
    const seedArgument = args[seedIndex]?.replace(/^&/, '').trim();
    const parsedSeeds = seedArgument?.startsWith('[') && seedArgument.endsWith(']') ? splitRustExpressions(seedArgument.slice(1, -1)) : seedArgument ? [seedArgument] : undefined;
    surface.pdaSites.push({ id: `${uri}:pda:${node.startPosition.row + 1}:${node.startPosition.column}`, location: loc(uri, node), enclosingFunction: metric.name, derivationApi: api, seeds: parsedSeeds, bump: bumpIndex === undefined ? parsedSeeds?.find(seed => /bump/i.test(seed)) : args[bumpIndex], programIdExpression: args[programIndex], evidence: [{ description: evidence, location: loc(uri, node) }], confidence });
  };
  const addCpi = (node: RustNode, api: string, signed: boolean, target?: string) => {
    const args = callArguments(node);
    const receiver = /^([A-Za-z_][A-Za-z0-9_]*)\./.exec(api)?.[1];
    const builderExpression = cpiBuilderExpression(api);
    const builder = builderExpression ? resolveBinding(builderExpression, bindings) : undefined;
    const builderArguments = builder ? finalCallArguments(builder) : [];
    const instructionExpression = builder ?? resolveBinding(args[0] ?? (receiver ? resolveBinding(receiver, bindings) : ''), bindings);
    const inferred = inferCpiTarget(api, instructionExpression, fn.text, source);
    const resolvedTarget = target ?? inferred.target ?? targetForKind(inferred.kind);
    const resolvedKind = target ? targetKind(target) : inferred.kind;
    const operation = inferCpiOperation(`${api}\n${instructionExpression}`, resolvedKind);
    const cpiId = `${uri}:cpi:${node.startPosition.row + 1}:${node.startPosition.column}`;
    const pushedAccounts = receiver ? calls.filter(item => (item.childForFieldName('function')?.text ?? '') === `${receiver}.push_account`).flatMap(callArguments) : [];
    surface.cpiSites.push({ id: cpiId, location: loc(uri, node), functionName: metric.name, invocationApi: api, instructionExpression, accountArguments: pushedAccounts.length ? pushedAccounts : builderArguments.length ? builderArguments : args.slice(1), programAccountExpression: inferred.programAccountExpression, signerPdaIds: [], target: resolvedTarget, targetKind: resolvedKind, operation: operation?.operation, operationCategory: operation?.category, evidence: [{ description: `AST CPI call to ${api}${operation ? ` (${operation.operation})` : ''}`, location: loc(uri, node) }, ...(builder ? [{ description: `method-style CPI builder ${builder}`, location: loc(uri, node) }] : [])], pdaSigned: signed, confidence: resolvedTarget ? 0.95 : inferred.programAccountExpression ? 0.85 : 0.8 });
    if (signed) {
      const seeds = signerSeeds(api, args, bindings);
      const seedHelpers = signerSeedHelpers(api, args, bindings);
      const helperPdas = seedHelpers.flatMap(helper => surface.pdaSites.filter(site => {
        const related = program.accounts.find(account => account.id === site.relatedAccountId);
        return related?.name === helper || site.derivationApi === `${helper}::seeds`;
      }));
      if (helperPdas.length) {
        const cpi = surface.cpiSites.at(-1)!;
        cpi.signerPdaIds = [...new Set(helperPdas.flatMap(pda => pda.id ? [pda.id] : []))];
        for (const pda of helperPdas) {
          pda.usedAsSigner = true;
          pda.relatedCpiIds = [...new Set([...(pda.relatedCpiIds ?? []), cpiId])];
          pda.evidence.push({ description: `Quasar generated ${seedHelpers.find(helper => program.accounts.find(account => account.id === pda.relatedAccountId)?.name === helper) ?? 'PDA'}_seeds helper passed to ${api}`, location: loc(uri, node) });
        }
      }
      if (seeds.length) {
        const existing = surface.pdaSites.find(item => item.enclosingFunction === metric.name);
        const pdaId = existing?.id ?? `${uri}:pda:signer:${node.startPosition.row + 1}:${node.startPosition.column}`;
        const bump = seeds.find(seed => /bump/i.test(seed));
        if (existing) { existing.usedAsSigner = true; existing.relatedCpiIds = [...new Set([...(existing.relatedCpiIds ?? []), cpiId])]; existing.seeds ??= seeds; existing.bump ??= bump; existing.evidence.push({ description: `structured signer seeds passed to ${api}`, location: loc(uri, node) }); }
        else surface.pdaSites.push({ id: pdaId, location: loc(uri, node), enclosingFunction: metric.name, derivationApi: `${api} signer seeds`, seeds, bump, programIdExpression: 'current program id', usedAsSigner: true, relatedCpiIds: [cpiId], evidence: [{ description: `structured signer seeds passed to ${api}`, location: loc(uri, node) }], confidence: 0.94 });
        const cpi = surface.cpiSites.at(-1)!; cpi.signerPdaIds = [pdaId];
      }
    }
  };
  const steelSource = program.frameworkEvidence.some(item => item.framework === 'steel');
  for (const call of calls) {
    const api = call.childForFieldName('function')?.text ?? '';
    const baseApi = api.replace(/::<[^>]*>$/, '');
    const importedCpi = importedCpiApi(baseApi, source);
    if (/find_program_address|create_program_address(?:_const)?/.test(baseApi)) addPda(call, api, 'PDA derivation call', 0.95);
    else if (steelSource && /\.has_seeds$/.test(baseApi)) addPda(call, api, 'Steel has_seeds PDA validation', 0.95);
    else if (steelSource && /(?:^|::)(?:create_program_account|allocate_account)$/.test(baseApi)) addPda(call, api, 'Steel program-account helper PDA seeds', 0.94, /create_program_account$/.test(baseApi) ? 4 : 5, /create_program_account$/.test(baseApi) ? 3 : 4);
    else if (steelSource && /(?:^|::)(?:create_program_account_with_bump|allocate_account_with_bump)$/.test(baseApi)) addPda(call, api, 'Steel program-account helper PDA seeds and explicit bump', 0.95, /create_program_account_with_bump$/.test(baseApi) ? 4 : 5, /create_program_account_with_bump$/.test(baseApi) ? 3 : 4, /create_program_account_with_bump$/.test(baseApi) ? 5 : 6);
    if (/invoke_signed|invoke_with_signers|new_with_signer/.test(baseApi)) addCpi(call, api, true);
    else if (/^(?:.*::)?invoke$|cpi::invoke$|\.invoke$/.test(baseApi)) addCpi(call, api, false);
    else if (/(?:^|::)cpi::[A-Za-z_][A-Za-z0-9_]*$/.test(baseApi)) addCpi(call, api, /new_with_signer/.test(call.text));
    else if (importedCpi) addCpi(call, importedCpi, /new_with_signer/.test(call.text));
    else if (isKnownCpiWrapper(api)) addCpi(call, api, false, targetForKind(inferTargetKind(api)));
    else if (steelSource && isSteelCpiHelper(baseApi)) addCpi(call, api, /(?:create_program_account|allocate_account|invoke_signed)/.test(baseApi), 'system-program');
  }
  const occurrence = (pattern: RegExp) => (text.match(pattern) ?? []).length;
  surface.signerSignals += occurrence(/is_signer/g);
  surface.writableSignals += occurrence(/is_writable/g);
  surface.ownerValidationSignals += occurrence(/\.owner\(|owner\s*==/g);
  surface.addressValidationSignals += occurrence(/address\s*=|key\(\)\s*==/g);
  surface.remainingAccounts += occurrence(/remaining_accounts|CtxWithRemaining/g);
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

function resolveBinding(expression: string, bindings: Map<string, string>): string {
  let value = expression.replace(/^&\s*/, '').trim(); const seen = new Set<string>();
  while (/^[A-Za-z_][A-Za-z0-9_]*$/.test(value) && bindings.has(value) && !seen.has(value)) { seen.add(value); value = bindings.get(value)!.replace(/^&\s*/, '').trim(); }
  return value || expression;
}

function signerSeeds(api: string, args: string[], bindings: Map<string, string>): string[] {
  let expression = /invoke_signed/.test(api) && !/\.invoke_signed$/.test(api) ? args[2] ?? '' : args[0] ?? '';
  expression = resolveBinding(expression, bindings).replace(/^&\s*/, '').trim();
  if (expression.startsWith('[') && expression.endsWith(']')) { const outer = splitRustExpressions(expression.slice(1, -1)); if (outer.length === 1) expression = resolveBinding(outer[0], bindings).replace(/^&\s*/, '').trim(); }
  const signer = /Signer::from\s*\(\s*&?\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/.exec(expression)?.[1]; if (signer) expression = resolveBinding(signer, bindings);
  if (!expression.startsWith('[') || !expression.endsWith(']')) return [];
  return splitRustExpressions(expression.slice(1, -1)).map(seed => /^Seed::from\s*\(([\s\S]*)\)$/.exec(seed.trim())?.[1]?.trim() ?? seed.replace(/^&/, '').trim()).filter(Boolean);
}

function signerSeedHelpers(api: string, args: string[], bindings: Map<string, string>): string[] {
  let expression = /invoke_signed|invoke_with_signers/.test(api) && /\.invoke_(?:signed|with_signers)$/.test(api) ? args[0] ?? '' : args[2] ?? '';
  expression = resolveBinding(expression, bindings).replace(/^&\s*/, '').trim();
  const candidates = expression.startsWith('[') && expression.endsWith(']') ? splitRustExpressions(expression.slice(1, -1)) : [expression];
  const helpers: string[] = [];
  for (const candidate of candidates) {
    const resolved = resolveBinding(candidate.replace(/^&\s*/, '').trim(), bindings);
    const helper = /(?:^|\.)\s*([A-Za-z_][A-Za-z0-9_]*)_seeds\s*\(\s*\)/.exec(resolved)?.[1];
    if (helper) helpers.push(helper);
  }
  return [...new Set(helpers)];
}

function cpiBuilderExpression(api: string): string | undefined {
  const match = /^([\s\S]+)\.invoke(?:_signed|_with_signers)?$/.exec(api.trim());
  return match?.[1]?.trim();
}

function finalCallArguments(expression: string): string[] {
  const close = expression.lastIndexOf(')'); if (close < 0) return [];
  let depth = 1, quote = '', escaped = false;
  for (let index = close - 1; index >= 0; index--) {
    const char = expression[index];
    if (quote) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") quote = char;
    else if (char === ')') depth++;
    else if (char === '(' && --depth === 0) return splitRustExpressions(expression.slice(index + 1, close)).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

function inferCpiTarget(api: string, instructionExpression: string, functionText: string, sourceText: string): { kind: import('../model/report').ExternalProgramKind; target?: string; programAccountExpression?: string } {
  const combined = `${api}\n${instructionExpression}`;
  const importedSystemOperation = /\b(CreateAccount(?:WithSeed|AllowPrefund)?|Allocate(?:WithSeed)?|Assign(?:WithSeed)?|Transfer(?:WithSeed|Many)?)\b/.exec(combined)?.[1];
  if (/solana_system_interface::instruction|system_instruction|pinocchio[_-]system|SystemInstruction::/.test(combined) || importedSystemOperation && new RegExp(`\\buse\\s+pinocchio[_-]system(?:::[A-Za-z_][A-Za-z0-9_]*)*::(?:\\{[^}]*\\b${importedSystemOperation}\\b[^}]*\\}|${importedSystemOperation})`).test(sourceText)) return { kind: 'system-program', target: 'system-program' };
  const known = inferTargetKind(combined); if (known !== 'unknown' && known !== 'dynamic') return { kind: known, target: targetForKind(known) };
  const methodProgram = /^((?:self|ctx\.accounts)\.[A-Za-z_][A-Za-z0-9_]*)\s*\.[A-Za-z_][A-Za-z0-9_]*\s*\(/.exec(instructionExpression)?.[1];
  const programExpression = /CpiContext::new(?:_with_signer)?\s*\(\s*([^,]+)/.exec(instructionExpression)?.[1]?.trim() ?? /CpiDynamic(?:::[^:]*)?::new\s*\(([\s\S]*)\)$/.exec(instructionExpression)?.[1]?.trim() ?? /Instruction::new(?:_with_borsh)?\s*\(\s*([^,]+)/.exec(instructionExpression)?.[1]?.trim() ?? /program_id\s*:\s*([^,}\n]+)/.exec(instructionExpression)?.[1]?.trim() ?? methodProgram ?? /(?:let\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*([A-Za-z_][A-Za-z0-9_.]*)\.cpi\s*\(/.exec(functionText)?.[1];
  return programExpression ? { kind: 'custom', target: programExpression, programAccountExpression: programExpression } : { kind: 'dynamic' };
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

function inferTargetKind(api: string): import('../model/report').ExternalProgramKind { if (/pinocchio[_-]system|system_instruction|system_program|SystemProgram/i.test(api)) return 'system-program'; if (/token[_-]2022/i.test(api)) return 'token-2022'; if (/associated[_-]token|AssociatedToken/i.test(api)) return 'associated-token'; if (/memo/i.test(api)) return 'memo'; if (/stake/i.test(api)) return 'stake'; if (/vote/i.test(api)) return 'vote'; if (/lookup.*table|address_lookup/i.test(api)) return 'address-lookup-table'; if (/compute.*budget/i.test(api)) return 'compute-budget'; if (/ed25519/i.test(api)) return 'ed25519'; if (/secp256k1/i.test(api)) return 'secp256k1'; if (/secp256r1/i.test(api)) return 'secp256r1'; if (/anchor_spl.*token|pinocchio[_-]token|spl_token|token::|token_program|TokenProgram/i.test(api)) return 'spl-token'; return /invoke|CpiContext|\.invoke/.test(api) ? 'dynamic' : 'unknown'; }
function targetForKind(kind: import('../model/report').ExternalProgramKind): string | undefined { return kind === 'dynamic' || kind === 'unknown' ? undefined : kind; }
function isKnownCpiWrapper(api: string): boolean { return /(?:anchor_spl|pinocchio[_-](?:system|token|associated|memo)|quasar_spl|quasar::cpi|steel::cpi)/i.test(api) && /(?:transfer|mint|burn|close|create|initialize|invoke|assign|allocate|approve|revoke|freeze|thaw|authority|recover)/i.test(api); }
function isSteelCpiHelper(api: string): boolean { return /(?:^|::)(?:create_account|create_program_account(?:_with_bump)?|allocate_account(?:_with_bump)?)$/.test(api) || /\.collect$/.test(api); }
function importedCpiApi(api: string, source: string): string | undefined {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(api)) return undefined;
  const escaped = escapeRegex(api);
  const direct = new RegExp(`\\buse\\s+([A-Za-z_][A-Za-z0-9_:]*)::cpi::([A-Za-z_][A-Za-z0-9_]*)(?:\\s+as\\s+${escaped})?\\s*;`, 'g');
  for (const match of source.matchAll(direct)) if (match[2] === api || new RegExp(`\\bas\\s+${escaped}\\s*;`).test(match[0])) return `${match[1]}::cpi::${match[2]}`;
  const grouped = /\buse\s+([A-Za-z_][A-Za-z0-9_:]*)::cpi::\{([^}]*)\}\s*;/g;
  for (const match of source.matchAll(grouped)) for (const item of splitRustExpressions(match[2])) {
    const alias = /^([A-Za-z_][A-Za-z0-9_]*)(?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?$/.exec(item.trim());
    if (alias && (alias[2] ?? alias[1]) === api) return `${match[1]}::cpi::${alias[1]}`;
  }
  return undefined;
}
function inferCpiOperation(value: string, kind: import('../model/report').ExternalProgramKind): { operation: string; category: import('../model/report').CpiOperationCategory } | undefined {
  const normalized = value.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  const match = (name: string) => new RegExp(`(?:^|[^a-z0-9])${name}(?:[^a-z0-9]|$)`).test(normalized);
  if (kind === 'system-program') {
    if (match('collect')) return { operation: 'system.transfer', category: 'lamport-transfer' };
    if (match('create_program_account_with_bump') || match('create_program_account')) return { operation: 'system.create-account', category: 'account-creation' };
    if (match('allocate_account_with_bump') || match('allocate_account')) return { operation: 'system.allocate', category: 'allocation' };
    if (match('create_account_allow_prefund')) return { operation: 'system.create-account-allow-prefund', category: 'account-creation' };
    if (match('create_account_with_seed')) return { operation: 'system.create-account-with-seed', category: 'account-creation' };
    if (match('create_account')) return { operation: 'system.create-account', category: 'account-creation' };
    if (match('allocate_with_seed')) return { operation: 'system.allocate-with-seed', category: 'allocation' };
    if (match('allocate')) return { operation: 'system.allocate', category: 'allocation' };
    if (match('assign_with_seed')) return { operation: 'system.assign-with-seed', category: 'ownership-change' };
    if (match('assign')) return { operation: 'system.assign', category: 'ownership-change' };
    if (match('transfer_many')) return { operation: 'system.transfer-many', category: 'lamport-transfer' };
    if (match('transfer_with_seed')) return { operation: 'system.transfer-with-seed', category: 'lamport-transfer' };
    if (match('transfer')) return { operation: 'system.transfer', category: 'lamport-transfer' };
    if (/nonce/.test(normalized)) return { operation: `system.${operationToken(normalized, 'nonce')}`, category: 'nonce' };
  }
  if (kind === 'spl-token' || kind === 'token-2022') {
    const prefix = kind === 'token-2022' ? 'token-2022' : 'token';
    if (match('transfer_checked')) return { operation: `${prefix}.transfer-checked`, category: 'token-transfer' };
    if (match('transfer')) return { operation: `${prefix}.transfer`, category: 'token-transfer' };
    if (match('mint_to_checked')) return { operation: `${prefix}.mint-to-checked`, category: 'token-mint' };
    if (match('mint_to')) return { operation: `${prefix}.mint-to`, category: 'token-mint' };
    if (match('burn_checked')) return { operation: `${prefix}.burn-checked`, category: 'token-burn' };
    if (match('burn')) return { operation: `${prefix}.burn`, category: 'token-burn' };
    if (match('close_account')) return { operation: `${prefix}.close-account`, category: 'account-close' };
    if (match('set_authority')) return { operation: `${prefix}.set-authority`, category: 'authority-change' };
    if (match('approve_checked')) return { operation: `${prefix}.approve-checked`, category: 'authority-change' };
    if (match('approve')) return { operation: `${prefix}.approve`, category: 'authority-change' };
    if (match('revoke')) return { operation: `${prefix}.revoke`, category: 'authority-change' };
    if (match('freeze_account')) return { operation: `${prefix}.freeze-account`, category: 'freeze' };
    if (match('thaw_account')) return { operation: `${prefix}.thaw-account`, category: 'thaw' };
    const initialize = /(?:^|[^a-z0-9])(initialize_[a-z0-9_]+)/.exec(normalized)?.[1];
    if (initialize) return { operation: `${prefix}.${initialize.replace(/_/g, '-')}`, category: 'initialization' };
  }
  if (kind === 'associated-token') {
    if (match('recover_nested')) return { operation: 'associated-token.recover-nested', category: 'token-account-recovery' };
    if (match('create_idempotent')) return { operation: 'associated-token.create-idempotent', category: 'token-account-create' };
    if (match('create')) return { operation: 'associated-token.create', category: 'token-account-create' };
  }
  return undefined;
}
function operationToken(value: string, fallback: string): string { return /([a-z0-9_]*nonce[a-z0-9_]*)/.exec(value)?.[1]?.replace(/_/g, '-') ?? fallback; }
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
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
    const unresolvedCalls = reachableCalls.filter(call => call.status === 'unresolved' || call.status === 'dynamic').map(call => call.id);
    const ambiguousCalls = reachableCalls.filter(call => call.status === 'ambiguous').map(call => call.id);
    const unresolvedCallDetails = reachableCalls.filter(call => call.status === 'unresolved' || call.status === 'dynamic' || call.status === 'ambiguous').map(call => ({ callId: call.id, expression: call.sourceExpression ?? call.callee, status: call.status as 'ambiguous' | 'unresolved' | 'dynamic', reason: call.resolutionReason ?? 'resolution evidence unavailable', candidates: [...(call.candidateTargets ?? [])], location: call.location })).sort((a, b) => a.callId.localeCompare(b.callId));
    const localSymbols = new Set(graph.symbols);
    const crossPackageFunctions = [...functions].filter(name => !byName.has(name) && !localSymbols.has(name) && reachableCalls.some(call => call.status === 'resolved' && call.target === name));
    const reachableCpiSites = program.securitySurface.cpiSites.filter(site => site.enclosingInstruction === instruction.name || sites.some(fn => fn.name === site.functionName));
    const cpis = reachableCpiSites.map(site => site.id ?? '');
    const pdas = program.securitySurface.pdaSites.filter(site => site.enclosingInstruction === instruction.name || sites.some(fn => fn.name === site.enclosingFunction)).map(site => site.id ?? '');
    const accountIds = program.relationships?.filter(rel => rel.instructionId === (instruction.id ?? instruction.name)).map(rel => rel.accountId) ?? [];
    const externalPrograms = reachableCpiSites.map(site => `external:${site.target ?? site.invocationApi ?? 'unknown'}`);
    for (const external of program.externalPrograms ?? []) if (externalPrograms.includes(external.id)) external.calledByInstructions = [...new Set([...external.calledByInstructions, instruction.id ?? instruction.name])].sort();
    const cfgUnknown = sites.filter(fn => fn.cfgStatus === 'unknown');
    const incompleteReasons = [...(unresolvedCalls.length ? [`${unresolvedCalls.length} unresolved or dynamic calls; inspect unresolvedCallDetails`] : []), ...(ambiguousCalls.length ? [`${ambiguousCalls.length} ambiguous calls; inspect candidate targets`] : []), ...(crossPackageFunctions.length ? [`${crossPackageFunctions.length} cross-package functions await workspace semantic propagation`] : []), ...(cfgUnknown.length || instruction.cfgStatus === 'unknown' ? [`conditional compilation is unresolved for ${cfgUnknown.length + (instruction.cfgStatus === 'unknown' ? 1 : 0)} reachable item(s)`] : [])];
    instruction.reachableSurface = { directHandler: handler, functions: [...functions].sort(), unresolvedCalls, ambiguousCalls, unresolvedCallDetails, complete: !incompleteReasons.length, incompleteReasons, directAccounts: [...new Set(accountIds)].sort(), accounts: [...new Set(accountIds)].sort(), directCpis: reachableCpiSites.filter(site => site.functionName === handlerName || site.enclosingInstruction === instruction.name).map(site => site.id ?? ''), cpis: [...new Set(cpis)].sort(), signedCpis: reachableCpiSites.filter(site => site.pdaSigned).map(site => site.id ?? ''), dynamicCpis: reachableCpiSites.filter(site => site.targetKind === 'dynamic' || !site.target).map(site => site.id ?? ''), directPdas: program.securitySurface.pdaSites.filter(site => site.enclosingFunction === handlerName || site.enclosingInstruction === instruction.name).map(site => site.id ?? ''), pdas: [...new Set(pdas)].sort(), externalPrograms: [...new Set(externalPrograms)].sort(), unsafeFunctions: sites.filter(fn => fn.isUnsafe).map(fn => fn.qualifiedName ?? fn.name), unsafeBlocks: sites.reduce((sum, fn) => sum + (fn.unsafeBlocks ?? 0), 0), reachableCyclomaticComplexity: sites.reduce((sum, fn) => sum + fn.complexity, 0) };
    for (const fn of sites) { fn.reachableFunctions = [...functions].sort(); fn.cpiCount = cpis.length; fn.pdaCount = pdas.length; }
  }
}

function propagateCrossPackageSurfaces(programs: ProgramUnit[]): void {
  const parseTarget = (target: string | undefined): { program: ProgramUnit; functionName: string } | undefined => {
    if (!target) return undefined;
    const program = [...programs].sort((a, b) => b.name.length - a.name.length).find(item => target.startsWith(`${item.name}::`));
    if (!program) return undefined; return { program, functionName: `crate::${target.slice(program.name.length + 2)}` };
  };
  for (const sourceProgram of programs) for (const instruction of sourceProgram.instructions) {
    const surface = instruction.reachableSurface; if (!surface || !sourceProgram.callGraph) continue;
    const initial = sourceProgram.callGraph.calls.filter(call => surface.functions.includes(call.caller) && call.status === 'resolved').flatMap(call => { const parsed = parseTarget(call.target); return parsed ? [parsed] : []; });
    if (!initial.length) { surface.crossPackageSurfaces = []; continue; }
    const queue = [...initial]; const visited = new Set<string>(); const missing: string[] = [];
    const groups = new Map<string, { program: ProgramUnit; functions: Set<string>; cpis: Set<string>; signedCpis: Set<string>; dynamicCpis: Set<string>; pdas: Set<string>; states: Set<string>; runtime: Set<string>; external: Set<string>; unresolved: Set<string>; ambiguous: Set<string>; evidence: Evidence[]; complexity: number; unsafe: number; cfgUnknown: number }>();
    const details = [...(surface.unresolvedCallDetails ?? [])];
    while (queue.length) {
      const current = queue.shift()!; const key = `${current.program.name}:${current.functionName}`; if (visited.has(key)) continue; visited.add(key);
      const fn = current.program.functions.find(item => (item.qualifiedName ?? item.name) === current.functionName);
      if (!fn) { missing.push(key); continue; }
      const group = groups.get(current.program.name) ?? { program: current.program, functions: new Set(), cpis: new Set(), signedCpis: new Set(), dynamicCpis: new Set(), pdas: new Set(), states: new Set(), runtime: new Set(), external: new Set(), unresolved: new Set(), ambiguous: new Set(), evidence: [], complexity: 0, unsafe: 0, cfgUnknown: 0 };
      const rendered = `${current.program.name}::${current.functionName.replace(/^crate::/, '')}`; group.functions.add(rendered); group.complexity += fn.complexity; group.unsafe += (fn.isUnsafe ? 1 : 0) + (fn.unsafeBlocks ?? 0); if (fn.cfgStatus === 'unknown') group.cfgUnknown++;
      group.evidence.push({ description: `Reached ${rendered} through a resolved internal Cargo dependency`, location: fn.location });
      const functionCpis = current.program.securitySurface.cpiSites.filter(site => site.id && site.functionName === fn.name && containsLocation(fn.location, site.location));
      for (const cpi of functionCpis) { group.cpis.add(cpi.id!); if (cpi.pdaSigned) group.signedCpis.add(cpi.id!); if (cpi.targetKind === 'dynamic' || !cpi.target) group.dynamicCpis.add(cpi.id!); group.external.add(`external:${cpi.target ?? cpi.invocationApi ?? 'unknown'}`); }
      for (const pda of current.program.securitySurface.pdaSites.filter(site => site.id && site.enclosingFunction === fn.name && containsLocation(fn.location, site.location))) group.pdas.add(pda.id!);
      for (const state of current.program.stateTypes ?? []) if (fn.stateAccess?.includes(state.name)) group.states.add(state.id);
      for (const operation of current.program.runtimeOperations?.filter(item => item.functionName === fn.name && containsLocation(fn.location, item.location)) ?? []) group.runtime.add(operation.id);
      for (const call of current.program.callGraph?.calls.filter(item => item.caller === current.functionName) ?? []) {
        if (call.status === 'resolved' && call.target) {
          const cross = parseTarget(call.target); if (cross) queue.push(cross); else if (call.target.startsWith('crate::')) queue.push({ program: current.program, functionName: call.target });
        } else if (call.status === 'unresolved' || call.status === 'dynamic' || call.status === 'ambiguous') {
          (call.status === 'ambiguous' ? group.ambiguous : group.unresolved).add(call.id);
          details.push({ callId: call.id, expression: call.sourceExpression ?? call.callee, status: call.status, reason: call.resolutionReason ?? 'resolution evidence unavailable', candidates: [...(call.candidateTargets ?? [])], location: call.location });
        }
      }
      groups.set(current.program.name, group);
    }
    surface.crossPackageSurfaces = [...groups.values()].map(group => ({
      program: group.program.name, functions: [...group.functions].sort(), cpiIds: [...group.cpis].sort(), signedCpiIds: [...group.signedCpis].sort(), dynamicCpiIds: [...group.dynamicCpis].sort(), pdaIds: [...group.pdas].sort(), stateTypeIds: [...group.states].sort(), runtimeOperationIds: [...group.runtime].sort(), externalProgramIds: [...group.external].sort(), unresolvedCallIds: [...group.unresolved].sort(), ambiguousCallIds: [...group.ambiguous].sort(), complete: !group.unresolved.size && !group.ambiguous.size && !group.cfgUnknown, evidence: dedupeSemanticEvidence(group.evidence)
    })).sort((a, b) => a.program.localeCompare(b.program));
    surface.functions = [...new Set([...surface.functions, ...surface.crossPackageSurfaces.flatMap(item => item.functions)])].sort();
    surface.unresolvedCalls = [...new Set([...(surface.unresolvedCalls ?? []), ...surface.crossPackageSurfaces.flatMap(item => item.unresolvedCallIds)])].sort();
    surface.ambiguousCalls = [...new Set([...(surface.ambiguousCalls ?? []), ...surface.crossPackageSurfaces.flatMap(item => item.ambiguousCallIds)])].sort();
    surface.unresolvedCallDetails = [...new Map(details.map(item => [item.callId, item])).values()].sort((a, b) => a.callId.localeCompare(b.callId));
    surface.reachableCyclomaticComplexity = (surface.reachableCyclomaticComplexity ?? 0) + [...groups.values()].reduce((sum, item) => sum + item.complexity, 0);
    surface.unsafeBlocks = (surface.unsafeBlocks ?? 0) + [...groups.values()].reduce((sum, item) => sum + item.unsafe, 0);
    const retained = (surface.incompleteReasons ?? []).filter(reason => !/cross-package functions await|unresolved or dynamic calls|ambiguous calls/.test(reason));
    const crossCfgUnknown = [...groups.values()].reduce((sum, item) => sum + item.cfgUnknown, 0);
    surface.incompleteReasons = [...retained, ...(surface.unresolvedCalls.length ? [`${surface.unresolvedCalls.length} unresolved or dynamic calls; inspect unresolvedCallDetails`] : []), ...(surface.ambiguousCalls.length ? [`${surface.ambiguousCalls.length} ambiguous calls; inspect candidate targets`] : []), ...(missing.length ? [`${missing.length} resolved cross-package function(s) were not present in the indexed dependency source`] : []), ...(crossCfgUnknown ? [`conditional compilation is unresolved for ${crossCfgUnknown} cross-package reachable item(s)`] : [])];
    surface.complete = !surface.incompleteReasons.length;
  }
}

function containsLocation(owner: import('../model/sourceLocation').SourceLocation, child: import('../model/sourceLocation').SourceLocation): boolean { return owner.uri === child.uri && owner.startLine <= child.startLine && owner.endLine >= child.endLine; }
function dedupeSemanticEvidence(items: Evidence[]): Evidence[] { return [...new Map(items.map(item => [`${item.description}:${item.location?.uri ?? ''}:${item.location?.startLine ?? ''}`, item])).values()].sort((a, b) => `${a.location?.uri ?? ''}:${a.location?.startLine ?? 0}:${a.description}`.localeCompare(`${b.location?.uri ?? ''}:${b.location?.startLine ?? 0}:${b.description}`)); }

function emptyProgram(name: string, manifestUri?: string, packageKind: PackageKind = 'unknown', packageEvidence: Evidence[] = []): ProgramUnit {
  return { name, manifestUri, packageKind, packageEvidence, rustFiles: [], functions: [], instructions: [], accounts: [], frameworkEvidence: [], securitySurface: { signerSignals: 0, writableSignals: 0, ownerValidationSignals: 0, addressValidationSignals: 0, remainingAccounts: 0, rawOrUncheckedAccounts: 0, manualAccountIteration: 0, unsafeBlocks: 0, manualSignerChecks: 0, manualOwnerChecks: 0, manualWritableChecks: 0, manualAddressChecks: 0, manualSerialization: 0, reallocOperations: 0, unsafeFunctions: 0, cpiSites: [], pdaSites: [] }, relationships: [], architecture: { nodes: [], edges: [] } };
}

function fileMetric(file: ParsedRustFile): FileMetric {
  const counts = countLines(file.source);
  const root = file.tree?.rootNode;
  return { uri: file.uri, ...counts, functions: root ? descendants(root, 'function_item').length : 0, structs: root ? descendants(root, 'struct_item').length : 0, enums: root ? descendants(root, 'enum_item').length : 0, traits: root ? descendants(root, 'trait_item').length : 0, implBlocks: root ? descendants(root, 'impl_item').length : 0, unsafeBlocks: root ? descendants(root, 'unsafe_block').length : 0, macroInvocations: root ? descendants(root, 'macro_invocation').length : 0, attributes: root ? descendants(root, 'attribute_item').length : 0, useStatements: root ? descendants(root, 'use_declaration').length : 0, functionCalls: root ? descendants(root, 'call_expression').length : 0, methodCalls: root ? descendants(root, 'call_expression').filter(node => (node.childForFieldName('function')?.text ?? '').includes('.')).length : 0, matches: root ? descendants(root, 'match_expression').length : 0, loops: root ? descendants(root, ['loop_expression', 'while_expression', 'for_expression']).length : 0, parseError: file.error };
}

function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
function attributesBefore(node: RustNode): string { const values: string[] = []; let sibling = node.previousNamedSibling; while (sibling?.type === 'attribute_item') { values.unshift(sibling.text); sibling = sibling.previousNamedSibling; } return values.join('\n'); }
function offsetLocation(uri: string, source: string, start: number, end: number) { const before = source.slice(0, start).split(/\r?\n/); const endLines = source.slice(0, end).split(/\r?\n/); return { uri, startLine: before.length, startColumn: before.at(-1)!.length, endLine: endLines.length, endColumn: endLines.at(-1)!.length }; }
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
  const internalResolvable = calls.filter(call => call.status === 'resolved' || call.status === 'ambiguous');
  const external = calls.filter(call => call.status === 'external');
  const relationships = programs.flatMap(program => program.relationships ?? []);
  const accounts = programs.flatMap(program => program.accounts);
  const stateAccesses = programs.flatMap(program => program.instructions.flatMap(instruction => instruction.reachableSurface?.stateAccesses ?? []));
  const unresolvedReasons: Record<string, number> = {};
  for (const call of calls.filter(item => item.status === 'ambiguous' || item.status === 'dynamic' || item.status === 'unresolved')) unresolvedReasons[`${call.status === 'unresolved' ? 'unknown' : call.status} calls`] = (unresolvedReasons[`${call.status === 'unresolved' ? 'unknown' : call.status} calls`] ?? 0) + 1;
  const meaningfulInternal = ratio(internalResolvable.filter(call => call.status === 'resolved').length, internalResolvable.length);
  return { parsedFiles: ratio(files.filter(file => !file.parseError).length, files.length), cargoPackages: ratio(programs.filter(program => !!program.packageId).length, programs.length), programsClassified: ratio(programs.filter(program => program.packageKind && program.packageKind !== 'unknown').length, programs.length), instructions: ratio(programs.reduce((sum, program) => sum + program.instructions.filter(item => item.confidence >= 0.7).length, 0), totalInstructions), handlers: ratio(programs.reduce((sum, program) => sum + program.instructions.filter(item => !!item.handler || !!item.functionName).length, 0), totalInstructions), instructionContexts: ratio(programs.reduce((sum, program) => sum + program.instructions.filter(instruction => !!instruction.contextType).length, 0), totalInstructions), accountRelationships: ratio(relationships.filter(item => accounts.some(account => account.id === item.accountId)).length, relationships.length), calls: meaningfulInternal, internalCalls: meaningfulInternal, externalCalls: ratio(external.length, external.length), ambiguousCalls: calls.filter(call => call.status === 'ambiguous').length, dynamicCalls: calls.filter(call => call.status === 'dynamic').length, unknownCalls: calls.filter(call => call.status === 'unresolved').length, reachableSurfaces: ratio(programs.reduce((sum, program) => sum + program.instructions.filter(item => item.reachableSurface?.complete).length, 0), totalInstructions), stateAccessBindings: ratio(stateAccesses.filter(item => item.resolved).length, stateAccesses.length), cpiTargets: ratio(programs.reduce((sum, program) => sum + program.securitySurface.cpiSites.filter(site => !!site.target).length, 0), totalCpis), pdaSeeds: ratio(programs.reduce((sum, program) => sum + program.securitySurface.pdaSites.filter(site => !!site.seeds?.length).length, 0), totalPdas), programIds: ratio(programs.filter(program => !!program.identity?.programId).length, programs.length), unresolvedReasons };
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
      existing.relations = [...(existing.relations ?? []), ...(account.relations ?? [])];
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
  for (const account of program.accounts.filter(item => item.id && item.relations?.length)) for (const relation of account.relations ?? []) {
    const targetName = /^[A-Za-z_][A-Za-z0-9_]*/.exec(relation.target)?.[0];
    const target = targetName ? program.accounts.find(item => item.name === targetName && item.contextType === account.contextType) : undefined;
    if (!target?.id || !nodes.some(node => node.id === account.id) || !nodes.some(node => node.id === target.id)) continue;
    edges.push({ source: account.id!, target: target.id, type: 'relates', label: relation.kind });
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
  program.architecture = { nodes: [...new Map(nodes.map(node => [node.id, node])).values()], edges: [...new Map(edges.map(edge => [`${edge.source}:${edge.target}:${edge.type}:${edge.label ?? ''}`, edge])).values()] };
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
    const instruction = program.instructions.find(item => item.name === cpi.enclosingInstruction || item.functionName === cpi.functionName || item.handler === cpi.functionName);
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
    const handler = instruction.handler ?? instruction.functionName;
    const related = instruction.contextType ? program.accounts.filter(item => item.contextType === instruction.contextType) : handler ? program.accounts.filter(item => item.id?.includes(`:${handler}:`)) : [];
    for (const account of related) {
      if (!account.id) account.id = `account:${program.name}:${account.location.uri}:${account.location.startLine}:${account.name ?? account.type}`;
      program.relationships = program.relationships.filter(item => item.instructionId !== (instruction.id ?? instruction.name) || item.accountId !== account.id);
      program.relationships.push({ instructionId: instruction.id ?? instruction.name, accountId: account.id, relationship: account.signer ? 'signer' : account.writable ? 'writes' : account.unchecked || account.raw ? 'unchecked' : 'reads' });
    }
  }
  program.relationships = [...new Map(program.relationships.map(item => [`${item.instructionId}:${item.accountId}:${item.relationship}`, item])).values()];
}

function linkFrameworkPdas(program: ProgramUnit): void {
  for (const pda of program.securitySurface.pdaSites.filter(item => item.relatedAccountId && !item.enclosingInstruction)) {
    const account = program.accounts.find(item => item.id === pda.relatedAccountId); pda.enclosingInstruction = program.instructions.find(item => item.contextType === account?.contextType)?.name;
  }
  for (const cpi of program.securitySurface.cpiSites.filter(item => item.id?.includes(':init:') && !item.enclosingInstruction)) {
    const account = program.accounts.find(item => item.id && cpi.id?.endsWith(item.id)); if (account) cpi.enclosingInstruction = program.instructions.find(item => item.contextType === account.contextType)?.name;
  }
  for (const pda of program.securitySurface.pdaSites.filter(item => item.id?.includes(':quasar-template:'))) {
    const stateType = pda.derivationApi?.replace(/::seeds$/, ''); if (!stateType) continue;
    const account = program.accounts.find(item => item.stateType === stateType && item.addressExpectation?.includes(`${stateType}::seeds`)); if (!account?.id) continue;
    pda.relatedAccountId = account.id; account.pdaId = pda.id;
    pda.enclosingInstruction = program.instructions.find(item => item.contextType === account.contextType)?.name;
    const initCpi = program.securitySurface.cpiSites.find(item => item.id?.includes(':init:') && item.id.endsWith(account.id!));
    if (initCpi) { initCpi.pdaSigned = true; initCpi.signerPdaIds = [pda.id!]; pda.usedAsSigner = true; pda.relatedCpiIds = [initCpi.id!]; }
  }
}

function linkReachableSemantics(program: ProgramUnit): void {
  for (const instruction of program.instructions) {
    const surface = instruction.reachableSurface;
    if (!surface) continue;
    const shortNames = new Set(surface.functions.map(name => name.split('::').at(-1) ?? name));
    const instructionId = instruction.id ?? instruction.name;
    const sysvars = (program.sysvars ?? []).filter(item => item.functionName && shortNames.has(item.functionName));
    const runtime = (program.runtimeOperations ?? []).filter(item => item.functionName && shortNames.has(item.functionName));
    const accounts = program.accounts.filter(account => account.id && surface.accounts.includes(account.id));
    surface.sysvars = sysvars.map(item => item.id);
    surface.syscalls = runtime.map(item => item.id);
    surface.stateTypes = accounts.filter(account => account.stateType).map(account => account.stateType!);
    surface.initializationSites = semanticAccountSites(accounts, ['init', 'create'], 'init');
    surface.reallocSites = [...semanticAccountSites(accounts, ['realloc'], 'realloc'), ...runtime.filter(item => item.kind === 'realloc').map(item => item.id)];
    surface.closeSites = semanticAccountSites(accounts, ['close'], 'close');
    surface.serializationSites = accounts.filter(account => account.serialization?.length).flatMap(account => account.serialization!.map(format => `${account.id}:serialization:${format}`));
    surface.deserializationSites = accounts.filter(account => account.stateType || account.serialization?.length).map(account => `${account.id}:deserialization`);
    const stateAccesses = surface.stateAccesses ?? [];
    surface.serializationSites = [...new Set([...surface.serializationSites, ...stateAccesses.filter(item => item.operation === 'serialize').map(item => item.id)])];
    surface.deserializationSites = [...new Set([...surface.deserializationSites, ...stateAccesses.filter(item => item.operation === 'deserialize').map(item => item.id)])];
    surface.lamportMutationSites = [...new Set([...accounts.filter(account => account.lamportAccess?.includes('write') || account.lifecycle?.includes('lamport-transfer')).map(account => `${account.id}:lamport-write`), ...stateAccesses.filter(item => item.operation === 'lamport-write' || item.operation === 'close').map(item => item.id)])];
    surface.dataMutationSites = [...new Set([...accounts.filter(account => account.dataAccess?.includes('write') || account.lifecycle?.includes('write')).map(account => `${account.id}:data-write`), ...runtime.filter(item => item.kind === 'state-write').map(item => item.id), ...stateAccesses.filter(item => item.operation === 'data-write' || item.operation === 'serialize' || item.operation === 'realloc' || item.operation === 'close').map(item => item.id)])];
    surface.reallocSites = [...new Set([...surface.reallocSites, ...stateAccesses.filter(item => item.operation === 'realloc').map(item => item.id)])];
    surface.closeSites = [...new Set([...surface.closeSites, ...stateAccesses.filter(item => item.operation === 'close').map(item => item.id)])];
    for (const account of accounts.filter(item => item.stateType)) {
      const state = program.stateTypes?.find(item => item.name === account.stateType); if (!state || !account.id) continue;
      if (account.lifecycle?.some(item => item === 'init' || item === 'create')) state.initializationSites.push(`${account.id}:init`);
      if (account.lifecycle?.includes('realloc')) state.reallocSites.push(`${account.id}:realloc`);
      if (account.lifecycle?.includes('close')) state.closeSites.push(`${account.id}:close`);
      state.initializationSites = [...new Set(state.initializationSites)]; state.reallocSites = [...new Set(state.reallocSites)]; state.closeSites = [...new Set(state.closeSites)];
    }
    surface.events = (program.events ?? []).filter(event => event.emissionSites.some(site => program.functions.some(fn => shortNames.has(fn.name) && fn.location.uri === site.uri && fn.location.startLine <= site.startLine && fn.location.endLine >= site.endLine))).map(event => event.id);
    surface.errors = (program.errors ?? []).filter(error => error.useSites.some(site => program.functions.some(fn => shortNames.has(fn.name) && fn.location.uri === site.uri && fn.location.startLine <= site.startLine && fn.location.endLine >= site.endLine))).map(error => error.id);
    for (const item of [...sysvars, ...runtime]) item.instructionIds = [...new Set([...item.instructionIds, instructionId])].sort();
    for (const cpi of program.securitySurface.cpiSites.filter(item => item.id && surface.cpis.includes(item.id))) cpi.reachableInstructions = [...new Set([...(cpi.reachableInstructions ?? []), instructionId])].sort();
    for (const pda of program.securitySurface.pdaSites.filter(item => item.id && surface.pdas.includes(item.id))) pda.reachableInstructions = [...new Set([...(pda.reachableInstructions ?? []), instructionId])].sort();
  }
}
function semanticAccountSites(accounts: AccountInfo[], lifecycle: NonNullable<AccountInfo['lifecycle']>, suffix: string): string[] { return accounts.filter(account => account.id && account.lifecycle?.some(item => lifecycle.includes(item))).map(account => `${account.id}:${suffix}`); }
