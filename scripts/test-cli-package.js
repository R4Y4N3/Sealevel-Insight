const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..');
const packageDir = path.join(root, 'dist-cli-package');
const packageManifestPath = path.join(packageDir, 'package.json');
if (!fs.existsSync(packageManifestPath)) cp.execFileSync(process.execPath, [path.join(root, 'scripts', 'package-cli.js')], { stdio: 'inherit' });

const manifest = JSON.parse(fs.readFileSync(packageManifestPath, 'utf8'));
const expectedFiles = new Set([
  'package.json',
  'README.md',
  'DISCLOSURE',
  'LICENSE',
  'SECURITY.md',
  'SUPPORT.md',
  'THIRD_PARTY_NOTICES.md',
  'dist/cli.js',
  'dist/tree-sitter.wasm',
  'dist/tree-sitter-rust.wasm',
  'dist/tree-sitter-solidity.wasm'
]);
for (const file of expectedFiles) if (!fs.existsSync(path.join(packageDir, file))) throw new Error(`CLI package missing ${file}`);
if (manifest.main || manifest.extensionPack || manifest.activationEvents || manifest.contributes) throw new Error('CLI package contains VS Code-only manifest fields');
if (manifest.contentPolicy?.class !== 'dual-use') throw new Error('CLI package must declare its dual-use content policy');

const dryRun = cp.execFileSync('npm', ['pack', packageDir, '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' });
const jsonStart = dryRun.indexOf('[');
if (jsonStart < 0) throw new Error(`Could not parse npm pack output: ${dryRun}`);
const pack = JSON.parse(dryRun.slice(jsonStart));
const files = new Set(pack[0]?.files?.map(item => item.path) ?? []);
for (const file of expectedFiles) if (!files.has(file)) throw new Error(`npm tarball missing ${file}`);
for (const file of files) if (!expectedFiles.has(file)) throw new Error(`npm tarball contains unexpected file ${file}`);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sealevel-insight-cli-'));
try {
  cp.execFileSync('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', temp, packageDir], { cwd: root, stdio: 'pipe' });
  const bin = path.join(temp, 'node_modules', '.bin', process.platform === 'win32' ? 'sealevel-insight.cmd' : 'sealevel-insight');
  const help = cp.execFileSync(bin, ['--help'], { encoding: 'utf8' });
  if (!help.includes('sealevel-insight analyze')) throw new Error('Installed CLI did not print its usage');
  const report = path.join(temp, 'report.json');
  cp.execFileSync(bin, ['analyze', path.join(root, 'test', 'fixtures', 'anchor-basic'), '--no-cache', '--output', report], { cwd: root, stdio: 'pipe' });
  const value = JSON.parse(fs.readFileSync(report, 'utf8'));
  if (value.schemaVersion !== manifest.version || value.programs?.length !== 1 || value.summary?.instructions !== 1) throw new Error('Installed CLI fixture analysis did not produce the expected report');
  console.log(`validated npm CLI package v${manifest.version}: ${files.size} files, clean install and fixture analysis passed`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
