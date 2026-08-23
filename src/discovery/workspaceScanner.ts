import * as vscode from 'vscode';
import { RustSourceInput } from '../analysis/analyzer';
import { classifyPackage } from './cargoDiscovery';

export async function scanWorkspace(): Promise<RustSourceInput[]> {
  const uris = await vscode.workspace.findFiles('**/*.rs', '{.git,target,node_modules,.anchor}/**');
  const manifests = await vscode.workspace.findFiles('**/Cargo.toml', '{.git,target,node_modules,.anchor}/**');
  const packages = new Map(await Promise.all(manifests.map(async uri => [uri.fsPath.replace(/\/Cargo\.toml$/, ''), { uri, manifest: await readManifest(uri) }] as const)));
  return Promise.all(uris.map(async uri => {
    const source = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    const packageRoot = [...packages.keys()].filter(root => uri.fsPath.startsWith(`${root}/`)).sort((a, b) => b.length - a.length)[0];
    const packageInfo = packageRoot ? packages.get(packageRoot) : undefined;
    const classification = classifyPackage(packageInfo?.manifest ?? '', source);
    return { uri: uri.toString(), source, packageName: packageInfo ? manifestName(packageInfo.manifest) : packageName(uri.fsPath), packageKind: classification.kind, packageEvidence: classification.evidence, manifestUri: packageInfo?.uri.toString() };
  }));
}

function packageName(filePath: string): string { return filePath.split('/').slice(-3, -2)[0] || 'workspace'; }
async function readManifest(uri: vscode.Uri): Promise<string> { return Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'); }
function manifestName(manifest: string): string { return /^name\s*=\s*["']([^"']+)["']/m.exec(manifest)?.[1] ?? 'workspace'; }
