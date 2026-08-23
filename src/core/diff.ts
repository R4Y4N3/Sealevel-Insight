import { WorkspaceReport } from '../model/report';

export interface ReportDiff { summary: Record<string, number>; addedPrograms: string[]; removedPrograms: string[]; changedFunctions: Array<{ id: string; before?: number; after?: number }>; }

export function diffReports(before: WorkspaceReport, after: WorkspaceReport): ReportDiff {
  const beforePrograms = new Map(before.programs.map(program => [program.name, program]));
  const afterPrograms = new Map(after.programs.map(program => [program.name, program]));
  const changedFunctions: ReportDiff['changedFunctions'] = [];
  for (const program of after.programs) for (const fn of program.functions) {
    const old = beforePrograms.get(program.name)?.functions.find(item => item.name === fn.name);
    if (old && old.complexity !== fn.complexity) changedFunctions.push({ id: `${program.name}:${fn.name}`, before: old.complexity, after: fn.complexity });
  }
  return { summary: { codeLoc: after.summary.codeLoc - before.summary.codeLoc, functions: after.summary.functions - before.summary.functions, instructions: after.summary.instructions - before.summary.instructions, cpis: after.summary.cpis - before.summary.cpis, pdas: after.summary.pdas - before.summary.pdas }, addedPrograms: [...afterPrograms.keys()].filter(name => !beforePrograms.has(name)), removedPrograms: [...beforePrograms.keys()].filter(name => !afterPrograms.has(name)), changedFunctions };
}
