import { WorkspaceReport } from '../model/report';

export interface AnalysisPolicy { maxFunctionComplexity?: number; maxInstructionReviewComplexity?: number; noParseErrors?: boolean; noIdlMismatches?: boolean; minimumSemanticCoverage?: number; }
export interface PolicyResult { passed: boolean; failures: string[]; }

export function evaluatePolicy(report: WorkspaceReport, policy: AnalysisPolicy): PolicyResult {
  const failures: string[] = [];
  if (policy.maxFunctionComplexity !== undefined) for (const program of report.programs) for (const fn of program.functions) if (fn.complexity > policy.maxFunctionComplexity) failures.push(`${program.name}::${fn.name} complexity ${fn.complexity} exceeds ${policy.maxFunctionComplexity}`);
  if (policy.maxInstructionReviewComplexity !== undefined) for (const program of report.programs) for (const instruction of program.instructions) { const score = instruction.reachableSurface?.reviewComplexity?.score ?? 0; if (score > policy.maxInstructionReviewComplexity) failures.push(`${program.name}::${instruction.name} review complexity ${score} exceeds ${policy.maxInstructionReviewComplexity}`); }
  if (policy.noParseErrors && report.analysisDiagnostics?.some(item => item.category === 'parse' && item.severity === 'error')) failures.push('Report contains Rust parse errors.');
  if (policy.noIdlMismatches && report.idl?.reconciliations.some(item => item.status === 'MISMATCH')) failures.push('Report contains source/IDL mismatches.');
  if (policy.minimumSemanticCoverage !== undefined) for (const [name, ratio] of Object.entries(report.coverage ?? {})) if (ratio && typeof ratio === 'object' && 'percent' in ratio && typeof ratio.percent === 'number') {
    const actual = ratio.percent > 1 ? ratio.percent / 100 : ratio.percent;
    if (actual < policy.minimumSemanticCoverage) failures.push(`${name} coverage ${(actual * 100).toFixed(1)}% is below ${(policy.minimumSemanticCoverage * 100).toFixed(1)}%.`);
  }
  return { passed: !failures.length, failures };
}
