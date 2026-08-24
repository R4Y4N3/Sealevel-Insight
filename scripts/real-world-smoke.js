const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const cacheRoot = path.join(repositoryRoot, '.real-world-cache');
const projects = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'test/real-world/projects.json'), 'utf8'));
fs.mkdirSync(cacheRoot, { recursive: true });

const checkouts = new Map();
const results = [];
for (const project of projects) {
  const key = `${slug(project.repository)}-${project.commit.slice(0, 12)}`;
  let checkout = checkouts.get(key);
  if (!checkout) {
    checkout = path.join(cacheRoot, key);
    ensureCheckout(project.repository, project.commit, checkout);
    checkouts.set(key, checkout);
  }
  const target = path.resolve(checkout, project.path);
  if (!target.startsWith(`${checkout}${path.sep}`) && target !== checkout) throw new Error(`${project.name}: target escapes pinned checkout`);
  const args = [path.join(repositoryRoot, 'dist/cli.js'), 'analyze', target, '--format', 'json', '--no-cache', '--disable-idl', '--exclude', '**/tests/**'];
  for (const include of project.include ?? []) args.push('--include', include);
  const raw = cp.execFileSync(process.execPath, args, { encoding: 'utf8', cwd: repositoryRoot, maxBuffer: 64 * 1024 * 1024 });
  const report = JSON.parse(raw);
  const instructions = report.programs.flatMap(program => program.instructions.map(item => item.name));
  const frameworks = new Set(report.programs.flatMap(program => program.frameworkEvidence.map(item => item.framework)));
  const calls = report.programs.flatMap(program => program.callGraph?.calls ?? []);
  const resolvedCalls = calls.filter(call => call.status === 'resolved').length;
  const failures = [];
  if (!frameworks.has(project.framework)) failures.push(`framework ${project.framework} was not detected (${[...frameworks].join(', ') || 'none'})`);
  for (const [metric, minimum] of Object.entries(project.minimum)) {
    const actual = metric === 'programs' ? report.programs.length : report.summary[metric];
    if (typeof actual !== 'number' || actual < minimum) failures.push(`${metric} ${actual} < ${minimum}`);
  }
  for (const instruction of project.knownInstructions) if (!instructions.includes(instruction)) failures.push(`missing instruction ${instruction}`);
  if (report.diagnostics.some(item => /Tree-sitter returned no syntax tree|parser runtime|filename.*undefined/i.test(item))) failures.push('parser/runtime diagnostic was emitted');
  const coverage = Object.fromEntries(Object.entries(report.coverage ?? {}).filter(([, value]) => value && typeof value === 'object' && 'resolved' in value).map(([name, value]) => [name, `${value.resolved}/${value.total}`]));
  const result = {
    repository: project.repository,
    commit: project.commit,
    framework: project.framework,
    programCount: report.programs.length,
    instructionCount: report.summary.instructions,
    accountCount: report.summary.accounts,
    cpiCount: report.summary.cpis,
    pdaCount: report.summary.pdas,
    resolvedCallRatio: `${resolvedCalls}/${calls.length}`,
    semanticCoverage: coverage,
    diagnosticCount: report.analysisDiagnostics?.length ?? report.diagnostics.length,
    status: failures.length ? 'fail' : 'pass'
  };
  results.push(result);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (failures.length) throw new Error(`${project.name}: ${failures.join('; ')}`);
}
process.stdout.write(`real-world validation passed: ${results.length}/${projects.length} pinned targets\n`);

function ensureCheckout(repository, commit, directory) {
  if (!fs.existsSync(path.join(directory, '.git'))) cp.execFileSync('git', ['clone', '--filter=blob:none', '--no-checkout', repository, directory], { stdio: 'inherit' });
  let current = '';
  try { current = cp.execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* no checkout yet */ }
  if (current !== commit || !fs.existsSync(path.join(directory, '.git', 'index'))) {
    try { cp.execFileSync('git', ['-C', directory, 'cat-file', '-e', `${commit}^{commit}`]); }
    catch { cp.execFileSync('git', ['-C', directory, 'fetch', '--depth=1', 'origin', commit], { stdio: 'inherit' }); }
    cp.execFileSync('git', ['-C', directory, 'checkout', '--detach', commit], { stdio: 'inherit' });
  }
  const verified = cp.execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (verified !== commit) throw new Error(`Pinned checkout mismatch for ${repository}: ${verified} != ${commit}`);
}
function slug(repository) { return repository.replace(/\.git$/, '').split('/').slice(-2).join('-').replace(/[^A-Za-z0-9_.-]/g, '-'); }
