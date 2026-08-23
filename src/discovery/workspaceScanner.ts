import * as vscode from 'vscode';
import * as path from 'node:path';
import { RustSourceInput } from '../analysis/analyzer';
import { classifyPackage } from './cargoDiscovery';
import { buildCargoGraph } from './cargoGraph';

export async function scanWorkspace(): Promise<RustSourceInput[]> {
  const includes = vscode.workspace.getConfiguration('sealevelInsight').get<string[]>('includePatterns', ['**/*.rs']);
  const excludes = vscode.workspace.getConfiguration('sealevelInsight').get<string[]>('excludePatterns', ['**/.git/**', '**/target/**', '**/node_modules/**', '**/.anchor/**', '**/dist/**', '**/dist-test/**']);
  const validIncludes = Array.isArray(includes) ? includes.filter(pattern => typeof pattern === 'string' && pattern.length > 0) : ['**/*.rs'];
  const validExcludes = Array.isArray(excludes) ? excludes.filter(pattern => typeof pattern === 'string' && pattern.length > 0) : [];
  const exclude = validExcludes.length === 1 ? validExcludes[0] : `{${validExcludes.join(',')}}`;
  const uris = await vscode.workspace.findFiles(validIncludes.length === 1 ? validIncludes[0] : `{${validIncludes.join(',')}}`, exclude);
  const manifests = await vscode.workspace.findFiles('**/Cargo.toml', exclude);
  const packages = new Map(await Promise.all(manifests.map(async uri => [path.dirname(uri.fsPath), { uri, manifest: await readManifest(uri) }] as const)));
  const sourceByDirectory = new Map<string, string[]>();
  const maxFileSize = Math.max(1, vscode.workspace.getConfiguration('sealevelInsight').get<number>('maxFileSize', 5242880));
  const includeTests = vscode.workspace.getConfiguration('sealevelInsight').get<boolean>('includeTests', false);
  const results: Array<RustSourceInput | undefined> = await Promise.all(uris.map(async uri => {
    const stat = await vscode.workspace.fs.stat(uri);
    if (stat.size > maxFileSize || (!includeTests && /(^|\/)(tests?|benches?)\//.test(uri.path))) return undefined;
    const source = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    const directory = packageRootFor(uri, packages);
    if (directory) sourceByDirectory.set(directory, [...(sourceByDirectory.get(directory) ?? []), source]);
    const packageRoot = [...packages.keys()].filter(root => uri.fsPath.startsWith(`${root}${path.sep}`)).sort((a, b) => b.length - a.length)[0];
    const packageInfo = packageRoot ? packages.get(packageRoot) : undefined;
    const classification = classifyPackage(packageInfo?.manifest ?? '', source);
    return { uri: uri.toString(), source, packageName: packageInfo ? manifestName(packageInfo.manifest) : packageName(uri.fsPath), packageKind: classification.kind, packageEvidence: classification.evidence, manifestUri: packageInfo?.uri.toString() };
  }));
  const graph = buildCargoGraph([...packages.values()].map(item => ({ uri: item.uri.fsPath, text: item.manifest })), sourceByDirectory);
  return results.filter((item): item is RustSourceInput => item !== undefined).map(item => ({ ...item, workspaceGraph: graph }));
}

function packageRootFor(uri: vscode.Uri, packages: Map<string, { uri: vscode.Uri; manifest: string }>): string | undefined { return [...packages.keys()].filter(root => uri.fsPath.startsWith(`${root}${path.sep}`)).sort((a, b) => b.length - a.length)[0]; }

function packageName(filePath: string): string { return path.basename(path.dirname(path.dirname(filePath))) || 'workspace'; }
async function readManifest(uri: vscode.Uri): Promise<string> { return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'); }
function manifestName(manifest: string): string { return /^name\s*=\s*["']([^"']+)["']/m.exec(manifest)?.[1] ?? 'workspace'; }
