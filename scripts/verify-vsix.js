const fs = require('node:fs');
const cp = require('node:child_process');
const archive = process.argv[2] || 'sealevel-insight-0.4.0.vsix';
if (!fs.existsSync(archive)) throw new Error(`Missing ${archive}`);
const listing = cp.execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' });
for (const required of ['extension/dist/extension.js', 'extension/dist/cli.js', 'extension/dist/tree-sitter.wasm', 'extension/dist/tree-sitter-rust.wasm', 'extension/readme.md', 'extension/changelog.md', 'extension/LICENSE.txt']) {
  if (!listing.split('\n').includes(required)) throw new Error(`VSIX missing ${required}`);
}
console.log(`verified ${archive}`);
