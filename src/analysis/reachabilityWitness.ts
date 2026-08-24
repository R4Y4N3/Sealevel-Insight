import { CallSite, Evidence, ProgramUnit, ReachabilityTargetKind, ReachabilityWitness } from '../model/report';
import { SourceLocation } from '../model/sourceLocation';

interface Edge { source: string; target: string; call: CallSite; }
interface Path { functions: string[]; calls: CallSite[]; }

/** Attaches one deterministic shortest witness path for every evidenced reachable item. */
export function attachReachabilityWitnesses(programs: ProgramUnit[]): void {
  const names = [...programs].sort((a, b) => b.name.length - a.name.length);
  const canonical = (program: ProgramUnit, value: string): string => {
    if (value.startsWith('crate::')) return `${program.name}::${value.slice(7)}`;
    if (names.some(item => value.startsWith(`${item.name}::`))) return value;
    return `${program.name}::${value}`;
  };
  const adjacency = new Map<string, Edge[]>();
  for (const program of programs) for (const call of program.callGraph?.calls ?? []) {
    if (call.status !== 'resolved' || !call.target) continue;
    const edge = { source: canonical(program, call.caller), target: canonical(program, call.target), call };
    adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge]);
  }
  for (const edges of adjacency.values()) edges.sort((a, b) => `${a.target}:${a.call.id}`.localeCompare(`${b.target}:${b.call.id}`));

  for (const sourceProgram of programs) for (const instruction of sourceProgram.instructions) {
    const surface = instruction.reachableSurface; if (!surface) continue;
    const root = canonical(sourceProgram, surface.directHandler ?? instruction.handler ?? instruction.functionName ?? instruction.name);
    const paths = shortestPaths(root, adjacency);
    const witnesses = new Map<string, ReachabilityWitness>();
    const add = (kind: ReachabilityTargetKind, targetId: string, targetProgram: ProgramUnit, path: Path | undefined, location?: SourceLocation, description?: string): void => {
      if (!path) return;
      const id = `witness:${sourceProgram.name}:${instruction.id ?? instruction.name}:${kind}:${targetProgram.name}:${targetId}`;
      const evidence: Evidence[] = [
        { description: description ?? `${kind} ${targetId} is reachable from instruction ${instruction.name}`, location },
        ...path.calls.map((call, index) => ({ description: path.functions[index + 1] ? `Resolved call step ${path.functions[index]} -> ${path.functions[index + 1]} via ${call.sourceExpression ?? call.callee}` : `Terminal ${call.status ?? 'unresolved'} call from ${path.functions.at(-1)} via ${call.sourceExpression ?? call.callee}`, location: call.location }))
      ];
      witnesses.set(`${kind}:${targetProgram.name}:${targetId}`, { id, targetKind: kind, targetId, targetProgram: targetProgram.name, functionPath: path.functions, callPath: path.calls.map(call => call.id), location, evidence });
    };
    const pathFor = (program: ProgramUnit, value: string): Path | undefined => paths.get(canonical(program, value));
    const ownerPath = (program: ProgramUnit, functionName: string | undefined, location: SourceLocation): Path | undefined => {
      const candidates = program.functions.filter(fn => (!functionName || fn.name === functionName) && contains(fn.location, location)).sort((a, b) => a.lines - b.lines || (a.qualifiedName ?? a.name).localeCompare(b.qualifiedName ?? b.name));
      const fallback = functionName ? program.functions.filter(fn => fn.name === functionName) : [];
      const fn = candidates[0] ?? (fallback.length === 1 ? fallback[0] : undefined);
      return fn ? pathFor(program, fn.qualifiedName ?? fn.name) : program === sourceProgram ? paths.get(root) : undefined;
    };

    for (const fn of surface.functions) {
      const program = programForFunction(fn, sourceProgram, names); const path = pathFor(program, fn);
      const metric = metricForFunction(program, fn);
      if (metric) add('function', canonical(program, fn), program, path, metric.location);
    }
    for (const detail of surface.unresolvedCallDetails ?? []) {
      const owner = programs.find(program => program.callGraph?.calls.some(call => call.id === detail.callId)) ?? sourceProgram;
      const call = owner.callGraph?.calls.find(item => item.id === detail.callId);
      const path = call ? pathFor(owner, call.caller) : undefined;
      add('call', detail.callId, owner, path ? { functions: path.functions, calls: [...path.calls, ...(call ? [call] : [])] } : undefined, detail.location, `${detail.status} call ${detail.expression}: ${detail.reason}`);
    }
    addSites(sourceProgram, surface.cpis, 'cpi', sourceProgram.securitySurface.cpiSites, item => ownerPath(sourceProgram, item.functionName, item.location), add);
    addSites(sourceProgram, surface.pdas, 'pda', sourceProgram.securitySurface.pdaSites, item => ownerPath(sourceProgram, item.enclosingFunction, item.location), add);
    addSites(sourceProgram, surface.syscalls ?? [], 'runtime-operation', sourceProgram.runtimeOperations ?? [], item => ownerPath(sourceProgram, item.functionName, item.location), add);
    for (const stateName of surface.stateTypes ?? []) {
      const state = sourceProgram.stateTypes?.find(item => item.name === stateName); if (state) add('state-type', state.id, sourceProgram, paths.get(root), state.location, `State type ${state.name} is connected through an instruction account relationship`);
    }
    for (const cross of surface.crossPackageSurfaces ?? []) {
      const program = programs.find(item => item.name === cross.program); if (!program) continue;
      addSites(program, cross.cpiIds, 'cpi', program.securitySurface.cpiSites, item => ownerPath(program, item.functionName, item.location), add);
      addSites(program, cross.pdaIds, 'pda', program.securitySurface.pdaSites, item => ownerPath(program, item.enclosingFunction, item.location), add);
      addSites(program, cross.runtimeOperationIds, 'runtime-operation', program.runtimeOperations ?? [], item => ownerPath(program, item.functionName, item.location), add);
      for (const id of cross.stateTypeIds) {
        const state = program.stateTypes?.find(item => item.id === id); if (!state) continue;
        const owners = program.functions.filter(fn => fn.stateAccess?.includes(state.name)).map(fn => pathFor(program, fn.qualifiedName ?? fn.name)).filter((item): item is Path => !!item).sort((a, b) => a.calls.length - b.calls.length || a.functions.join(':').localeCompare(b.functions.join(':')));
        add('state-type', id, program, owners[0], state.location);
      }
    }
    for (const externalId of surface.externalPrograms) {
      const cpi = sourceProgram.securitySurface.cpiSites.find(item => `external:${item.target ?? item.invocationApi ?? 'unknown'}` === externalId);
      if (cpi) add('external-program', externalId, sourceProgram, ownerPath(sourceProgram, cpi.functionName, cpi.location), cpi.location);
    }
    for (const cross of surface.crossPackageSurfaces ?? []) {
      const program = programs.find(item => item.name === cross.program); if (!program) continue;
      for (const externalId of cross.externalProgramIds) {
        const cpi = program.securitySurface.cpiSites.find(item => `external:${item.target ?? item.invocationApi ?? 'unknown'}` === externalId && cross.cpiIds.includes(item.id ?? ''));
        if (cpi) add('external-program', externalId, program, ownerPath(program, cpi.functionName, cpi.location), cpi.location);
      }
    }
    surface.witnesses = [...witnesses.values()].sort((a, b) => `${a.targetKind}:${a.targetProgram}:${a.targetId}`.localeCompare(`${b.targetKind}:${b.targetProgram}:${b.targetId}`));
    extendArchitecture(sourceProgram, surface.witnesses, names);
  }
}

function shortestPaths(root: string, adjacency: Map<string, Edge[]>): Map<string, Path> {
  const paths = new Map<string, Path>([[root, { functions: [root], calls: [] }]]); const queue = [root];
  while (queue.length) {
    const current = queue.shift()!; const path = paths.get(current)!;
    for (const edge of adjacency.get(current) ?? []) if (!paths.has(edge.target)) { paths.set(edge.target, { functions: [...path.functions, edge.target], calls: [...path.calls, edge.call] }); queue.push(edge.target); }
  }
  return paths;
}

function addSites<T extends { id?: string; location: SourceLocation }>(program: ProgramUnit, ids: string[], kind: ReachabilityTargetKind, sites: T[], path: (item: T) => Path | undefined, add: (kind: ReachabilityTargetKind, targetId: string, targetProgram: ProgramUnit, path: Path | undefined, location?: SourceLocation) => void): void {
  for (const item of sites.filter(site => site.id && ids.includes(site.id))) add(kind, item.id!, program, path(item), item.location);
}
function programForFunction(value: string, fallback: ProgramUnit, programs: ProgramUnit[]): ProgramUnit { return programs.find(program => value.startsWith(`${program.name}::`)) ?? fallback; }
function metricForFunction(program: ProgramUnit, value: string) { const local = value.startsWith(`${program.name}::`) ? `crate::${value.slice(program.name.length + 2)}` : value; return program.functions.find(fn => (fn.qualifiedName ?? fn.name) === local); }
function contains(owner: SourceLocation, child: SourceLocation): boolean { return owner.uri === child.uri && owner.startLine <= child.startLine && owner.endLine >= child.endLine; }
function extendArchitecture(source: ProgramUnit, witnesses: ReachabilityWitness[], programs: ProgramUnit[]): void {
  if (!source.architecture) return;
  const architectureId = (value: string) => value.startsWith(`${source.name}::`) ? `crate::${value.slice(source.name.length + 2)}` : value;
  for (const witness of witnesses) {
    for (const fn of witness.functionPath) {
      const id = architectureId(fn); if (source.architecture.nodes.some(node => node.id === id)) continue;
      const program = programForFunction(fn, source, programs); const metric = metricForFunction(program, fn);
      source.architecture.nodes.push({ id, type: 'function', label: fn, location: metric?.location });
    }
    for (let index = 0; index + 1 < witness.functionPath.length; index++) source.architecture.edges.push({ source: architectureId(witness.functionPath[index]), target: architectureId(witness.functionPath[index + 1]), type: 'calls', label: witness.targetProgram === source.name ? undefined : 'cross-package' });
  }
  source.architecture.nodes = [...new Map(source.architecture.nodes.map(node => [node.id, node])).values()];
  source.architecture.edges = [...new Map(source.architecture.edges.map(edge => [`${edge.source}:${edge.target}:${edge.type}:${edge.label ?? ''}`, edge])).values()];
}
