const cp = require('node:child_process');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const corpusRoot = path.join(repositoryRoot, 'test/fixtures/non-rust-corpus');
const cli = path.join(repositoryRoot, 'dist/cli.js');
const report = JSON.parse(cp.execFileSync(process.execPath, [cli, 'analyze', corpusRoot, '--format', 'json', '--no-cache', '--disable-idl'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024
}));

const assertions = [];
const check = (label, pass, detail) => assertions.push({ label, pass: Boolean(pass), detail });
const programs = report.programs || [];
const solang = programs.filter(program => program.sourceLanguage === 'solang-solidity');
const assembly = programs.filter(program => program.sourceLanguage === 'sbf-assembly');
const token = solang.find(program => program.name === 'TokenSurface');
const seeded = solang.find(program => program.name === 'SeededAccount');
const asm = assembly[0];

check('source files', report.summary.sourceFiles === 4, `${report.summary.sourceFiles}/4`);
check('Solang files', report.summary.solidityFiles === 2, `${report.summary.solidityFiles}/2`);
check('assembly files', report.summary.assemblyFiles === 2, `${report.summary.assemblyFiles}/2`);
check('program classification', programs.length === 3 && solang.length === 2 && assembly.length === 1, `${programs.length} total, ${solang.length} Solang, ${assembly.length} sBPF`);
check('generic eBPF rejected', !programs.some(program => (program.sourceFiles || []).some(file => file.uri?.endsWith('generic-ebpf.s'))), programs.map(program => program.name).join(', '));

const tokenCpis = token?.securitySurface?.cpiSites || [];
check('official token CPI', tokenCpis.length === 1 && tokenCpis[0].operation === 'mint_to', tokenCpis.map(site => site.operation).join(', ') || 'none');
check('read helper not CPI', !tokenCpis.some(site => site.functionName === 'total_supply'), tokenCpis.map(site => site.functionName).join(', ') || 'none');
check('read helper modeled', (token?.runtimeOperations || []).some(operation => operation.kind === 'data-read'), (token?.runtimeOperations || []).map(operation => operation.kind).join(', ') || 'none');
check('mint asset flow', (token?.assetFlows || []).some(flow => flow.operation === 'mint_to'), (token?.assetFlows || []).map(flow => flow.operation).join(', ') || 'none');

const constructor = seeded?.instructions?.find(instruction => instruction.name === 'new');
const pda = seeded?.securitySurface?.pdaSites?.[0];
check('annotated parameters', constructor?.arguments?.some(argument => argument.name === 'seed_value') && constructor.arguments.some(argument => argument.name === 'bump_value'), JSON.stringify(constructor?.arguments || []));
check('parameter PDA seeds', pda?.seeds?.some(seed => seed.includes('seed_value')) && String(pda?.bump || '').includes('bump_value'), `${JSON.stringify(pda?.seeds || [])}; ${pda?.bump || 'no bump'}`);

check('current sBPF ISA', asm?.functions?.[0]?.complexity === 2, `complexity ${asm?.functions?.[0]?.complexity ?? 'missing'}`);
check('backward branch loop', asm?.sourceFiles?.[0]?.loops === 1, `${asm?.sourceFiles?.[0]?.loops ?? 'missing'}/1`);
check('signed CPI syscall', asm?.securitySurface?.cpiSites?.some(site => site.pdaSigned), JSON.stringify(asm?.securitySurface?.cpiSites || []));
check('PDA syscall', (asm?.securitySurface?.pdaSites || []).some(site => site.derivationApi === 'sol_create_program_address'), (asm?.securitySurface?.pdaSites || []).map(site => site.derivationApi).join(', ') || 'none');

for (const assertion of assertions) process.stdout.write(`  ${assertion.label.padEnd(28)} ${assertion.pass ? 'PASS' : 'FAIL'} (${assertion.detail})\n`);
const failures = assertions.filter(assertion => !assertion.pass);
if (failures.length) throw new Error(`non-Rust corpus failed: ${failures.map(assertion => assertion.label).join(', ')}`);
process.stdout.write(`non-Rust ground-truth corpus passed: ${assertions.length}/${assertions.length}\n`);
