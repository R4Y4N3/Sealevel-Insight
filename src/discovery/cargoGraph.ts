import * as path from 'node:path';
import { parse } from '@iarna/toml';
import { AnalysisDiagnostic, CargoDependency, CargoFeature, CargoPackage, CargoTarget, CargoWorkspace, Evidence, PackageKind, WorkspaceGraph } from '../model/report';

export interface ManifestInput { uri: string; text: string; fileUris?: string[]; }
type Toml = Record<string, unknown>;
type ParseResult = ManifestInput & { data: Toml; error?: string };

export function buildCargoGraph(manifests: ManifestInput[], sourceByDirectory: Map<string, string[]>): WorkspaceGraph {
  const diagnostics: AnalysisDiagnostic[] = [];
  const parsed = manifests.map((manifest, index) => parseManifest(manifest, index, diagnostics));
  const manifestByRoot = new Map(parsed.map(item => [normalizePath(path.dirname(item.uri)), item]));
  const workspaceRoots = parsed.filter(item => item.data.workspace).sort((a, b) => normalizePath(path.dirname(a.uri)).localeCompare(normalizePath(path.dirname(b.uri))));
  const workspaces = workspaceRoots.map(item => makeWorkspace(item, manifestByRoot, diagnostics));
  const packages = parsed.filter(item => item.data.package).map(item => makePackage(item, sourceByDirectory, workspaceFor(item, workspaceRoots), diagnostics));
  diagnoseDuplicatePackages(packages, diagnostics);
  const packageIds = new Map(packages.map(item => [normalizePath(item.rootUri), item.id]));
  for (const pkg of packages) {
    for (const dependency of pkg.dependencies) {
      if (!dependency.path) continue;
      const targetRoot = normalizePath(path.resolve(pkg.rootUri, dependency.path));
      dependency.path = targetRoot;
      dependency.internalPackageId = packageIds.get(targetRoot);
      if (!dependency.internalPackageId) diagnostics.push(diagnostic('cargo', 'warning', `Path dependency ${dependency.name} from ${pkg.name} does not resolve to a discovered package: ${targetRoot}`, pkg.manifestUri, `path-dependency:${pkg.id}:${dependency.name}`));
    }
  }
  const dependencyEdges: WorkspaceGraph['dependencyEdges'] = [];
  for (const pkg of packages) for (const dep of pkg.dependencies) dependencyEdges.push(dep.internalPackageId ? { source: pkg.id, target: dep.internalPackageId, kind: 'internal' } : { source: pkg.id, target: `external:${dep.packageName ?? dep.name}`, kind: 'external' });
  return { workspaces, packages: packages.sort((a, b) => a.id.localeCompare(b.id)), dependencyEdges: dedupeEdges(dependencyEdges), diagnostics };
}

function parseManifest(manifest: ManifestInput, index: number, diagnostics: AnalysisDiagnostic[]): ParseResult {
  try { return { ...manifest, data: parse(manifest.text) as Toml }; }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    diagnostics.push(diagnostic('cargo', 'error', `Invalid Cargo manifest TOML: ${message}`, manifest.uri, `manifest:${index}`));
    return { ...manifest, data: {}, error: message };
  }
}

function makeWorkspace(item: ParseResult, manifests: Map<string, ParseResult>, diagnostics: AnalysisDiagnostic[]): CargoWorkspace {
  const root = normalizePath(path.dirname(item.uri));
  const workspace = object(item.data.workspace);
  const excluded = expandPatterns(root, strings(workspace.exclude), manifests, diagnostics, item.uri, false);
  const declaredMembers = strings(workspace.members);
  const members = expandPatterns(root, declaredMembers, manifests, diagnostics, item.uri, true).filter(member => !excluded.includes(member));
  if (item.data.package && !excluded.includes(root) && !members.includes(root)) members.push(root);
  const defaultPatterns = strings(workspace['default-members']);
  const defaultMembers = defaultPatterns.length ? expandPatterns(root, defaultPatterns, manifests, diagnostics, item.uri, true).filter(member => members.includes(member)) : [...members];
  return { rootUri: root, manifestUri: item.uri, members: [...new Set(members)].sort(), excluded: [...new Set(excluded)].sort(), defaultMembers: [...new Set(defaultMembers)].sort(), resolver: stringValue(workspace.resolver) };
}

function makePackage(item: ParseResult, sources: Map<string, string[]>, workspace: ParseResult | undefined, diagnostics: AnalysisDiagnostic[]): CargoPackage {
  const data = item.data;
  const packageData = object(data.package);
  const workspacePackage = object(object(workspace?.data.workspace).package);
  const inherited = (key: string): unknown => isWorkspaceTrue(packageData[key]) ? workspacePackage[key] : packageData[key];
  const name = stringValue(inherited('name')) ?? path.basename(path.dirname(item.uri));
  const rootUri = normalizePath(path.dirname(item.uri));
  const source = (sources.get(rootUri) ?? []).join('\n');
  const workspaceDependencies = object(object(workspace?.data.workspace).dependencies);
  const dependencies = dependencyEntries(data).map(entry => makeDependency(entry.name, entry.value, entry.kind, entry.targetCondition, workspaceDependencies, item, diagnostics));
  const targets = cargoTargets(data, name, rootUri, item.fileUris ?? [], diagnostics, item.uri);
  const features: CargoFeature[] = Object.entries(object(data.features)).map(([feature, value]) => ({ name: feature, enables: strings(value), evidence: [{ description: `Cargo feature ${feature}` }] })).sort((a, b) => a.name.localeCompare(b.name));
  const evidence: Evidence[] = [];
  if (hasEntrypoint(source)) evidence.push({ description: 'program entrypoint syntax' });
  if (hasProgramDependency(dependencies)) evidence.push({ description: 'Solana/framework dependency' });
  if (targets.some(target => target.crateTypes.includes('cdylib'))) evidence.push({ description: 'cdylib crate target' });
  const kind = classify(name, packageData, targets, dependencies, source);
  return {
    id: `cargo:${rootUri}`, name, manifestUri: item.uri, rootUri, kind,
    confidence: kind === 'solana-program' ? 0.95 : kind === 'unknown' ? 0.4 : 0.8,
    evidence, dependencies, targets, features,
    version: stringValue(inherited('version')), edition: stringValue(inherited('edition')),
    buildScript: typeof packageData.build === 'string' ? normalizePath(path.resolve(rootUri, packageData.build)) : packageData.build === false ? undefined : item.fileUris?.some(file => normalizePath(file) === normalizePath(path.join(rootUri, 'build.rs'))) ? normalizePath(path.join(rootUri, 'build.rs')) : undefined
  };
}

function workspaceFor(item: ParseResult, roots: ParseResult[]): ParseResult | undefined {
  const packageRoot = normalizePath(path.dirname(item.uri));
  return roots.filter(root => isWithin(packageRoot, normalizePath(path.dirname(root.uri)))).sort((a, b) => path.dirname(b.uri).length - path.dirname(a.uri).length)[0];
}

function cargoTargets(data: Toml, packageName: string, root: string, files: string[], diagnostics: AnalysisDiagnostic[], manifestUri: string): CargoTarget[] {
  const targets: CargoTarget[] = [];
  const add = (kind: CargoTarget['kind'], raw: unknown, fallbackName: string, fallbackPath: string) => {
    const spec = object(raw);
    const targetPath = normalizePath(path.resolve(root, stringValue(spec.path) ?? fallbackPath));
    const knownFiles = files.map(normalizePath);
    const valid = !knownFiles.length || knownFiles.includes(targetPath);
    if (!valid) diagnostics.push(diagnostic('cargo', 'warning', `Cargo ${kind} target path does not exist in discovered files: ${targetPath}`, manifestUri, `target:${kind}:${targetPath}`));
    targets.push({ name: stringValue(spec.name) ?? fallbackName, kind, path: targetPath, crateTypes: strings(spec['crate-type']), requiredFeatures: strings(spec['required-features']), valid, evidence: [{ description: `Cargo ${kind} target` }] });
  };
  if (data.lib || files.some(file => normalizePath(file) === normalizePath(path.join(root, 'src/lib.rs')))) add('lib', data.lib, packageName.replace(/-/g, '_'), 'src/lib.rs');
  const arrays: Array<[string, CargoTarget['kind'], string]> = [['bin', 'bin', 'src/main.rs'], ['example', 'example', 'examples/main.rs'], ['test', 'test', 'tests/main.rs'], ['bench', 'bench', 'benches/main.rs']];
  for (const [key, kind, fallback] of arrays) for (const item of arrayObjects(data[key])) add(kind, item, packageName, fallback);
  if (!targets.length && files.some(file => normalizePath(file) === normalizePath(path.join(root, 'src/main.rs')))) add('bin', {}, packageName, 'src/main.rs');
  if (files.some(file => normalizePath(file) === normalizePath(path.join(root, 'build.rs')))) add('build-script', { name: 'build-script', path: 'build.rs' }, 'build-script', 'build.rs');
  return targets.sort((a, b) => `${a.kind}:${a.name}`.localeCompare(`${b.kind}:${b.name}`));
}

type DependencyEntry = { name: string; value: unknown; kind: CargoDependency['kind']; targetCondition?: string };
function dependencyEntries(data: Toml): DependencyEntry[] {
  const direct = sections(data);
  const targeted = Object.entries(object(data.target)).flatMap(([condition, target]) => sections(object(target), condition));
  return [...direct, ...targeted];
}
function sections(data: Toml, targetCondition?: string): DependencyEntry[] {
  return (['dependencies', 'dev-dependencies', 'build-dependencies'] as const).flatMap(section => Object.entries(object(data[section])).map(([name, value]) => ({ name, value, kind: section === 'dependencies' ? 'normal' as const : section === 'dev-dependencies' ? 'dev' as const : 'build' as const, targetCondition })));
}
function makeDependency(name: string, value: unknown, kind: CargoDependency['kind'], targetCondition: string | undefined, workspaceDependencies: Toml, manifest: ParseResult, diagnostics: AnalysisDiagnostic[]): CargoDependency {
  const original = object(value);
  const workspaceInherited = original.workspace === true;
  const inheritedValue = workspaceInherited ? workspaceDependencies[name] : undefined;
  if (workspaceInherited && inheritedValue === undefined) diagnostics.push(diagnostic('cargo', 'warning', `Dependency ${name} uses workspace = true but is absent from [workspace.dependencies].`, manifest.uri, `workspace-dependency:${name}`));
  const inherited = object(inheritedValue);
  const spec = { ...inherited, ...original };
  delete spec.workspace;
  return {
    name, packageName: stringValue(spec.package), version: typeof value === 'string' ? value : typeof inheritedValue === 'string' ? inheritedValue : stringValue(spec.version),
    path: stringValue(spec.path), optional: spec.optional === true, features: strings(spec.features), defaultFeatures: spec['default-features'] !== false,
    workspaceInherited, targetCondition, kind, evidence: [{ description: `Cargo ${kind} dependency${targetCondition ? ` for ${targetCondition}` : ''}${workspaceInherited ? ' inherited from workspace' : ''}` }]
  };
}

function classify(name: string, packageData: Toml, targets: CargoTarget[], dependencies: CargoDependency[], source: string): PackageKind {
  if (/(^|[-_])(test|tests|bench|benches)$/.test(name) || targets.length > 0 && targets.every(target => target.kind === 'test' || target.kind === 'bench')) return 'test';
  if (/generated|codegen|client-gen/i.test(name)) return 'generated';
  if (targets.some(target => target.kind === 'build-script') && !targets.some(target => target.kind === 'lib' || target.kind === 'bin')) return 'build-tool';
  const entrypoint = hasEntrypoint(source);
  const cdylib = targets.some(target => target.crateTypes.includes('cdylib'));
  const solana = hasProgramDependency(dependencies);
  if (entrypoint || (cdylib && solana)) return 'solana-program';
  if (solana && targets.some(target => target.kind === 'lib')) return 'program-library';
  if (targets.some(target => target.kind === 'bin') || /client|cli|sdk/i.test(name)) return 'client';
  if (targets.some(target => target.kind === 'lib') || Object.keys(packageData).length) return 'library';
  return 'unknown';
}

function expandPatterns(root: string, patterns: string[], manifests: Map<string, ParseResult>, diagnostics: AnalysisDiagnostic[], manifestUri: string, reportMissing: boolean): string[] {
  return patterns.flatMap(pattern => {
    const regex = globRegex(normalizePath(path.resolve(root, pattern)));
    const matches = [...manifests.keys()].filter(candidate => regex.test(candidate));
    if (reportMissing && !matches.length) diagnostics.push(diagnostic('cargo', 'warning', `Cargo workspace member pattern matched no discovered manifest: ${pattern}`, manifestUri, `member:${pattern}`));
    return matches;
  });
}

function globRegex(pattern: string): RegExp {
  let expression = '^';
  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index];
    if (char === '*' && pattern[index + 1] === '*') { index++; expression += '.*'; }
    else if (char === '*') expression += '[^/]*';
    else if (char === '?') expression += '[^/]';
    else expression += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`${expression}$`);
}

function diagnoseDuplicatePackages(packages: CargoPackage[], diagnostics: AnalysisDiagnostic[]): void {
  const identities = new Map<string, CargoPackage[]>();
  for (const pkg of packages) { const key = `${pkg.name}@${pkg.version ?? '<unknown>'}`; identities.set(key, [...(identities.get(key) ?? []), pkg]); }
  for (const [identity, matches] of identities) if (matches.length > 1) diagnostics.push(diagnostic('cargo', 'warning', `Duplicate Cargo package identity ${identity}: ${matches.map(item => item.manifestUri).join(', ')}`, matches[0].manifestUri, `duplicate:${identity}`));
}

function diagnostic(category: AnalysisDiagnostic['category'], severity: AnalysisDiagnostic['severity'], message: string, uri: string, key: string): AnalysisDiagnostic { return { id: `diagnostic:${category}:${key}`, category, severity, message, location: { uri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }; }
function object(value: unknown): Toml { return value && typeof value === 'object' && !Array.isArray(value) ? value as Toml : {}; }
function arrayObjects(value: unknown): Toml[] { return Array.isArray(value) ? value.map(object) : value && typeof value === 'object' ? [object(value)] : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : typeof value === 'string' ? [value] : []; }
function stringValue(value: unknown): string | undefined { return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined; }
function isWorkspaceTrue(value: unknown): boolean { return object(value).workspace === true; }
function hasProgramDependency(deps: CargoDependency[]): boolean { return deps.some(dep => /^(anchor-lang|pinocchio|solana-program|solana_program|solana-account-info|solana_account_info|solana-program-entrypoint|solana_program_entrypoint|steel|quasar-lang)$/i.test(dep.packageName ?? dep.name)); }
function hasEntrypoint(source: string): boolean { return /entrypoint!|program_entrypoint!|lazy_program_entrypoint!|process_instruction|process_entrypoint|#\[program\]/.test(source); }
function isWithin(candidate: string, root: string): boolean { const relative = path.relative(root, candidate); return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)); }
function normalizePath(value: string): string { return path.resolve(value).split(path.sep).join('/'); }
function dedupeEdges(edges: WorkspaceGraph['dependencyEdges']): WorkspaceGraph['dependencyEdges'] { return [...new Map(edges.map(edge => [`${edge.source}:${edge.target}:${edge.kind}`, edge])).values()].sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`)); }
