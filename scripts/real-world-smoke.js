const path = require('node:path');
const cp = require('node:child_process');

const root = process.env.SEALEVEL_REAL_WORLD_ROOT;
if (!root) {
  console.log('real-world validation skipped: set SEALEVEL_REAL_WORLD_ROOT to a pinned local checkout');
  process.exit(0);
}
const output = cp.execFileSync(process.execPath, [path.resolve('dist/cli.js'), 'analyze', path.resolve(root), '--format', 'json'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const report = JSON.parse(output);
if (!Array.isArray(report.programs) || report.diagnostics.some(item => /Tree-sitter|parser/i.test(item))) throw new Error('real-world analysis produced invalid diagnostics');
console.log(`real-world validation passed: ${report.programs.length} packages/program groups`);