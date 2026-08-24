import { AnalysisDiagnostic, WorkspaceReport } from '../model/report';
import { SourceLocation } from '../model/sourceLocation';

export function validateReport(report: WorkspaceReport): AnalysisDiagnostic[] {
  const diagnostics: AnalysisDiagnostic[] = [];
  const add = (message: string, key: string, location?: SourceLocation) => diagnostics.push({ id: `diagnostic:invariant:${key}`, severity: 'error', category: 'invariant', message, location });
  for (const program of report.programs) {
    unique(program.instructions.map(item => item.id).filter((id): id is string => !!id), `${program.name}:instruction`, add);
    unique(program.accounts.map(item => item.id).filter((id): id is string => !!id), `${program.name}:account`, add);
    unique(program.securitySurface.cpiSites.map(item => item.id).filter((id): id is string => !!id), `${program.name}:cpi`, add);
    unique(program.securitySurface.pdaSites.map(item => item.id).filter((id): id is string => !!id), `${program.name}:pda`, add);
    const accountIds = new Set(program.accounts.map(item => item.id));
    const instructionIds = new Set(program.instructions.flatMap(item => [item.id, item.name]).filter((id): id is string => !!id));
    for (const relationship of program.relationships ?? []) {
      if (!accountIds.has(relationship.accountId)) add(`Dangling account relationship ${relationship.accountId} in ${program.name}`, `relationship-account:${program.name}:${relationship.accountId}`);
      if (!instructionIds.has(relationship.instructionId)) add(`Dangling instruction relationship ${relationship.instructionId} in ${program.name}`, `relationship-instruction:${program.name}:${relationship.instructionId}`);
    }
    const nodeIds = new Set(program.architecture?.nodes.map(node => node.id) ?? []);
    for (const edge of program.architecture?.edges ?? []) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) add(`Architecture edge references a missing node: ${edge.source} -> ${edge.target}`, `edge:${program.name}:${edge.source}:${edge.target}`);
    }
    for (const location of locations(program)) if (!validLocation(location)) add(`Invalid source location ${location.uri}:${location.startLine}:${location.startColumn}`, `location:${program.name}:${location.uri}:${location.startLine}:${location.startColumn}`, location);
    if (program.reviewComplexity && (!Number.isFinite(program.reviewComplexity.score) || program.reviewComplexity.score < 0)) add(`Invalid review complexity for ${program.name}`, `review:${program.name}`);
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
function validLocation(location: SourceLocation): boolean { return !!location.uri && Number.isInteger(location.startLine) && location.startLine >= 1 && Number.isInteger(location.endLine) && location.endLine >= location.startLine && Number.isInteger(location.startColumn) && location.startColumn >= 0 && Number.isInteger(location.endColumn) && location.endColumn >= 0 && (location.endLine > location.startLine || location.endColumn >= location.startColumn); }
function locations(program: WorkspaceReport['programs'][number]): SourceLocation[] { return [...program.functions.map(item => item.location), ...program.instructions.map(item => item.location), ...program.accounts.map(item => item.location), ...program.securitySurface.cpiSites.map(item => item.location), ...program.securitySurface.pdaSites.map(item => item.location), ...(program.stateTypes ?? []).map(item => item.location), ...(program.sysvars ?? []).map(item => item.location), ...(program.runtimeOperations ?? []).map(item => item.location), ...(program.events ?? []).map(item => item.location), ...(program.errors ?? []).map(item => item.location)]; }
