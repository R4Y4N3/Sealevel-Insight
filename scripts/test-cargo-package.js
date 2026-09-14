#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = path.join(root, 'cargo', 'sealevel-insight', 'Cargo.toml');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run('cargo', ['check', '--manifest-path', manifest]);
run('cargo', ['test', '--manifest-path', manifest]);
run('cargo', ['run', '--quiet', '--manifest-path', manifest, '--', '--version']);
run('cargo', ['run', '--quiet', '--manifest-path', manifest, '--', '--help']);

const analysis = spawnSync(
  'cargo',
  ['run', '--quiet', '--manifest-path', manifest, '--', 'analyze', 'test/fixtures/anchor-basic', '--no-cache', '--format', 'json'],
  { cwd: root, encoding: 'utf8' },
);
if (analysis.error) throw analysis.error;
if (analysis.status !== 0) {
  process.stderr.write(analysis.stderr ?? '');
  process.exit(analysis.status ?? 1);
}
const report = JSON.parse(analysis.stdout);
if (report.schemaVersion !== '0.8.1' || !Array.isArray(report.programs) || report.programs.length === 0) {
  throw new Error('Cargo launcher fixture analysis did not produce the expected 0.8.1 report.');
}
console.log(`validated Cargo launcher fixture analysis (${report.programs.length} program${report.programs.length === 1 ? '' : 's'})`);

const packageResult = spawnSync('cargo', ['package', '--manifest-path', manifest, '--allow-dirty'], { cwd: root, encoding: 'utf8' });
process.stdout.write(packageResult.stdout ?? '');
process.stderr.write(packageResult.stderr ?? '');
if (packageResult.status !== 0) process.exit(packageResult.status ?? 1);

const crateRoot = path.dirname(manifest);
const packageDir = path.join(crateRoot, 'target', 'package');
const artifacts = fs.readdirSync(packageDir).filter(file => file.endsWith('.crate'));
if (artifacts.length !== 1) throw new Error(`Expected one Cargo package artifact in ${packageDir}, found ${artifacts.length}.`);
const artifact = path.join(packageDir, artifacts[0]);
const size = fs.statSync(artifact).size;
if (size >= 10 * 1024 * 1024) throw new Error(`Cargo package is ${size} bytes; crates.io limit is 10 MiB.`);
console.log(`validated Cargo package ${artifacts[0]} (${size} bytes)`);
