import * as path from 'node:path';
import { AnalysisDiagnostic, CargoResolution, WorkspaceGraph } from '../model/report';

type JsonObject = Record<string, unknown>;

export function applyCargoMetadata(graph: WorkspaceGraph, value: unknown, sourceUri: string): WorkspaceGraph {
  const metadata = object(value);
  const resolve = object(metadata.resolve);
  if (metadata.version !== 1 || !Array.isArray(metadata.packages) || !Array.isArray(resolve.nodes)) {
    graph.diagnostics.push(diagnostic(sourceUri, 'Saved Cargo metadata must use --format-version 1 and contain packages plus resolve.nodes.'));
    return graph;
  }
  const packages = arrayObjects(metadata.packages);
  const packageById = new Map(packages.map(item => [string(item.id), item]).filter((item): item is [string, JsonObject] => !!item[0]));
  const nodes = arrayObjects(resolve.nodes).flatMap(node => {
    const packageId = string(node.id); if (!packageId) return [];
    const pkg = packageById.get(packageId);
    const dependencies = arrayObjects(node.deps).flatMap(dep => {
      const dependencyId = string(dep.pkg); const name = string(dep.name); if (!dependencyId || !name) return [];
      const kinds = arrayObjects(dep.dep_kinds).map(item => ({ kind: dependencyKind(item.kind), target: string(item.target) })).map(item => item.target ? item : { kind: item.kind });
      return [{ name, packageId: dependencyId, kinds: kinds.length ? kinds : [{ kind: 'normal' as const }] }];
    });
    return [{ packageId, name: string(pkg?.name) ?? packageName(packageId), version: string(pkg?.version) ?? packageVersion(packageId), source: string(pkg?.source), features: strings(node.features).sort(), dependencies }];
  }).sort((a, b) => a.packageId.localeCompare(b.packageId));
  const dependencyEdges: CargoResolution['dependencyEdges'] = nodes.flatMap(node => node.dependencies.map(dep => ({ source: node.packageId, target: dep.packageId, name: dep.name, kinds: dep.kinds })));
  graph.resolution = {
    sourceUri, formatVersion: 1, workspaceRoot: string(metadata.workspace_root), targetDirectory: string(metadata.target_directory), rootPackageId: string(resolve.root),
    workspaceMembers: strings(metadata.workspace_members).sort(), workspaceDefaultMembers: strings(metadata.workspace_default_members).sort(), nodes, dependencyEdges
  };
  const metadataByManifest = new Map(packages.flatMap(pkg => { const manifest = string(pkg.manifest_path); const id = string(pkg.id); return manifest && id ? [[normalize(manifest), { id }]] as const : []; }));
  const nodeById = new Map(nodes.map(node => [node.packageId, node]));
  for (const pkg of graph.packages) {
    const resolved = metadataByManifest.get(normalize(pkg.manifestUri)); if (!resolved) continue;
    pkg.metadataId = resolved.id; pkg.enabledFeatures = nodeById.get(resolved.id)?.features ?? [];
    const node = nodeById.get(resolved.id);
    for (const dependency of pkg.dependencies) {
      const names = new Set([dependency.name, dependency.packageName].filter((item): item is string => !!item).flatMap(item => [item, item.replace(/-/g, '_')]));
      const ids = node?.dependencies.filter(item => names.has(item.name) || names.has(item.name.replace(/-/g, '_'))).map(item => item.packageId) ?? [];
      if (ids.length) dependency.resolvedPackageIds = [...new Set(ids)].sort();
    }
  }
  return graph;
}

function object(value: unknown): JsonObject { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}; }
function arrayObjects(value: unknown): JsonObject[] { return Array.isArray(value) ? value.map(object) : []; }
function string(value: unknown): string | undefined { return typeof value === 'string' && value.length ? value : undefined; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function normalize(value: string): string { return path.normalize(value).replace(/\\/g, '/'); }
function dependencyKind(value: unknown): 'normal' | 'dev' | 'build' { return value === 'dev' || value === 'build' ? value : 'normal'; }
function packageName(id: string): string { return id.split(/[ #]/).at(-2) ?? id; }
function packageVersion(id: string): string { return id.split(/[ #]/).at(-1) ?? 'unknown'; }
function diagnostic(sourceUri: string, message: string): AnalysisDiagnostic { return { id: `diagnostic:cargo:metadata:${sourceUri}`, category: 'cargo', severity: 'error', message, location: { uri: sourceUri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }; }
