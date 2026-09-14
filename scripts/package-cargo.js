#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const crate = path.join(root, 'cargo', 'sealevel-insight');
const cargoManifest = fs.readFileSync(path.join(crate, 'Cargo.toml'), 'utf8');
const version = cargoManifest.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (!version) throw new Error('Cargo.toml is missing a package version.');
if (version !== packageJson.version) throw new Error(`Cargo version ${version} does not match npm/CLI version ${packageJson.version}.`);
const launcherSource = fs.readFileSync(path.join(crate, 'src', 'main.rs'), 'utf8');
const launcherVersion = launcherSource.match(/^const VERSION: &str = "([^"]+)";/m)?.[1];
if (launcherVersion !== version) throw new Error(`Cargo launcher version ${launcherVersion ?? '(missing)'} does not match Cargo version ${version}.`);

const sourceDist = path.join(root, 'dist');
const targetDist = path.join(crate, 'assets');
const assets = ['cli.js', 'tree-sitter.wasm', 'tree-sitter-rust.wasm', 'tree-sitter-solidity.wasm'];
for (const asset of assets) {
  const source = path.join(sourceDist, asset);
  const target = path.join(targetDist, asset);
  if (!fs.existsSync(source)) throw new Error(`Missing ${source}; run npm run build first.`);
  fs.copyFileSync(source, target);
}

for (const file of ['LICENSE', 'SECURITY.md', 'SUPPORT.md', 'THIRD_PARTY_NOTICES.md']) {
  fs.copyFileSync(path.join(root, file), path.join(crate, file));
}
fs.copyFileSync(path.join(root, 'npm', 'DISCLOSURE'), path.join(crate, 'DISCLOSURE'));
console.log(`prepared Cargo crate ${packageJson.name} v${version} with ${assets.length} embedded runtime assets`);
