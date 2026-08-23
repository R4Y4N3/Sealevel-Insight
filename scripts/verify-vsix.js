const fs = require('node:fs');
const cp = require('node:child_process');
const archive = process.argv[2] || 'sealevel-insight-0.5.0.vsix';
if (!fs.existsSync(archive)) throw new Error(`Missing ${archive}`);
const listing = cp.execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
for (const required of ['extension/dist/extension.js', 'extension/dist/cli.js', 'extension/dist/tree-sitter.wasm', 'extension/dist/tree-sitter-rust.wasm', 'extension/readme.md', 'extension/changelog.md', 'extension/LICENSE.txt', 'extension/THIRD_PARTY_NOTICES.md']) {
  if (!listing.split('\n').includes(required)) throw new Error(`VSIX missing ${required}`);
}
for (const unwanted of ['extension/.gitignore', 'extension/esbuild.mjs', 'extension/tsconfig.json', 'extension/scripts/smoke-wasm.js', 'extension/resources/parsers/tree-sitter-rust.wasm', 'extension/dist/extension.js.map', 'extension/dist/cli.js.map']) {
  if (listing.split('\n').includes(unwanted)) throw new Error(`VSIX contains development artifact ${unwanted}`);
}
console.log(`verified ${archive}`);
