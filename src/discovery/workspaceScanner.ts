import * as vscode from 'vscode';
import * as path from 'node:path';
import { RustSourceInput } from '../analysis/analyzer';
import { classifyPackage } from './cargoDiscovery';

export async function scanWorkspace(): Promise<RustSourceInput[]> {
  const includes = vscode.workspace.getConfiguration('sealevelInsight').get<string[]>('includePatterns', ['**/*.rs']);
  const excludes = vscode.workspace.getConfiguration('sealevelInsight').get<string[]>('excludePatterns', ['**/.git/**', '**/target/**', '**/node_modules/**', '**/.anchor/**', '**/dist/**', '**/dist-test/**']);
  const validIncludes = Array.isArray(includes) ? includes.filter(pattern => typeof pattern === 'string' && pattern.length > 0) : ['**/*.rs'];
  const validExcludes = Array.isArray(excludes) ? excludes.filter(pattern => typeof pattern === 'string' && pattern.length > 0) : [];
  const exclude = validExcludes.length === 1 ? validExcludes[0] : `{${validExcludes.join(',')}}`;
  const uris = await vscode.workspace.findFiles(validIncludes.length === 1 ? validIncludes[0] : `{${validIncludes.join(',')}}`, exclude);
  const manifests = await vscode.workspace.findFiles('**/Cargo.toml', exclude);
  const packages = new Map(await Promise.all(manifests.map(async uri => [path.dirname(uri.fsPath), { uri, manifest: await readManifest(uri) }] as const)));
  return Promise.all(uris.map(async uri => {
    const source = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    const packageRoot = [...packages.keys()].filter(root => uri.fsPath.startsWith(`${root}${path.sep}`)).sort((a, b) => b.length - a.length)[0];
    const packageInfo = packageRoot ? packages.get(packageRoot) : undefined;
    const classification = classifyPackage(packageInfo?.manifest ?? '', source);
    return { uri: uri.toString(), source, packageName: packageInfo ? manifestName(packageInfo.manifest) : packageName(uri.fsPath), packageKind: classification.kind, packageEvidence: classification.evidence, manifestUri: packageInfo?.uri.toString() };
  }));
}

function packageName(filePath: string): string { return path.basename(path.dirname(path.dirname(filePath))) || 'workspace'; }
async function readManifest(uri: vscode.Uri): Promise<string> { return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'); }
function manifestName(manifest: string): string { return /^name\s*=\s*["']([^"']+)["']/m.exec(manifest)?.[1] ?? 'workspace'; }
