const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rootManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const output = path.join(root, 'dist-cli-package');
const dist = path.join(output, 'dist');

function normalizedRepository(value) {
  if (!value) return value;
  if (typeof value === 'string') return value;
  if (!value.url) return value;
  const url = value.url.startsWith('git+') ? value.url : `git+${value.url}`;
  return { ...value, url: url.endsWith('.git') ? url : `${url}.git` };
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const file of ['cli.js', 'tree-sitter.wasm', 'tree-sitter-rust.wasm', 'tree-sitter-solidity.wasm']) {
  const source = path.join(root, 'dist', file);
  if (!fs.existsSync(source)) throw new Error(`Missing build output ${source}; run npm run build first.`);
  fs.copyFileSync(source, path.join(dist, file));
}
fs.chmodSync(path.join(dist, 'cli.js'), 0o755);

const manifest = {
  name: 'sealevel-insight',
  version: rootManifest.version,
  description: 'Local, deterministic architecture and code-metrics CLI for Solana programs.',
  license: 'MIT',
  repository: normalizedRepository(rootManifest.repository),
  homepage: rootManifest.homepage,
  bugs: rootManifest.bugs,
  engines: { node: '>=18' },
  bin: { 'sealevel-insight': 'dist/cli.js' },
  files: [
    'dist/cli.js',
    'dist/tree-sitter.wasm',
    'dist/tree-sitter-rust.wasm',
    'dist/tree-sitter-solidity.wasm',
    'README.md',
    'DISCLOSURE',
    'LICENSE',
    'SECURITY.md',
    'SUPPORT.md',
    'THIRD_PARTY_NOTICES.md'
  ],
  contentPolicy: { class: 'dual-use' }
};
fs.writeFileSync(path.join(output, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);

for (const file of ['LICENSE', 'SECURITY.md', 'SUPPORT.md', 'THIRD_PARTY_NOTICES.md']) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
for (const file of ['README.md', 'DISCLOSURE']) {
  fs.copyFileSync(path.join(root, 'npm', file), path.join(output, file));
}

console.log(`prepared ${path.relative(root, output)} v${manifest.version}`);
