import * as path from 'node:path';
import { parse } from '@iarna/toml';
import { CargoDependency, CargoPackage, CargoWorkspace, Evidence, PackageKind, WorkspaceGraph } from '../model/report';

export interface ManifestInput { uri: string; text: string; }

export function buildCargoGraph(manifests: ManifestInput[], sourceByDirectory: Map<string, string[]>): WorkspaceGraph {
  const parsed = manifests.map(manifest => ({ ...manifest, data: parseSafe(manifest.text) }));
  const roots = parsed.filter(item => item.data.workspace && !item.data.package);
  const workspaces: CargoWorkspace[] = [];
  const packageInputs = new Map<string, typeof parsed[number]>();
  for (const item of parsed) packageInputs.set(path.dirname(item.uri), item);
  for (const root of roots) {
    const workspace = object(root.data.workspace);
    const members = strings(workspace.members).flatMap(pattern => expandMembers(path.dirname(root.uri), pattern, packageInputs));
    const excluded = strings(workspace.exclude).flatMap(pattern => expandMembers(path.dirname(root.uri), pattern, packageInputs));
    workspaces.push({ rootUri: path.dirname(root.uri), manifestUri: root.uri, members: members.filter(member => !excluded.includes(member)).sort(), excluded: excluded.sort() });
  }
  const packages = parsed.filter(item => item.data.package).map(item => makePackage(item, sourceByDirectory));
  const packageIds = new Map(packages.map(item => [item.rootUri, item.id]));
  for (const pkg of packages) for (const dependency of pkg.dependencies) if (dependency.path) dependency.internalPackageId = packageIds.get(path.resolve(pkg.rootUri, dependency.path));
  const dependencyEdges: WorkspaceGraph['dependencyEdges'] = [];
  for (const pkg of packages) {
    for (const dep of pkg.dependencies) dependencyEdges.push(dep.internalPackageId ? { source: pkg.id, target: dep.internalPackageId, kind: 'internal' } : { source: pkg.id, target: `external:${dep.packageName ?? dep.name}`, kind: 'external' });
  }
  return { workspaces, packages, dependencyEdges: dedupeEdges(dependencyEdges) };
}

function makePackage(item: ParseResult, sources: Map<string, string[]>): CargoPackage {
  const data = item.data;
  const packageData = object(data.package);
  const name = stringValue(packageData.name) ?? path.basename(item.uri);
  const rootUri = path.dirname(item.uri);
  const source = (sources.get(rootUri) ?? []).join('\n');
  const dependencies = dependencyEntries(data).map(([name, value, kind]) => dependency(name, value, kind));
  const programEvidence: Evidence[] = [];
  if (hasEntrypoint(source)) programEvidence.push({ description: 'program entrypoint syntax' });
  if (hasProgramDependency(dependencies)) programEvidence.push({ description: 'Solana/framework dependency' });
  const crateTypes = strings(object(data.lib)['crate-type']);
  if (crateTypes.includes('cdylib')) programEvidence.push({ description: 'cdylib crate type' });
  const isProgram = hasEntrypoint(source) || (crateTypes.includes('cdylib') && hasProgramDependency(dependencies));
  const isTest = /(^|[-_])test(s)?$/.test(name) || !!data.test;
  const kind: PackageKind = isTest ? 'test' : isProgram ? 'solana-program' : data.lib ? 'library' : 'unknown';
  return { id: `cargo:${rootUri}`, name, manifestUri: item.uri, rootUri, kind, confidence: isProgram ? 0.9 : 0.7, evidence: programEvidence, dependencies };
}

type ParseResult = { uri: string; text: string; data: Record<string, unknown> };
function parseSafe(text: string): Record<string, unknown> { try { return parse(text) as Record<string, unknown>; } catch { return {}; } }
function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : {}; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? [value] : []; }
function stringValue(value: unknown): string | undefined { return typeof value === 'string' ? value : undefined; }
function dependencyEntries(data: Record<string, unknown>): Array<[string, unknown, CargoDependency['kind']]> {
  return (['dependencies', 'dev-dependencies', 'build-dependencies'] as const).flatMap(section => Object.entries(object(data[section])).map(([name, value]) => {
    const kind: CargoDependency['kind'] = section === 'dependencies' ? 'normal' : section === 'dev-dependencies' ? 'dev' : 'build';
    return [name, value, kind] as [string, unknown, CargoDependency['kind']];
  }));
}
function dependency(name: string, value: unknown, kind: CargoDependency['kind']): CargoDependency { const spec = object(value); return { name, packageName: stringValue(spec.package), version: typeof value === 'string' ? value : stringValue(spec.version), path: stringValue(spec.path), optional: spec.optional === true, kind, evidence: [{ description: `Cargo ${kind} dependency` }] }; }
function hasProgramDependency(deps: CargoDependency[]): boolean { return deps.some(dep => /anchor|pinocchio|solana|spl[-_]/i.test(dep.packageName ?? dep.name)); }
function hasEntrypoint(source: string): boolean { return /entrypoint!|process_instruction|program_entrypoint|#\[program\]/.test(source); }
function expandMembers(root: string, pattern: string, packages: Map<string, ParseResult>): string[] { const clean = pattern.replace(/\\/g, '/'); if (!clean.includes('*')) { const candidate = path.resolve(root, clean); return packages.has(candidate) ? [candidate] : []; } const prefix = clean.split('*')[0].replace(/\/$/, ''); return [...packages.keys()].filter(candidate => candidate.startsWith(path.resolve(root, prefix))).sort(); }
function dedupeEdges(edges: WorkspaceGraph['dependencyEdges']): WorkspaceGraph['dependencyEdges'] { return [...new Map(edges.map(edge => [`${edge.source}:${edge.target}:${edge.kind}`, edge])).values()]; }
