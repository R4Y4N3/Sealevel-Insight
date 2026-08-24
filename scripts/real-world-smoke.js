const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const cacheRoot = path.resolve(process.env.SEALEVEL_REAL_WORLD_ROOT || path.join(repositoryRoot, '.real-world-cache'));
const quicknode = { repository: 'https://github.com/quicknode/solana-program-examples.git', commit: '53e30d4116bbcf900820bb1c2eb7c2a9bfc7bbc8' };
const foundation = { repository: 'https://github.com/solana-foundation/program-examples.git', commit: '491e195f6f98e6ba2f6913c261dbdaa1676c9a04' };
const steel = { repository: 'https://github.com/regolith-labs/steel.git', commit: '59f8e9a5633dc6a3b0f5acfb44693e935e257024' };
const expectationDirectory = path.join(repositoryRoot, 'test/real-world/expectations');
fs.mkdirSync(cacheRoot, { recursive: true });

const quicknodeRoot = checkout(quicknode);
const expectations = fs.readdirSync(expectationDirectory).filter(file => file.endsWith('.json')).sort().map(file => JSON.parse(fs.readFileSync(path.join(expectationDirectory, file), 'utf8')));
if (expectations.length !== 20) throw new Error(`QuickNode ground truth must contain exactly 20 cases, found ${expectations.length}`);

const totals = { assertions: 0, passed: 0, metrics: new Map(), frameworks: new Map(), examples: new Map(), calls: new Map() };
for (const expected of expectations) {
  const report = analyze(path.join(quicknodeRoot, expected.path), true);
  const result = evaluate(expected, report);
  printResult(expected, result);
  aggregate(totals, expected, result);
  if (result.failures.length) throw new Error(`${expected.example}/${expected.framework}: ${result.failures.join('; ')}`);
}

const secondaryResults = validateFoundation(checkout(foundation));
const steelResult = validateSteel(checkout(steel));
const shankResult = validateShank(path.join(quicknodeRoot, 'tools/shank-and-codama/native'));
for (const result of [...secondaryResults, steelResult, shankResult]) {
  process.stdout.write(`${result.name}\n${result.assertions.map(item => `  ${item.label.padEnd(24)} ${item.pass ? 'PASS' : 'FAIL'}${item.detail ? ` (${item.detail})` : ''}`).join('\n')}\n`);
  if (result.assertions.some(item => !item.pass)) throw new Error(`${result.name}: ${result.assertions.filter(item => !item.pass).map(item => item.label).join(', ')}`);
}

process.stdout.write('\nGround-truth summary\n');
process.stdout.write(`  Assertions                 ${totals.passed}/${totals.assertions} PASS\n`);
for (const [name, metric] of [...totals.metrics].sort()) process.stdout.write(`  ${name.padEnd(26)} precision ${formatRatio(metric.correct, metric.detected)} recall ${formatRatio(metric.correct, metric.expected)} F1 ${f1(metric.correct, metric.detected, metric.expected)}\n`);
process.stdout.write('Framework semantic accuracy\n');
for (const [name, value] of [...totals.frameworks].sort()) process.stdout.write(`  ${name.padEnd(16)} ${formatRatio(value.passed, value.total)}\n`);
process.stdout.write('Example semantic accuracy\n');
for (const [name, value] of [...totals.examples].sort()) process.stdout.write(`  ${name.padEnd(30)} ${formatRatio(value.passed, value.total)}\n`);
process.stdout.write('Call classification\n');
for (const [name, value] of [...totals.calls].sort()) process.stdout.write(`  ${name.padEnd(16)} internal ${value.resolved}/${value.resolvable} external ${value.external} ambiguous ${value.ambiguous} dynamic ${value.dynamic} unknown ${value.unknown}\n`);
process.stdout.write(`real-world semantic validation passed: 20/20 QuickNode cases, ${secondaryResults.length}/${secondaryResults.length} independent cases, Steel PASS, Shank/Codama PASS\n`);

function evaluate(expected, report) {
  const assertions = []; const metrics = new Map(); const add = (label, pass, detail = '') => assertions.push({ label, pass, detail });
  add('program count', report.programs.length === expected.programCount, `${report.programs.length}/${expected.programCount}`);
  const frameworks = new Set(report.programs.flatMap(program => program.frameworkEvidence.map(item => item.framework)));
  add('framework', frameworks.has(expected.framework), [...frameworks].join(', '));
  if (expected.programIds) { const actual = new Set(report.programs.map(program => program.identity?.programId).filter(Boolean)); add('program identity', setEquals(actual, new Set(expected.programIds)), `${actual.size}/${expected.programIds.length}`); }

  const actualInstructions = report.programs.flatMap(program => program.instructions.map(instruction => ({ program, instruction })));
  const instructionMatches = matchOneToOne(expected.instructions, actualInstructions, (truth, actual) => truth.name === actual.instruction.name && (!truth.programContains || actual.program.name.includes(truth.programContains)) && (!truth.handler || truth.handler === actual.instruction.handler));
  metric(metrics, 'instructions', instructionMatches, actualInstructions.length, expected.instructions.length);
  add('instructions', instructionMatches === expected.instructions.length && actualInstructions.length === expected.instructions.length, `${instructionMatches}/${expected.instructions.length}, detected ${actualInstructions.length}`);

  const actualAccounts = accountObservations(report);
  const accountMatches = matchOneToOne(expected.accounts || [], actualAccounts, (truth, actual) => truth.instruction === actual.instruction.name && truth.name === actual.account.name && (!truth.programContains || actual.program.name.includes(truth.programContains)));
  metric(metrics, 'accounts', accountMatches, actualAccounts.length, (expected.accounts || []).length);
  add('account relations', accountMatches === (expected.accounts || []).length && actualAccounts.length === (expected.accounts || []).length, `${accountMatches}/${(expected.accounts || []).length}, detected ${actualAccounts.length}`);
  for (const truth of expected.accounts || []) {
    const actual = actualAccounts.find(item => item.instruction.name === truth.instruction && item.account.name === truth.name && (!truth.programContains || item.program.name.includes(truth.programContains)));
    if (!actual) continue;
    for (const field of ['signer', 'writable', 'ownerValidated', 'addressValidated']) if (truth[field] !== undefined) add(`${truth.instruction}.${truth.name}.${field}`, !!actual.account[field] === truth[field], `${!!actual.account[field]}/${truth[field]}`);
    if (truth.stateType) add(`${truth.instruction}.${truth.name}.state`, actual.account.stateType === truth.stateType, actual.account.stateType || 'unknown');
    if (truth.lifecycleContains) add(`${truth.instruction}.${truth.name}.lifecycle`, (actual.account.lifecycle || []).includes(truth.lifecycleContains), (actual.account.lifecycle || []).join(','));
  }
  for (const field of ['signer', 'writable']) {
    const expectedFlags = (expected.accounts || []).filter(item => item[field]);
    const detectedFlags = actualAccounts.filter(item => item.account[field]);
    const correct = matchOneToOne(expectedFlags, detectedFlags, (truth, actual) => truth.instruction === actual.instruction.name && truth.name === actual.account.name && (!truth.programContains || actual.program.name.includes(truth.programContains)));
    metric(metrics, field, correct, detectedFlags.length, expectedFlags.length);
    add(`${field} flags`, correct === expectedFlags.length && detectedFlags.length === expectedFlags.length, `${correct}/${expectedFlags.length}, detected ${detectedFlags.length}`);
  }

  const actualPdas = report.programs.flatMap(program => program.securitySurface.pdaSites.map(pda => ({ program, pda })));
  const pdaMatches = matchOneToOne(expected.pdas || [], actualPdas, matchPda); metric(metrics, 'PDA', pdaMatches, actualPdas.length, (expected.pdas || []).length);
  add('PDA', pdaMatches === (expected.pdas || []).length && actualPdas.length === (expected.pdas || []).length, `${pdaMatches}/${(expected.pdas || []).length}, detected ${actualPdas.length}`);
  const actualCpis = report.programs.flatMap(program => program.securitySurface.cpiSites.map(cpi => ({ program, cpi })));
  const cpiMatches = matchOneToOne(expected.cpis || [], actualCpis, matchCpi); metric(metrics, 'CPI', cpiMatches, actualCpis.length, (expected.cpis || []).length);
  add('CPI', cpiMatches === (expected.cpis || []).length && actualCpis.length === (expected.cpis || []).length, `${cpiMatches}/${(expected.cpis || []).length}, detected ${actualCpis.length}`);

  const states = new Set(report.programs.flatMap(program => (program.stateTypes || []).map(item => item.name)));
  for (const state of expected.stateTypes || []) add(`state ${state}`, states.has(state), [...states].join(', ') || 'none');
  const runtime = new Set(report.programs.flatMap(program => (program.runtimeOperations || []).map(item => item.kind)));
  for (const kind of expected.runtimeKinds || []) add(`runtime ${kind}`, runtime.has(kind), [...runtime].join(', ') || 'none');
  const unexpected = (report.analysisDiagnostics || []).filter(item => item.severity !== 'info' && !(expected.allowedDiagnostics || []).some(pattern => new RegExp(pattern).test(item.message)));
  add('unexpected diagnostics', unexpected.length <= (expected.maxUnexpectedDiagnostics ?? 0), unexpected.map(item => item.message).join(' | ') || '0');
  const calls = report.programs.flatMap(program => program.callGraph?.calls || []);
  const callSummary = { resolved: calls.filter(item => item.status === 'resolved').length, resolvable: calls.filter(item => item.status === 'resolved' || item.status === 'ambiguous').length, external: calls.filter(item => item.status === 'external').length, ambiguous: calls.filter(item => item.status === 'ambiguous').length, dynamic: calls.filter(item => item.status === 'dynamic').length, unknown: calls.filter(item => item.status === 'unresolved').length };
  return { assertions, metrics, callSummary, failures: assertions.filter(item => !item.pass).map(item => `${item.label} ${item.detail}`) };
}

function accountObservations(report) {
  const output = [];
  for (const program of report.programs) for (const relation of program.relationships || []) {
    const instruction = program.instructions.find(item => (item.id || item.name) === relation.instructionId); const account = program.accounts.find(item => item.id === relation.accountId);
    if (instruction && account?.name) output.push({ program, instruction, account });
  }
  return [...new Map(output.map(item => [actualAccountKey(item), item])).values()];
}
function actualAccountKey(item) { return `${item.program.name}|${item.instruction.name}|${item.account.name}`; }
function matchPda(truth, actual) { const pda = actual.pda; return (!truth.programContains || actual.program.name.includes(truth.programContains)) && (!truth.apiContains || (pda.derivationApi || '').includes(truth.apiContains)) && (!truth.instruction || pda.enclosingInstruction === truth.instruction) && (truth.signed === undefined || !!pda.usedAsSigner === truth.signed) && (!truth.bumpContains || (pda.bump || '').includes(truth.bumpContains)) && (truth.seedContains || []).every(seed => (pda.seeds || []).some(actualSeed => actualSeed.includes(seed))); }
function matchCpi(truth, actual) { const cpi = actual.cpi; return (!truth.programContains || actual.program.name.includes(truth.programContains)) && (!truth.targetKind || cpi.targetKind === truth.targetKind) && (truth.signed === undefined || cpi.pdaSigned === truth.signed) && (!truth.function || cpi.functionName === truth.function) && (!truth.instruction || cpi.enclosingInstruction === truth.instruction) && (!truth.targetContains || (cpi.target || '').includes(truth.targetContains)); }
function matchOneToOne(expected, actual, matcher) { const used = new Set(); let matches = 0; for (const truth of expected) { const index = actual.findIndex((item, candidate) => !used.has(candidate) && matcher(truth, item)); if (index >= 0) { used.add(index); matches++; } } return matches; }
function metric(map, name, correct, detected, expected) { const value = map.get(name) || { correct: 0, detected: 0, expected: 0 }; value.correct += correct; value.detected += detected; value.expected += expected; map.set(name, value); }
function setEquals(a, b) { return a.size === b.size && [...a].every(item => b.has(item)); }
function formatRatio(value, total) { return total ? `${value}/${total} (${(value / total * 100).toFixed(1)}%)` : 'N/A'; }
function f1(correct, detected, expected) { if (!detected && !expected) return 'N/A'; const precision = detected ? correct / detected : 0, recall = expected ? correct / expected : 0; return precision + recall ? (2 * precision * recall / (precision + recall)).toFixed(3) : '0.000'; }

function printResult(expected, result) {
  process.stdout.write(`${expected.example} / ${expected.framework}\n`);
  for (const item of result.assertions) process.stdout.write(`  ${item.label.padEnd(42)} ${item.pass ? 'PASS' : 'FAIL'}${item.detail ? ` (${item.detail})` : ''}\n`);
  process.stdout.write(`  accuracy${''.padEnd(34)} ${formatRatio(result.assertions.filter(item => item.pass).length, result.assertions.length)}\n`);
}
function aggregate(totals, expected, result) {
  totals.assertions += result.assertions.length; totals.passed += result.assertions.filter(item => item.pass).length;
  for (const [name, value] of result.metrics) metric(totals.metrics, name, value.correct, value.detected, value.expected);
  for (const [map, key] of [[totals.frameworks, expected.framework], [totals.examples, expected.example]]) { const value = map.get(key) || { passed: 0, total: 0 }; value.passed += result.assertions.filter(item => item.pass).length; value.total += result.assertions.length; map.set(key, value); }
  const calls = totals.calls.get(expected.framework) || { resolved: 0, resolvable: 0, external: 0, ambiguous: 0, dynamic: 0, unknown: 0 }; for (const key of Object.keys(calls)) calls[key] += result.callSummary[key]; totals.calls.set(expected.framework, calls);
}

function validateFoundation(root) {
  const cases = [];
  for (const example of ['counter', 'checking-accounts', 'program-derived-addresses', 'cross-program-invocation']) for (const framework of ['anchor', 'native', 'pinocchio']) {
    const target = path.join(root, 'basics', example, framework); if (!fs.existsSync(target)) continue;
    const report = analyze(target, true); const frameworks = new Set(report.programs.flatMap(program => program.frameworkEvidence.map(item => item.framework)));
    const expectedFramework = framework === 'native' ? 'native-solana' : framework;
    const assertions = [{ label: 'framework', pass: frameworks.has(expectedFramework), detail: [...frameworks].join(', ') }, { label: 'instructions', pass: report.summary.instructions > 0, detail: String(report.summary.instructions) }, { label: 'invariants', pass: !(report.analysisDiagnostics || []).some(item => item.category === 'invariant' && item.severity === 'error'), detail: 'no invariant errors' }];
    if (example === 'program-derived-addresses') assertions.push({ label: 'PDA semantics', pass: report.summary.pdas > 0 && report.programs.some(program => program.securitySurface.pdaSites.some(item => item.seeds?.length)), detail: `${report.summary.pdas} sites` });
    if (example === 'cross-program-invocation') assertions.push({ label: 'CPI semantics', pass: report.summary.cpis > 0, detail: `${report.summary.cpis} sites` });
    cases.push({ name: `foundation ${example}/${framework}`, assertions });
  }
  return cases;
}
function validateSteel(root) {
  const generated = path.join(cacheRoot, 'steel-generated-template'); const template = path.join(root, 'cli/src/template'); fs.rmSync(generated, { recursive: true, force: true });
  for (const directory of ['api/src/state', 'program/src']) fs.mkdirSync(path.join(generated, directory), { recursive: true });
  const render = source => fs.readFileSync(path.join(template, source), 'utf8').replaceAll('{name_lowercase}', 'accuracy').replaceAll('{name_typecase}', 'Accuracy').replaceAll('{name_libcase}', 'accuracy');
  fs.writeFileSync(path.join(generated, 'Cargo.toml'), render('cargo_toml')); fs.writeFileSync(path.join(generated, 'api/Cargo.toml'), render('api_cargo_toml')); fs.writeFileSync(path.join(generated, 'program/Cargo.toml'), render('program_cargo_toml'));
  for (const [source, target] of [['api_src_lib_rs', 'api/src/lib.rs'], ['api_src_consts_rs', 'api/src/consts.rs'], ['api_src_error_rs', 'api/src/error.rs'], ['api_src_instruction_rs', 'api/src/instruction.rs'], ['api_src_sdk_rs', 'api/src/sdk.rs'], ['api_src_state_mod_rs', 'api/src/state/mod.rs'], ['api_src_state_counter_rs', 'api/src/state/counter.rs'], ['program_src_lib_rs', 'program/src/lib.rs'], ['program_src_add_rs', 'program/src/add.rs'], ['program_src_initialize_rs', 'program/src/initialize.rs']]) fs.writeFileSync(path.join(generated, target), render(source));
  const report = analyze(generated, true); const frameworks = new Set(report.programs.flatMap(program => program.frameworkEvidence.map(item => item.framework))); const names = new Set(report.programs.flatMap(program => program.instructions.map(item => item.name)));
  return { name: 'steel canonical generated template', assertions: [{ label: 'framework', pass: frameworks.has('steel'), detail: [...frameworks].join(', ') }, { label: 'instructions', pass: ['Initialize', 'Add'].every(name => names.has(name)), detail: [...names].join(', ') }, { label: 'accounts', pass: report.summary.accounts >= 3, detail: String(report.summary.accounts) }, { label: 'state', pass: report.programs.some(program => (program.stateTypes || []).some(item => /Counter/i.test(item.name))), detail: 'Counter' }] };
}
function validateShank(root) {
  const report = analyze(root, false); const program = report.programs.find(item => item.frameworkEvidence.some(evidence => evidence.framework === 'shank-metadata')); const names = program ? program.instructions.map(item => item.name) : [];
  const instructionReconciliations = (report.idl?.reconciliations || []).filter(item => item.item.startsWith('instruction:'));
  return { name: 'QuickNode Shank/Codama', assertions: [{ label: 'Shank metadata', pass: !!program, detail: program?.name || 'none' }, { label: 'instruction metadata', pass: names.length === 4 && ['AddCar', 'BookRental', 'PickUpCar', 'ReturnCar'].every(name => names.includes(name)), detail: names.join(', ') }, { label: 'account ordering', pass: !!program && (program.relationships || []).length >= 13, detail: String(program?.relationships?.length || 0) }, { label: 'IDL discovery', pass: (report.idl?.programs.length || 0) === 1, detail: String(report.idl?.programs.length || 0) }, { label: 'IDL instruction matches', pass: instructionReconciliations.filter(item => item.status === 'MATCHED').length === 4, detail: '4 expected' }, { label: 'IDL instruction mismatches', pass: instructionReconciliations.every(item => item.status !== 'MISMATCH'), detail: `${instructionReconciliations.filter(item => item.status === 'MISMATCH').length} mismatch(es)` }, { label: 'generated clients excluded', pass: report.files.every(file => !file.uri.includes('/clients/')), detail: `${report.files.length} source files` }] };
}

function analyze(target, disableIdl) {
  const args = [path.join(repositoryRoot, 'dist/cli.js'), 'analyze', target, '--format', 'json', '--no-cache', '--exclude', '**/tests/**']; if (disableIdl) args.push('--disable-idl');
  return JSON.parse(cp.execFileSync(process.execPath, args, { encoding: 'utf8', cwd: repositoryRoot, maxBuffer: 64 * 1024 * 1024 }));
}
function checkout(project) {
  const directory = path.join(cacheRoot, `${slug(project.repository)}-${project.commit.slice(0, 12)}`); ensureCheckout(project.repository, project.commit, directory); return directory;
}
function ensureCheckout(repository, commit, directory) {
  if (!fs.existsSync(path.join(directory, '.git'))) cp.execFileSync('git', ['clone', '--filter=blob:none', '--no-checkout', repository, directory], { stdio: 'inherit' });
  let current = ''; try { current = cp.execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); } catch { /* checkout below */ }
  if (current !== commit || !fs.existsSync(path.join(directory, '.git', 'index'))) { try { cp.execFileSync('git', ['-C', directory, 'cat-file', '-e', `${commit}^{commit}`]); } catch { cp.execFileSync('git', ['-C', directory, 'fetch', '--depth=1', 'origin', commit], { stdio: 'inherit' }); } cp.execFileSync('git', ['-C', directory, 'checkout', '--detach', commit], { stdio: 'inherit' }); }
  const verified = cp.execFileSync('git', ['-C', directory, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(); if (verified !== commit) throw new Error(`Pinned checkout mismatch: ${verified} != ${commit}`);
}
function slug(repository) { return repository.replace(/\.git$/, '').split('/').slice(-2).join('-').replace(/[^A-Za-z0-9_.-]/g, '-'); }
