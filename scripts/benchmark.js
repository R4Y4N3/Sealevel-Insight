const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sealevel-insight-benchmark-'));
const cli = path.resolve(__dirname, '../dist/cli.js');
const results = [];
try {
  for (const count of [100, 500, 1000]) {
    const project = path.join(root, `files-${count}`); const sourceRoot = path.join(project, 'src'); fs.mkdirSync(sourceRoot, { recursive: true });
    fs.writeFileSync(path.join(project, 'Cargo.toml'), `[package]\nname = "benchmark-${count}"\nversion = "0.1.0"\nedition = "2021"\n[lib]\ncrate-type = ["cdylib", "lib"]\n`);
    for (let index = 0; index < count; index++) fs.writeFileSync(path.join(sourceRoot, `module_${String(index).padStart(4, '0')}.rs`), `pub fn handler_${index}(value: u64) -> u64 {\n    if value > ${index} { helper_${index}(value) } else { 0 }\n}\nfn helper_${index}(value: u64) -> u64 { value.saturating_add(${index}) }\n`);
    run(['cache', 'clear', project]);
    const coldStart = process.hrtime.bigint(); run(['analyze', project, '--format', 'json', '--no-cache', '--output', path.join(project, 'cold.json')]); const coldMs = elapsed(coldStart);
    run(['analyze', project, '--format', 'json', '--output', path.join(project, 'seed.json')]);
    const warmStart = process.hrtime.bigint(); run(['analyze', project, '--format', 'json', '--output', path.join(project, 'warm.json')]); const warmMs = elapsed(warmStart);
    const result = { files: count, coldMs, warmCachedMs: warmMs, coldFilesPerSecond: round(count / (coldMs / 1000)), warmFilesPerSecond: round(count / (warmMs / 1000)) };
    results.push(result); process.stdout.write(`${JSON.stringify(result)}\n`);
  }
  process.stdout.write(`${JSON.stringify({ benchmark: results }, null, 2)}\n`);
} finally { fs.rmSync(root, { recursive: true, force: true }); }

function run(args) { cp.execFileSync(process.execPath, [cli, ...args], { stdio: 'ignore', maxBuffer: 64 * 1024 * 1024 }); }
function elapsed(start) { return round(Number(process.hrtime.bigint() - start) / 1e6); }
function round(value) { return Math.round(value * 10) / 10; }
