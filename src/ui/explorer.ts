import * as vscode from 'vscode';
import { AccountInfo, InstructionInfo, ProgramUnit, WorkspaceReport } from '../model/report';
import { SourceLocation } from '../model/sourceLocation';

export class InsightExplorer implements vscode.TreeDataProvider<Item> {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;
  private report?: WorkspaceReport;
  setReport(report: WorkspaceReport): void { this.report = report; this.changed.fire(); }
  getTreeItem(item: Item): vscode.TreeItem { return item; }
  getChildren(element?: Item): Item[] {
    const report = this.report;
    if (!report) return [new Item('Run Analyze Workspace first', vscode.TreeItemCollapsibleState.None)];
    if (!element) return [
      section(`Programs (${report.programs.length})`, 'programs', true), section(`Audit Manifest (${report.auditManifest?.scope.dossiers ?? 0} dossiers)`, 'audit-manifest'), section(`Review Hotspots (${report.reviewProfile?.length ?? 0})`, 'hotspots'),
      section('Semantic Coverage', 'coverage'), section(`Compilation Profile (${report.compilationProfile?.cfgKnowledge ?? 'implicit'})`, 'compilation-profile'), section('Scope', 'scope'), section(`IDL (${report.idl?.reconciliations.length ?? 0})`, 'idl'),
      section(`Diagnostics (${report.analysisDiagnostics?.length ?? 0})`, 'diagnostics')
    ];
    if (element.kind === 'programs') return report.programs.map(program => new Item(program.name, vscode.TreeItemCollapsibleState.Collapsed, 'program', program.name));
    if (element.kind === 'audit-manifest') return auditManifestItems(report);
    if (element.kind === 'hotspots') return report.reviewProfile?.map(hotspot => sourceOrText(`${hotspot.label} • ${hotspot.score}`, 'hotspot', undefined, hotspot.location, hotspot.reasons.join('\n'))) ?? [];
    if (element.kind === 'coverage') return coverageItems(report);
    if (element.kind === 'compilation-profile') { const profile = report.compilationProfile; return profile ? [new Item(`Target • ${profile.target ?? 'not specified'}`, vscode.TreeItemCollapsibleState.None, 'compilation-profile-item'), new Item(`Mode • ${profile.mode}`, vscode.TreeItemCollapsibleState.None, 'compilation-profile-item'), new Item(`cfg knowledge • ${profile.cfgKnowledge}`, vscode.TreeItemCollapsibleState.None, 'compilation-profile-item'), new Item(`cfg options • ${profile.cfgOptions.join(', ') || 'none'}`, vscode.TreeItemCollapsibleState.None, 'compilation-profile-item'), new Item(`debug_assertions • ${profile.debugAssertions === undefined ? 'unknown' : profile.debugAssertions ? 'enabled' : 'disabled'}`, vscode.TreeItemCollapsibleState.None, 'compilation-profile-item')] : [new Item('Implicit normal profile; target cfg remains unknown', vscode.TreeItemCollapsibleState.None, 'compilation-profile-item')]; }
    if (element.kind === 'scope') return report.files.map(file => sourceOrText(`${shortUri(file.uri)} • ${file.codeLines} nSLOC`, 'file', undefined, { uri: file.uri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 }));
    if (element.kind === 'idl') return report.idl?.reconciliations.map(item => new Item(`${item.item} • ${item.status}`, vscode.TreeItemCollapsibleState.None, 'idl-item')) ?? [];
    if (element.kind === 'diagnostics') return (report.analysisDiagnostics ?? []).map(item => sourceOrText(`${item.severity}: ${item.message}`, 'diagnostic', undefined, item.location, item.category)) ;
    const program = report.programs.find(item => item.name === element.programName);
    if (!program) return [];
    if (element.kind === 'program') return programSections(program);
    if (element.kind === 'instructions') return program.instructions.map(instruction => {
      const surface = instruction.reachableSurface; const label = `${instruction.name} • ${surface?.reviewComplexity?.score ?? 0}`;
      const item = sourceOrText(label, 'instruction', program.name, instruction.location, surface?.complete === false ? `Incomplete: ${surface.incompleteReasons?.join(', ')}` : 'Reachable surface resolved');
      item.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed; item.itemId = instruction.id ?? instruction.name; return item;
    });
    if (element.kind === 'instruction') { const instruction = program.instructions.find(item => (item.id ?? item.name) === element.itemId); return instruction ? instructionChildren(program, instruction) : []; }
    if (element.kind === 'instruction-accounts') return idItems(program.accounts, element.ids, 'account');
    if (element.kind === 'instruction-helpers') return program.functions.filter(fn => element.ids?.includes(fn.qualifiedName ?? fn.name)).map(fn => sourceOrText(fn.qualifiedName ?? fn.name, 'function', program.name, fn.location));
    if (element.kind === 'instruction-cpis') return program.securitySurface.cpiSites.filter(site => element.ids?.includes(site.id ?? '')).map(site => sourceOrText(`${site.operation ?? site.target ?? 'dynamic target'}${site.pdaSigned ? ' • signed' : ''}`, 'cpi', program.name, site.location));
    if (element.kind === 'instruction-pdas') return program.securitySurface.pdaSites.filter(site => element.ids?.includes(site.id ?? '')).map(site => sourceOrText(site.seeds?.join(', ') ?? 'unresolved seeds', 'pda', program.name, site.location));
    if (element.kind === 'instruction-external') return (program.externalPrograms ?? []).filter(item => element.ids?.includes(item.id)).map(item => sourceOrText(`${item.name} • ${item.cpiCount} CPI`, 'external', program.name, item.locations[0]));
    if (element.kind === 'instruction-sysvars') return (program.sysvars ?? []).filter(item => element.ids?.includes(item.id) || element.ids?.includes(item.name)).map(item => sourceOrText(item.name, 'sysvar', program.name, item.location));
    if (element.kind === 'instruction-state-flows') return (program.stateFlows ?? []).filter(item => element.ids?.includes(item.id)).map(item => sourceOrText(`${program.accounts.find(account => account.id === item.accountId)?.name ?? item.accountId} • ${item.operations.join(', ')}${item.stateType ? ` • ${item.stateType}` : ''}`, 'state-flow', program.name, item.location, `Data: ${item.dataAccess.join(', ') || 'none'}\nLamports: ${item.lamportAccess.join(', ') || 'none'}\nSerialization: ${item.serialization.join(', ') || 'unknown'}`));
    if (element.kind === 'instruction-cross-package') return program.instructions.find(item => (item.id ?? item.name) === element.itemId)?.reachableSurface?.crossPackageSurfaces?.map(surface => sourceOrText(`${surface.program} • ${surface.functions.length} functions • ${surface.cpiIds.length} CPIs • ${surface.pdaIds.length} PDAs${surface.complete ? '' : ' • incomplete'}`, 'cross-package-surface', surface.program, surface.evidence.find(item => item.location)?.location, surface.evidence.map(item => item.description).join('\n'))) ?? [];
    if (element.kind === 'instruction-unresolved') return program.instructions.find(item => (item.id ?? item.name) === element.itemId)?.reachableSurface?.unresolvedCallDetails?.map(detail => sourceOrText(`${detail.status}: ${detail.expression}`, 'unresolved-call', program.name, detail.location, `${detail.reason}${detail.candidates.length ? `\nCandidates: ${detail.candidates.join(', ')}` : ''}`)) ?? [];
    if (element.kind === 'instruction-witnesses') return program.instructions.find(item => (item.id ?? item.name) === element.itemId)?.reachableSurface?.witnesses?.map(witness => sourceOrText(`${witness.targetKind}: ${witness.targetProgram}::${witness.targetId.split('::').at(-1)} • ${witness.callPath.length} step${witness.callPath.length === 1 ? '' : 's'}`, 'reachability-witness', witness.targetProgram, witness.location, `${witness.functionPath.join(' → ')}${witness.callPath.length ? `\nCalls: ${witness.callPath.join(' → ')}` : ''}`)) ?? [];
    if (element.kind === 'conditional-compilation') { const cfg = program.conditionalCompilation; return cfg ? [new Item(`Feature knowledge • ${cfg.featureKnowledge}`, vscode.TreeItemCollapsibleState.None, 'cfg-item'), new Item(`Enabled features • ${cfg.enabledFeatures.join(', ') || 'none known'}`, vscode.TreeItemCollapsibleState.None, 'cfg-item'), new Item(`Excluded items • ${cfg.inactiveItems}`, vscode.TreeItemCollapsibleState.None, 'cfg-item'), sourceOrText(`Unknown items • ${cfg.unknownItems}`, 'cfg-item', program.name, cfg.evidence.find(item => item.location)?.location, cfg.unknownPredicates.join('\n'))] : []; }
    if (element.kind === 'dispatch') return [
      ...(program.callGraph?.cycles ?? []).map(cycle => sourceOrText(`${cycle.kind} • ${cycle.functions.join(' ↔ ')}`, 'call-cycle', program.name, cycle.evidence.find(item => item.location)?.location, `Calls: ${cycle.callIds.join(', ')}`)),
      ...(program.callGraph?.calls ?? []).filter(call => call.indirect || call.dispatchKind && !['direct', 'inherent-method'].includes(call.dispatchKind)).map(call => sourceOrText(`${call.status ?? 'unknown'} • ${call.dispatchKind ?? 'unknown'} • ${call.sourceExpression ?? call.callee}`, 'dispatch-call', program.name, call.location, `${call.resolutionReason ?? 'No resolution reason'}${call.candidateTargets?.length ? `\nCandidates: ${call.candidateTargets.join(', ')}` : ''}${call.resolutionTransforms?.length ? `\nTransforms: ${call.resolutionTransforms.join(' → ')}` : ''}`))
    ];
    if (element.kind === 'state') return (program.stateTypes ?? []).map(item => sourceOrText(`${item.name} • ${item.serialization.join(', ') || 'unknown codec'}`, 'state-item', program.name, item.location));
    if (element.kind === 'events') return (program.events ?? []).map(item => sourceOrText(item.name, 'event', program.name, item.location));
    if (element.kind === 'errors') return (program.errors ?? []).map(item => sourceOrText(`${item.name}${item.code === undefined ? '' : ` (${item.code})`}`, 'error', program.name, item.location));
    if (element.kind === 'dependencies') return (program.packageDependencies ?? []).map(item => new Item(`${item.name} • ${item.kind}${item.optional ? ' • optional' : ''}`, vscode.TreeItemCollapsibleState.None, 'dependency', program.name));
    return [];
  }
}

function programSections(program: ProgramUnit): Item[] { return [
  section(`Instructions (${program.instructions.length})`, 'instructions', false, program.name),
  section(`Conditional Compilation (${program.conditionalCompilation?.unknownItems ?? 0} unknown)`, 'conditional-compilation', false, program.name),
  section(`Dispatch & Recursion (${program.callGraph?.calls.filter(item => item.indirect).length ?? 0} indirect · ${program.callGraph?.cycles?.length ?? 0} cycles)`, 'dispatch', false, program.name),
  section(`State (${program.stateTypes?.length ?? 0})`, 'state', false, program.name),
  section(`Events (${program.events?.length ?? 0})`, 'events', false, program.name),
  section(`Errors (${program.errors?.length ?? 0})`, 'errors', false, program.name),
  section(`Dependencies (${program.packageDependencies?.length ?? 0})`, 'dependencies', false, program.name)
]; }
function instructionChildren(program: ProgramUnit, instruction: InstructionInfo): Item[] { const surface = instruction.reachableSurface; const dossier = program.instructionDossiers?.find(item => item.instructionId === (instruction.id ?? instruction.name)); const flowIds = program.stateFlows?.filter(item => item.instructionId === (instruction.id ?? instruction.name)).map(item => item.id); const crossFunctions = new Set(surface?.crossPackageSurfaces?.flatMap(item => item.functions) ?? []); const localFunctions = surface?.functions.filter(item => !crossFunctions.has(item)); return [
  idsSection(`Accounts (${surface?.accounts.length ?? 0})`, 'instruction-accounts', program.name, surface?.accounts),
  idsSection(`State / Account Flows (${flowIds?.length ?? 0})`, 'instruction-state-flows', program.name, flowIds),
  idsSection(`Local Helpers (${localFunctions?.length ?? 0})`, 'instruction-helpers', program.name, localFunctions),
  instructionSection(`Cross-package Surface (${surface?.crossPackageSurfaces?.length ?? 0})`, 'instruction-cross-package', program.name, instruction.id ?? instruction.name),
  instructionSection(`Unresolved Calls (${surface?.unresolvedCallDetails?.length ?? 0})`, 'instruction-unresolved', program.name, instruction.id ?? instruction.name),
  instructionSection(`Evidence Paths (${surface?.witnesses?.length ?? 0})`, 'instruction-witnesses', program.name, instruction.id ?? instruction.name),
  idsSection(`CPIs (${surface?.cpis.length ?? 0})`, 'instruction-cpis', program.name, surface?.cpis),
  idsSection(`PDAs (${surface?.pdas.length ?? 0})`, 'instruction-pdas', program.name, surface?.pdas),
  idsSection(`External Programs (${surface?.externalPrograms.length ?? 0})`, 'instruction-external', program.name, surface?.externalPrograms),
  idsSection(`Sysvars (${surface?.sysvars?.length ?? 0})`, 'instruction-sysvars', program.name, surface?.sysvars),
  new Item(`Lifecycle sites • init ${dossier?.semanticSites.initialization.length ?? 0} • realloc ${dossier?.semanticSites.realloc.length ?? 0} • close ${dossier?.semanticSites.close.length ?? 0}`, vscode.TreeItemCollapsibleState.None, 'instruction-lifecycle', program.name)
]; }
function idItems(accounts: AccountInfo[], ids: string[] | undefined, kind: string): Item[] { return accounts.filter(item => ids?.includes(item.id ?? '')).map(item => sourceOrText(`${item.name ?? item.type}${item.writable ? ' • writable' : ''}${item.signer ? ' • signer' : ''}`, kind, undefined, item.location)); }
function coverageItems(report: WorkspaceReport): Item[] { return Object.entries(report.coverage ?? {}).flatMap(([name, value]) => {
  if (value && typeof value === 'object' && 'resolved' in value) return [new Item(`${human(name)}: ${value.resolved}/${value.total} (${(value.percent <= 1 ? value.percent * 100 : value.percent).toFixed(1)}%)`, vscode.TreeItemCollapsibleState.None, 'coverage-item')];
  if (typeof value === 'number') return [new Item(`${human(name)}: ${value}`, vscode.TreeItemCollapsibleState.None, 'coverage-item')];
  return [];
}); }
function auditManifestItems(report: WorkspaceReport): Item[] { const manifest = report.auditManifest; if (!manifest) return [new Item('Audit manifest unavailable', vscode.TreeItemCollapsibleState.None, 'audit-manifest-item')]; const unresolved = manifest.unresolved; return [
  new Item(`${manifest.analysisMode} • format ${manifest.formatVersion}`, vscode.TreeItemCollapsibleState.None, 'audit-manifest-item'),
  new Item(`${manifest.scope.programs} programs • ${manifest.scope.sourceFiles} files • ${manifest.scope.instructions} instructions`, vscode.TreeItemCollapsibleState.None, 'audit-manifest-item'),
  new Item(`${manifest.scope.stateFlows} account/state flows • ${manifest.externalPrograms.length} external programs`, vscode.TreeItemCollapsibleState.None, 'audit-manifest-item'),
  new Item(`Unresolved • ${unresolved.incompleteInstructionDossierIds.length} surfaces • ${unresolved.unknownOrDynamicCallIds.length} calls • ${unresolved.dynamicCpiIds.length} CPIs • ${unresolved.idlMismatchItems.length} IDL items`, vscode.TreeItemCollapsibleState.None, 'audit-manifest-item'),
  ...manifest.reviewQueue.slice(0, 20).map(item => sourceOrText(`${item.program}::${item.instruction} • review ${item.score}${item.complete ? '' : ' • incomplete'}`, 'audit-review-item', item.program, item.location, item.reasons.join('\n')))
]; }
function section(label: string, kind: string, expanded = false, programName?: string): Item { return new Item(label, expanded ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed, kind, programName); }
function idsSection(label: string, kind: string, programName: string, ids?: string[]): Item { const item = section(label, kind, false, programName); item.ids = ids; return item; }
function instructionSection(label: string, kind: string, programName: string, itemId: string): Item { const item = section(label, kind, false, programName); item.itemId = itemId; return item; }
function sourceOrText(label: string, kind: string, programName?: string, location?: SourceLocation, tooltip?: string): Item { const item = location ? Item.source(label, kind, programName, location) : new Item(label, vscode.TreeItemCollapsibleState.None, kind, programName); item.tooltip = tooltip; return item; }
function shortUri(uri: string): string { return uri.replace(/^file:\/\//, '').split('/').slice(-2).join('/'); }
function human(value: string): string { return value.replace(/([A-Z])/g, ' $1').replace(/^./, item => item.toUpperCase()); }

export class Item extends vscode.TreeItem {
  itemId?: string; ids?: string[];
  constructor(label: string, state: vscode.TreeItemCollapsibleState, public readonly kind?: string, public readonly programName?: string) { super(label, state); this.contextValue = kind; }
  static source(label: string, kind: string, programName: string | undefined, location: SourceLocation): Item {
    const item = new Item(label, vscode.TreeItemCollapsibleState.None, kind, programName); const uri = vscode.Uri.parse(location.uri);
    item.command = { command: 'vscode.open', title: 'Open source', arguments: [uri, { selection: new vscode.Range(Math.max(0, location.startLine - 1), location.startColumn, Math.max(0, location.endLine - 1), location.endColumn) }] }; item.resourceUri = uri; return item;
  }
}

export class InsightCodeLens implements vscode.CodeLensProvider {
  private readonly changed = new vscode.EventEmitter<void>(); readonly onDidChangeCodeLenses = this.changed.event; private report?: WorkspaceReport;
  setReport(report: WorkspaceReport): void { this.report = report; this.changed.fire(); }
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!this.report || !vscode.workspace.getConfiguration('sealevelInsight').get<boolean>('showCodeLens', true)) return [];
    return this.report.programs.flatMap(program => program.instructions.filter(item => !!item.handler && item.location.uri === document.uri.toString()).map(instruction => {
      const surface = instruction.reachableSurface; const title = `Sealevel Insight • ${surface?.accounts.length ?? 0} accounts • ${surface?.cpis.length ?? 0} CPIs • ${surface?.pdas.length ?? 0} PDAs • Review ${surface?.reviewComplexity?.score ?? 0}`;
      return new vscode.CodeLens(new vscode.Range(instruction.location.startLine - 1, 0, instruction.location.startLine - 1, 0), { title, command: 'sealevelInsight.openReport' });
    }));
  }
}

export class InsightHover implements vscode.HoverProvider {
  constructor(private readonly report: () => WorkspaceReport | undefined) {}
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const report = this.report(); const line = position.line + 1; const uri = document.uri.toString(); if (!report) return;
    for (const program of report.programs) {
      const instruction = program.instructions.find(item => contains(item.location, uri, line)); if (instruction) { const surface = instruction.reachableSurface; return hover(`Instruction: ${instruction.name}`, [`Accounts: ${surface?.accounts.length ?? 0}`, `CPIs: ${surface?.cpis.length ?? 0}`, `PDAs: ${surface?.pdas.length ?? 0}`, `Cross-package programs: ${surface?.crossPackageSurfaces?.length ?? 0}`, `Unresolved calls: ${surface?.unresolvedCallDetails?.length ?? 0}`, `Review: ${surface?.reviewComplexity?.score ?? 0}`, `Reachability: ${surface?.complete === false ? `incomplete — ${surface.incompleteReasons?.join('; ')}` : 'resolved'}`]); }
      const account = program.accounts.find(item => contains(item.location, uri, line)); if (account) return hover(`Account: ${account.name ?? account.type}`, [`Writable: ${yes(account.writable)}`, `Signer: ${yes(account.signer)}`, `PDA: ${yes(!!account.pdaId)}`, `Seeds: ${program.securitySurface.pdaSites.find(item => item.relatedAccountId === account.id)?.seeds?.join(', ') ?? 'none'}`, `Lifecycle: ${account.lifecycle?.join(', ') ?? 'unknown'}`]);
      const cpi = program.securitySurface.cpiSites.find(item => contains(item.location, uri, line)); if (cpi) return hover('CPI site', [`Target: ${cpi.target ?? 'dynamic/unresolved'}`, `API: ${cpi.invocationApi ?? 'unknown'}`, `Signed: ${yes(cpi.pdaSigned)}`]);
      const pda = program.securitySurface.pdaSites.find(item => contains(item.location, uri, line)); if (pda) return hover('PDA derivation', [`Seeds: ${pda.seeds?.join(', ') ?? 'unresolved'}`, `Bump: ${pda.bump ?? 'unresolved'}`, `Used as signer: ${yes(pda.usedAsSigner)}`]);
      const state = program.stateTypes?.find(item => contains(item.location, uri, line)); if (state) return hover(`State: ${state.name}`, [`Codec: ${state.serialization.join(', ') || 'unknown'}`, `Zero-copy: ${yes(state.zeroCopy)}`, `Size: ${state.dynamicSize ? 'dynamic' : state.staticSize ?? 'unknown'}`]);
    }
    return;
  }
}
function contains(location: SourceLocation, uri: string, line: number): boolean { return location.uri === uri && location.startLine <= line && location.endLine >= line; }
function yes(value: boolean | undefined): string { return value ? 'yes' : 'no'; }
function hover(title: string, lines: string[]): vscode.Hover { return new vscode.Hover(new vscode.MarkdownString(`**${title}**\n\n${lines.join('  \n')}`)); }
