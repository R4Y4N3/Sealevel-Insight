const fs = require('node:fs');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
// Derive the expected VSIX name from package metadata; no hardcoded version.
const root = path.resolve(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const archive = process.argv[2] || `sealevel-insight-${version}.vsix`;
if (!fs.existsSync(archive)) throw new Error(`Missing ${archive}`);
const listing = cp.execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
const manifest = JSON.parse(cp.execFileSync('unzip', ['-p', archive, 'extension/package.json'], { encoding: 'utf8' }));
const thirdPartyNotices = cp.execFileSync('unzip', ['-p', archive, 'extension/THIRD_PARTY_NOTICES.md'], { encoding: 'utf8' });
for (const required of ['extension/dist/extension.js', 'extension/dist/cli.js', 'extension/dist/tree-sitter.wasm', 'extension/dist/tree-sitter-rust.wasm', 'extension/dist/tree-sitter-solidity.wasm', 'extension/readme.md', 'extension/changelog.md', 'extension/LICENSE.txt', 'extension/THIRD_PARTY_NOTICES.md', 'extension/schemas/report.schema.json', 'extension/media/icon.png']) {
  if (!listing.split('\n').includes(required)) throw new Error(`VSIX missing ${required}`);
}
for (const [asset, expected] of Object.entries({
  'extension/dist/tree-sitter-rust.wasm': 'a96b69c6fdf9d75b7df225af7e3544443cbd91c518dff3d7864bbef2463f57f0',
  'extension/dist/tree-sitter-solidity.wasm': 'd6828119e6099d23a783c0e5486354b41523dfe4a1df5b3bc2b66105c3272d7f'
})) {
  const actual = crypto.createHash('sha256').update(cp.execFileSync('unzip', ['-p', archive, asset], { maxBuffer: 4 * 1024 * 1024 })).digest('hex');
  if (actual !== expected) throw new Error(`VSIX parser checksum mismatch for ${asset}: ${actual}`);
}
for (const unwanted of ['extension/.gitignore', 'extension/esbuild.mjs', 'extension/tsconfig.json', 'extension/scripts/smoke-wasm.js', 'extension/resources/parsers/tree-sitter-rust.wasm', 'extension/resources/parsers/tree-sitter-solidity.wasm', 'extension/dist/extension.js.map', 'extension/dist/cli.js.map', 'extension/test/fixtures/anchor-basic/lib.rs', 'extension/src/extension.ts']) {
  if (listing.split('\n').includes(unwanted)) throw new Error(`VSIX contains development artifact ${unwanted}`);
}
if (listing.split('\n').some(item => /extension\/.*\.vsix$/.test(item))) throw new Error('VSIX contains a nested or stale VSIX archive');
for (const prefix of ['extension/src/', 'extension/test/', 'extension/dist-test/', 'extension/dist-integration/', 'extension/.vscode-test/', 'extension/.real-world-cache/', 'extension/.sealevel-insight-cache/', 'extension/node_modules/', 'extension/scripts/']) {
  if (listing.split('\n').some(item => item.startsWith(prefix))) throw new Error(`VSIX contains development-only path ${prefix}`);
}
const activationEvents = new Set(manifest.activationEvents ?? []);
const expectedActivationEvents = [
  ...(manifest.contributes?.commands ?? []).map(command => `onCommand:${command.command}`),
  ...Object.values(manifest.contributes?.views ?? {}).flat().map(view => `onView:${view.id}`)
];
if (!expectedActivationEvents.length) throw new Error('VSIX manifest does not contribute any activatable commands or views');
for (const event of expectedActivationEvents) {
  if (!activationEvents.has(event)) throw new Error(`VSIX manifest missing explicit activation event ${event}`);
}
if (manifest.capabilities?.untrustedWorkspaces?.supported !== true) {
  throw new Error('VSIX manifest must explicitly support untrusted workspaces');
}
if (manifest.capabilities?.virtualWorkspaces?.supported !== false) {
  throw new Error('VSIX manifest must explicitly declare virtual workspaces unsupported');
}
if ('allowScripts' in manifest) throw new Error('VSIX manifest contains development-only allowScripts metadata');
for (const dependency of ['@iarna/toml', 'web-tree-sitter', 'tree-sitter-rust', 'tree-sitter-solidity']) {
  if (!thirdPartyNotices.includes(dependency)) throw new Error(`VSIX third-party notices omit bundled dependency ${dependency}`);
}
console.log(`verified ${archive} (v${version})`);
