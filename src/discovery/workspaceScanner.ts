import * as vscode from 'vscode';
import * as path from 'node:path';
import { SourceInput } from '../analysis/analyzer';
import { classifyPackage } from './cargoDiscovery';
import { buildCargoGraph } from './cargoGraph';
import { mapConcurrent } from '../utils/concurrency';
import { AnalysisDiagnostic } from '../model/report';
import { applyCargoMetadata } from './cargoMetadata';
import { DEFAULT_SOURCE_GLOBS, sourceLanguage } from '../analysis/sourceLanguage';

export async function scanWorkspace(): Promise<SourceInput[]> {
  const includes = vscode.workspace.getConfiguration('sealevelInsight').get<string[]>('includePatterns', DEFAULT_SOURCE_GLOBS);
  const excludes = vscode.workspace.getConfiguration('sealevelInsight').get<string[]>('excludePatterns', ['**/.git/**', '**/target/**', '**/node_modules/**', '**/.anchor/**', '**/.real-world-cache/**', '**/.sealevel-insight-cache/**', '**/.vscode-test/**', '**/dist/**', '**/dist-integration/**', '**/dist-test/**']);
  const configuredIncludes = Array.isArray(includes) ? includes.filter(pattern => typeof pattern === 'string' && pattern.length > 0) : DEFAULT_SOURCE_GLOBS;
  const validIncludes = [...new Set(configuredIncludes.flatMap(pattern => pattern.startsWith('**/') ? [pattern, pattern.slice(3)] : [pattern]))];
  const validExcludes = Array.isArray(excludes) ? excludes.filter(pattern => typeof pattern === 'string' && pattern.length > 0) : [];
  const exclude = validExcludes.length === 1 ? validExcludes[0] : `{${validExcludes.join(',')}}`;
  const uris = [...new Map((await Promise.all(validIncludes.map(pattern => vscode.workspace.findFiles(pattern, exclude)))).flat().map(uri => [uri.toString(), uri])).values()];
  const manifests = [...new Map((await Promise.all(['**/Cargo.toml', 'Cargo.toml'].map(pattern => vscode.workspace.findFiles(pattern, exclude)))).flat().map(uri => [uri.toString(), uri])).values()];
  const configuredConcurrency = vscode.workspace.getConfiguration('sealevelInsight').get<number>('analysisConcurrency', 0);
  const concurrency = configuredConcurrency && configuredConcurrency > 0 ? Math.floor(configuredConcurrency) : 8;
  const packages = new Map(await mapConcurrent(manifests, concurrency, async uri => [path.dirname(uri.fsPath), { uri, manifest: await readManifest(uri) }] as const));
  const sourceByDirectory = new Map<string, string[]>();
  const configuredMaxFileSize = vscode.workspace.getConfiguration('sealevelInsight').get<number>('maxFileSize', 5242880);
  const maxFileSize = Number.isFinite(configuredMaxFileSize) && configuredMaxFileSize > 0 ? configuredMaxFileSize : 5242880;
  const includeTests = vscode.workspace.getConfiguration('sealevelInsight').get<boolean>('includeTests', false);
  const scanDiagnostics: AnalysisDiagnostic[] = [];
  const results = await mapConcurrent(uris, concurrency, async uri => {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.size > maxFileSize) { scanDiagnostics.push({ id: `diagnostic:analysis:oversized:${uri.toString()}`, category: 'analysis', severity: 'info', message: `Skipped oversized source file (${stat.size} bytes > ${maxFileSize}).`, location: { uri: uri.toString(), startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }); return undefined; }
    const workspaceRelative = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
    if (!includeTests && /(^|\/)(tests?|benches?)(\/|$)/.test(workspaceRelative)) return undefined;
    const source = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    const directory = packageRootFor(uri, packages);
    const language = sourceLanguage(uri.fsPath); if (!language) return undefined;
    if (directory && language === 'rust') sourceByDirectory.set(directory, [...(sourceByDirectory.get(directory) ?? []), source]);
    const packageRoot = [...packages.keys()].filter(root => uri.fsPath.startsWith(`${root}${path.sep}`)).sort((a, b) => b.length - a.length)[0];
    const packageInfo = packageRoot ? packages.get(packageRoot) : undefined;
    const classification = classifyPackage(packageInfo?.manifest ?? '', source);
    return { uri: uri.toString(), source, language, packageName: packageInfo ? manifestName(packageInfo.manifest) : language === 'rust' ? packageName(uri.fsPath) : path.basename(path.dirname(uri.fsPath)) || 'workspace', packageKind: language === 'rust' ? classification.kind : 'solana-program' as const, packageEvidence: language === 'rust' ? classification.evidence : [{ description: `${language} source discovered by configured source patterns` }], manifestUri: packageInfo?.uri.toString() };
  });
  const allSourcePaths = uris.map(uri => uri.fsPath);
  const graph = buildCargoGraph([...packages.values()].map(item => ({ uri: item.uri.fsPath, text: item.manifest, fileUris: allSourcePaths.filter(file => file === path.join(path.dirname(item.uri.fsPath), 'build.rs') || file.startsWith(`${path.dirname(item.uri.fsPath)}${path.sep}`)) })), sourceByDirectory);
  const metadataSetting = vscode.workspace.getConfiguration('sealevelInsight').get<string>('cargoMetadataPath', '').trim();
  if (metadataSetting) {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
    const metadataPath = path.isAbsolute(metadataSetting) ? metadataSetting : path.resolve(workspaceRoot, metadataSetting);
    try { applyCargoMetadata(graph, JSON.parse(Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.file(metadataPath))).toString('utf8')), metadataPath); }
    catch (error) { graph.diagnostics.push({ id: `diagnostic:cargo:metadata:${metadataPath}`, category: 'cargo', severity: 'error', message: `Could not load saved Cargo metadata ${metadataPath}: ${error instanceof Error ? error.message : String(error)}`, location: { uri: metadataPath, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } }); }
  }
  graph.diagnostics.push(...scanDiagnostics.sort((a, b) => (a.location?.uri ?? '').localeCompare(b.location?.uri ?? '')));
  const discovered = results.filter((item): item is Exclude<typeof item, undefined> => item !== undefined);
  return discovered.map(item => { const pkg = graph.packages.find(pkg => pkg.manifestUri === item.manifestUri || pkg.name === item.packageName); return { ...item, packageId: pkg?.id, packageRoot: pkg?.rootUri, workspaceGraph: graph }; });
}

function packageRootFor(uri: vscode.Uri, packages: Map<string, { uri: vscode.Uri; manifest: string }>): string | undefined { return [...packages.keys()].filter(root => uri.fsPath.startsWith(`${root}${path.sep}`)).sort((a, b) => b.length - a.length)[0]; }

function packageName(filePath: string): string { return path.basename(path.dirname(path.dirname(filePath))) || 'workspace'; }
async function readManifest(uri: vscode.Uri): Promise<string> { return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'); }
function manifestName(manifest: string): string { return /^name\s*=\s*["']([^"']+)["']/m.exec(manifest)?.[1] ?? 'workspace'; }
