import { AnalysisDiagnostic, WorkspaceReport } from '../model/report';
import { SourceLocation } from '../model/sourceLocation';

export function validateReport(report: WorkspaceReport): AnalysisDiagnostic[] {
  const diagnostics: AnalysisDiagnostic[] = [];
  const add = (message: string, key: string, location?: SourceLocation) => diagnostics.push({ id: `diagnostic:invariant:${key}`, severity: 'error', category: 'invariant', message, location });
  const programsByName = new Map(report.programs.map(program => [program.name, program]));
  const callIds = new Set(report.programs.flatMap(program => program.callGraph?.calls.map(call => call.id) ?? []));
  for (const program of report.programs) {
    unique(program.callGraph?.calls.map(item => item.id) ?? [], `${program.name}:call`, add);
    unique(program.callGraph?.cycles?.map(item => item.id) ?? [], `${program.name}:cycle`, add);
    const graphSymbols = new Set(program.callGraph?.symbols ?? []); const graphCallIds = new Set(program.callGraph?.calls.map(item => item.id) ?? []);
    for (const call of program.callGraph?.calls ?? []) {
      if (call.status === 'resolved' && (!call.target || !call.resolved)) add(`Resolved call ${call.id} is missing its target/resolved flag`, `call-resolution:${program.name}:${call.id}`, call.location);
      if (call.status !== 'resolved' && call.resolved) add(`Non-resolved call ${call.id} has resolved=true`, `call-status:${program.name}:${call.id}`, call.location);
      if (call.resolutionTransforms?.some(item => !item.trim())) add(`Call ${call.id} has an empty dispatch transform`, `call-transform:${program.name}:${call.id}`, call.location);
    }
    for (const cycle of program.callGraph?.cycles ?? []) {
      if (cycle.kind === 'self-recursion' && cycle.functions.length !== 1 || cycle.kind === 'mutual-recursion' && cycle.functions.length < 2) add(`Call cycle ${cycle.id} has inconsistent kind/cardinality`, `cycle-kind:${program.name}:${cycle.id}`);
      for (const fn of cycle.functions) if (!graphSymbols.has(fn)) add(`Call cycle ${cycle.id} references missing symbol ${fn}`, `cycle-symbol:${program.name}:${cycle.id}:${fn}`);
      for (const id of cycle.callIds) if (!graphCallIds.has(id)) add(`Call cycle ${cycle.id} references missing call ${id}`, `cycle-call:${program.name}:${cycle.id}:${id}`);
    }
    unique(program.instructions.map(item => item.id).filter((id): id is string => !!id), `${program.name}:instruction`, add);
    unique(program.accounts.map(item => item.id).filter((id): id is string => !!id), `${program.name}:account`, add);
    unique(program.securitySurface.cpiSites.map(item => item.id).filter((id): id is string => !!id), `${program.name}:cpi`, add);
    unique(program.securitySurface.pdaSites.map(item => item.id).filter((id): id is string => !!id), `${program.name}:pda`, add);
    unique((program.instructionDossiers ?? []).map(item => item.id), `${program.name}:dossier`, add);
    unique((program.stateFlows ?? []).map(item => item.id), `${program.name}:state-flow`, add);
    const accountIds = new Set(program.accounts.map(item => item.id));
    const instructionIds = new Set(program.instructions.flatMap(item => [item.id, item.name]).filter((id): id is string => !!id));
    const cpiIds = new Set(program.securitySurface.cpiSites.map(item => item.id).filter((id): id is string => !!id));
    const pdaIds = new Set(program.securitySurface.pdaSites.map(item => item.id).filter((id): id is string => !!id));
    const stateTypeIds = new Set((program.stateTypes ?? []).map(item => item.id));
    for (const relationship of program.relationships ?? []) {
      if (!accountIds.has(relationship.accountId)) add(`Dangling account relationship ${relationship.accountId} in ${program.name}`, `relationship-account:${program.name}:${relationship.accountId}`);
      if (!instructionIds.has(relationship.instructionId)) add(`Dangling instruction relationship ${relationship.instructionId} in ${program.name}`, `relationship-instruction:${program.name}:${relationship.instructionId}`);
    }
    for (const dossier of program.instructionDossiers ?? []) {
      if (!instructionIds.has(dossier.instructionId)) add(`Instruction dossier ${dossier.id} references missing instruction ${dossier.instructionId}`, `dossier-instruction:${program.name}:${dossier.id}`);
      for (const account of dossier.accounts) {
        if (!accountIds.has(account.accountId)) add(`Instruction dossier ${dossier.id} references missing account ${account.accountId}`, `dossier-account:${program.name}:${dossier.id}:${account.accountId}`);
        if (account.stateTypeId && !stateTypeIds.has(account.stateTypeId)) add(`Instruction dossier ${dossier.id} references missing state type ${account.stateTypeId}`, `dossier-state:${program.name}:${dossier.id}:${account.stateTypeId}`);
      }
      for (const cpi of dossier.cpis) if (!cpiIds.has(cpi.cpiId)) add(`Instruction dossier ${dossier.id} references missing CPI ${cpi.cpiId}`, `dossier-cpi:${program.name}:${dossier.id}:${cpi.cpiId}`);
      for (const pda of dossier.pdas) if (!pdaIds.has(pda.pdaId)) add(`Instruction dossier ${dossier.id} references missing PDA ${pda.pdaId}`, `dossier-pda:${program.name}:${dossier.id}:${pda.pdaId}`);
      for (const detail of dossier.reachability.unresolvedCallDetails) {
        if (!callIds.has(detail.callId)) add(`Instruction dossier ${dossier.id} references missing call ${detail.callId}`, `dossier-call:${program.name}:${dossier.id}:${detail.callId}`);
        if (![...dossier.reachability.unresolvedCalls, ...dossier.reachability.ambiguousCalls].includes(detail.callId)) add(`Instruction dossier ${dossier.id} has an unclassified unresolved-call detail ${detail.callId}`, `dossier-call-classification:${program.name}:${dossier.id}:${detail.callId}`);
      }
      const crossNames = dossier.crossPackageSurfaces.map(item => item.program);
      unique(crossNames, `${program.name}:dossier-cross-package:${dossier.id}`, add);
      for (const cross of dossier.crossPackageSurfaces) {
        const target = programsByName.get(cross.program);
        if (!target) { add(`Instruction dossier ${dossier.id} references missing cross-package program ${cross.program}`, `dossier-cross-program:${program.name}:${dossier.id}:${cross.program}`); continue; }
        validateReferences(cross.cpiIds, new Set(target.securitySurface.cpiSites.map(item => item.id).filter((id): id is string => !!id)), 'CPI', cross.program, dossier.id, add);
        validateReferences(cross.pdaIds, new Set(target.securitySurface.pdaSites.map(item => item.id).filter((id): id is string => !!id)), 'PDA', cross.program, dossier.id, add);
        validateReferences(cross.stateTypeIds, new Set((target.stateTypes ?? []).map(item => item.id)), 'state type', cross.program, dossier.id, add);
        validateReferences(cross.runtimeOperationIds, new Set((target.runtimeOperations ?? []).map(item => item.id)), 'runtime operation', cross.program, dossier.id, add);
      }
      unique(dossier.reachabilityWitnesses.map(item => item.id), `${program.name}:dossier-witness:${dossier.id}`, add);
      for (const witness of dossier.reachabilityWitnesses) {
        const target = programsByName.get(witness.targetProgram);
        if (!target) { add(`Reachability witness ${witness.id} references missing program ${witness.targetProgram}`, `witness-program:${witness.id}`); continue; }
        if (!witness.functionPath.length) add(`Reachability witness ${witness.id} has an empty function path`, `witness-path:${witness.id}`);
        for (const id of witness.callPath) if (!callIds.has(id)) add(`Reachability witness ${witness.id} references missing call ${id}`, `witness-call:${witness.id}:${id}`);
        const targetIds = witness.targetKind === 'function' ? new Set(target.functions.map(fn => `${target.name}::${(fn.qualifiedName ?? fn.name).replace(/^crate::/, '')}`)) : witness.targetKind === 'call' ? callIds : witness.targetKind === 'cpi' ? new Set(target.securitySurface.cpiSites.map(item => item.id).filter((id): id is string => !!id)) : witness.targetKind === 'pda' ? new Set(target.securitySurface.pdaSites.map(item => item.id).filter((id): id is string => !!id)) : witness.targetKind === 'state-type' ? new Set((target.stateTypes ?? []).map(item => item.id)) : witness.targetKind === 'runtime-operation' ? new Set((target.runtimeOperations ?? []).map(item => item.id)) : new Set((target.externalPrograms ?? []).map(item => item.id));
        if (!targetIds.has(witness.targetId)) add(`Reachability witness ${witness.id} references missing ${witness.targetKind} ${witness.targetId}`, `witness-target:${witness.id}`);
      }
    }
    for (const flow of program.stateFlows ?? []) {
      if (!instructionIds.has(flow.instructionId)) add(`State flow ${flow.id} references missing instruction ${flow.instructionId}`, `state-flow-instruction:${program.name}:${flow.id}`);
      if (!accountIds.has(flow.accountId)) add(`State flow ${flow.id} references missing account ${flow.accountId}`, `state-flow-account:${program.name}:${flow.id}`);
      if (flow.stateTypeId && !stateTypeIds.has(flow.stateTypeId)) add(`State flow ${flow.id} references missing state type ${flow.stateTypeId}`, `state-flow-state:${program.name}:${flow.id}`);
    }
    const nodeIds = new Set(program.architecture?.nodes.map(node => node.id) ?? []);
    for (const edge of program.architecture?.edges ?? []) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) add(`Architecture edge references a missing node: ${edge.source} -> ${edge.target}`, `edge:${program.name}:${edge.source}:${edge.target}`);
    }
    for (const location of locations(program)) if (!validLocation(location)) add(`Invalid source location ${location.uri}:${location.startLine}:${location.startColumn}`, `location:${program.name}:${location.uri}:${location.startLine}:${location.startColumn}`, location);
    if (program.reviewComplexity && (!Number.isFinite(program.reviewComplexity.score) || program.reviewComplexity.score < 0)) add(`Invalid review complexity for ${program.name}`, `review:${program.name}`);
    const cfg = program.conditionalCompilation;
    if (cfg && (!Number.isInteger(cfg.inactiveItems) || cfg.inactiveItems < 0 || !Number.isInteger(cfg.unknownItems) || cfg.unknownItems < 0)) add(`Invalid conditional compilation counts for ${program.name}`, `cfg:${program.name}`);
  }
  if (report.auditManifest) {
    const dossierIds = new Set(report.programs.flatMap(program => program.instructionDossiers?.map(item => item.id) ?? []));
    const flowIds = new Set(report.programs.flatMap(program => program.stateFlows?.map(item => item.id) ?? []));
    for (const program of report.auditManifest.programs) {
      for (const id of program.instructionDossierIds) if (!dossierIds.has(id)) add(`Audit manifest references missing instruction dossier ${id}`, `manifest-dossier:${id}`);
      for (const id of program.stateFlowIds) if (!flowIds.has(id)) add(`Audit manifest references missing state flow ${id}`, `manifest-state-flow:${id}`);
    }
    for (const item of report.auditManifest.reviewQueue) if (!dossierIds.has(item.dossierId)) add(`Audit review queue references missing instruction dossier ${item.dossierId}`, `manifest-review:${item.dossierId}`);
    const scope = report.auditManifest.scope;
    if (scope.dossiers !== dossierIds.size || scope.stateFlows !== flowIds.size || scope.instructions !== report.summary.instructions) add('Audit manifest scope counts do not match detailed records', 'manifest-scope');
  }
  const expected = {
    rustFiles: report.files.length,
    functions: report.programs.reduce((sum, program) => sum + program.functions.length, 0),
    instructions: report.programs.reduce((sum, program) => sum + program.instructions.length, 0),
    accounts: report.programs.reduce((sum, program) => sum + program.accounts.length, 0),
    cpis: report.programs.reduce((sum, program) => sum + program.securitySurface.cpiSites.length, 0),
    pdas: report.programs.reduce((sum, program) => sum + program.securitySurface.pdaSites.length, 0)
  };
  for (const [key, value] of Object.entries(expected)) if (report.summary[key as keyof typeof expected] !== value) add(`Summary ${key}=${report.summary[key as keyof typeof expected]} but detailed records total ${value}`, `summary:${key}`);
  for (const [name, ratio] of Object.entries(report.coverage ?? {})) if (ratio && typeof ratio === 'object' && 'resolved' in ratio && 'total' in ratio && ((ratio as { resolved: number }).resolved > (ratio as { total: number }).total || (ratio as { resolved: number }).resolved < 0)) add(`Invalid semantic coverage ratio ${name}`, `coverage:${name}`);
  return diagnostics;
}

function unique(ids: string[], prefix: string, add: (message: string, key: string) => void): void { const seen = new Set<string>(); for (const id of ids) { if (seen.has(id)) add(`Duplicate semantic ID ${id}`, `${prefix}:${id}`); seen.add(id); } }
function validateReferences(ids: string[], valid: Set<string>, kind: string, target: string, dossierId: string, add: (message: string, key: string) => void): void { for (const id of ids) if (!valid.has(id)) add(`Instruction dossier ${dossierId} references missing cross-package ${kind} ${id} in ${target}`, `dossier-cross-${kind}:${dossierId}:${id}`); }
function validLocation(location: SourceLocation): boolean { return !!location.uri && Number.isInteger(location.startLine) && location.startLine >= 1 && Number.isInteger(location.endLine) && location.endLine >= location.startLine && Number.isInteger(location.startColumn) && location.startColumn >= 0 && Number.isInteger(location.endColumn) && location.endColumn >= 0 && (location.endLine > location.startLine || location.endColumn >= location.startColumn); }
function locations(program: WorkspaceReport['programs'][number]): SourceLocation[] { return [...program.functions.map(item => item.location), ...program.instructions.map(item => item.location), ...program.accounts.map(item => item.location), ...program.securitySurface.cpiSites.map(item => item.location), ...program.securitySurface.pdaSites.map(item => item.location), ...(program.stateTypes ?? []).map(item => item.location), ...(program.sysvars ?? []).map(item => item.location), ...(program.runtimeOperations ?? []).map(item => item.location), ...(program.events ?? []).map(item => item.location), ...(program.errors ?? []).map(item => item.location), ...(program.instructionDossiers ?? []).map(item => item.location), ...(program.stateFlows ?? []).map(item => item.location)]; }
