const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
// Derive the expected VSIX name from package metadata; no hardcoded version.
const root = path.resolve(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const archive = process.argv[2] || `sealevel-insight-${version}.vsix`;
if (!fs.existsSync(archive)) throw new Error(`Missing ${archive}`);
const listing = cp.execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
const manifest = JSON.parse(cp.execFileSync('unzip', ['-p', archive, 'extension/package.json'], { encoding: 'utf8' }));
for (const required of ['extension/dist/extension.js', 'extension/dist/cli.js', 'extension/dist/tree-sitter.wasm', 'extension/dist/tree-sitter-rust.wasm', 'extension/readme.md', 'extension/changelog.md', 'extension/LICENSE.txt', 'extension/THIRD_PARTY_NOTICES.md', 'extension/schemas/report.schema.json', 'extension/media/icon.png']) {
  if (!listing.split('\n').includes(required)) throw new Error(`VSIX missing ${required}`);
}
for (const unwanted of ['extension/.gitignore', 'extension/esbuild.mjs', 'extension/tsconfig.json', 'extension/scripts/smoke-wasm.js', 'extension/resources/parsers/tree-sitter-rust.wasm', 'extension/dist/extension.js.map', 'extension/dist/cli.js.map', 'extension/test/fixtures/anchor-basic/lib.rs', 'extension/src/extension.ts']) {
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
console.log(`verified ${archive} (v${version})`);
