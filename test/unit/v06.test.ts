import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import { analyzeSources } from '../../src/analysis/analyzer';
import { analysisCacheKey, clearAnalysisCache, readAnalysisCache, writeAnalysisCache } from '../../src/core/cache';
import { diffReports } from '../../src/core/diff';
import { evaluatePolicy } from '../../src/core/policy';
import { markdownReport, standaloneHtml } from '../../src/core/serialization';
import { buildScope } from '../../src/core/scope';
import { countLines } from '../../src/utils/text';
import { buildCargoGraph } from '../../src/discovery/cargoGraph';

const wasm = path.resolve(__dirname, '../../../resources/parsers/tree-sitter-rust.wasm');

describe('Sealevel Insight v0.6 release semantics', () => {
  it('validates a generated report against the versioned JSON schema', async () => {
    const report = await sampleReport('pub fn handler() {}');
    const schema = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../../schemas/report.schema.json'), 'utf8'));
    const validate = new Ajv2020({ strict: true }).compile(schema);
    assert.equal(validate(report), true, JSON.stringify(validate.errors));
  });

  it('rejects a report with an incompatible schema version', async () => {
    const report = { ...await sampleReport('pub fn handler() {}'), schemaVersion: '9.9.9' };
    const schema = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../../schemas/report.schema.json'), 'utf8'));
    assert.equal(new Ajv2020({ strict: true }).validate(schema, report), false);
  });

  it('merges an explicit CLI scope file with explicit include patterns', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sealevel-scope-'));
    try {
      await fs.mkdir(path.join(root, 'src')); await fs.mkdir(path.join(root, 'generated'));
      await fs.writeFile(path.join(root, 'src/lib.rs'), 'fn main() {}'); await fs.writeFile(path.join(root, 'generated/client.rs'), 'fn generated() {}');
      await fs.writeFile(path.join(root, 'audit.scope'), '+src/**/*.rs\n!generated/**\n');
      const scope = await buildScope(root, { include: [], exclude: [], scopeFile: 'audit.scope' });
      assert.deepEqual(scope.inScope, ['src/lib.rs']); assert.equal(scope.configSource, path.join(root, 'audit.scope'));
    } finally { await fs.rm(root, { recursive: true, force: true }); }
  });

  it('counts nested block and documentation comments exactly', () => {
    const metrics = countLines('/// docs\nfn a() { /* outer\n/* inner */\nend */ }\n');
    assert.deepEqual({ comments: metrics.commentLines, docs: metrics.docCommentLines, code: metrics.codeLines }, { comments: 2, docs: 1, code: 2 });
  });

  it('does not treat comment-like text in Rust strings as comments', () => {
    const metrics = countLines('fn a() { let x = "// no"; let y = "/* no */"; }\n');
    assert.equal(metrics.commentLines, 0); assert.equal(metrics.codeLines, 1);
  });

  it('handles raw strings, byte strings, chars, and TODO markers lexically', () => {
    const metrics = countLines('fn a(){let r=r#"/*x*/"#;let b=b"//";let c=\'/\';}\n// TODO: one\n/* FIXME HACK */\n');
    assert.deepEqual({ code: metrics.codeLines, comments: metrics.commentLines, todo: metrics.todoCount, fixme: metrics.fixmeCount, hack: metrics.hackCount }, { code: 1, comments: 2, todo: 1, fixme: 1, hack: 1 });
  });

  it('fails a function-complexity quality policy without calling it a vulnerability', async () => {
    const report = await sampleReport('pub fn handler(a: bool, b: bool) { if a && b { } }');
    const result = evaluatePolicy(report, { maxFunctionComplexity: 1 });
    assert.equal(result.passed, false); assert.match(result.failures[0], /complexity/); assert.doesNotMatch(result.failures[0], /vulnerab|severity/i);
  });

  it('normalizes percentage semantic coverage for ratio-based policy thresholds', async () => {
    const report = await sampleReport('pub fn handler() {}'); report.coverage!.parsedFiles = { resolved: 8, total: 10, percent: 80 };
    assert.equal(evaluatePolicy(report, { minimumSemanticCoverage: 0.9 }).passed, false);
  });

  it('round-trips only compatible v0.6 cache entries', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sealevel-cache-')); const report = await sampleReport('pub fn handler() {}'); const key = analysisCacheKey([{ uri: 'lib.rs', source: 'pub fn handler() {}' }], {});
    try { await writeAnalysisCache(directory, key, report); assert.equal((await readAnalysisCache(directory, key))?.schemaVersion, '0.6.0'); await fs.writeFile(path.join(directory, `${key}.json`), JSON.stringify({ ...report, schemaVersion: '0.5.0' })); assert.equal(await readAnalysisCache(directory, key), undefined); }
    finally { await clearAnalysisCache(directory); }
  });

  it('invalidates cache keys on source or configuration changes', () => {
    const a = analysisCacheKey([{ uri: 'lib.rs', source: 'fn a(){}' }], { includeTests: false });
    assert.notEqual(a, analysisCacheKey([{ uri: 'lib.rs', source: 'fn b(){}' }], { includeTests: false }));
    assert.notEqual(a, analysisCacheKey([{ uri: 'lib.rs', source: 'fn a(){}' }], { includeTests: true }));
  });

  it('diffs account privilege changes and instruction surface changes', async () => {
    const before = await sampleReport('#[program]\npub mod p { pub fn go(ctx: Context<A>) {} }\n#[derive(Accounts)] pub struct A<\'info> { pub vault: Account<\'info, Vault> }');
    const after = await sampleReport('#[program]\npub mod p { pub fn go(ctx: Context<A>) { invoke(&[], &[]); } }\n#[derive(Accounts)] pub struct A<\'info> { #[account(mut)] pub vault: Account<\'info, Vault> }');
    const diff = diffReports(before, after);
    assert.ok(diff.changes.accounts.some(item => item.fields?.writable)); assert.ok(diff.changes.instructions.some(item => item.fields?.cpis));
  });

  it('keeps Quasar evidence separate from Anchor evidence', async () => {
    const report = await sampleReport('use quasar_lang::prelude::*; #[program] mod p { pub fn go(ctx: Ctx<A>) {} } #[derive(Accounts)] struct A { vault: &mut AccountView }');
    assert.equal(report.programs[0].frameworkEvidence.some(item => item.framework === 'quasar'), true);
    assert.equal(report.programs[0].frameworkEvidence.some(item => item.framework === 'anchor'), false);
    assert.deepEqual(report.programs[0].instructions.map(item => item.name), ['go']);
  });

  it('requires Anchor crate evidence before applying Anchor semantics', async () => {
    const report = await sampleReport('use anchor_lang::prelude::*; #[program] pub mod p { pub fn go(ctx: Context<A>) {} } #[derive(Accounts)] pub struct A<\'info> { pub signer: Signer<\'info> }');
    assert.equal(report.programs[0].frameworkEvidence.some(item => item.framework === 'anchor'), true); assert.equal(report.programs[0].instructions[0].name, 'go');
  });

  it('produces standalone HTML with strict offline CSP and sanitized embedded source', async () => {
    const report = await sampleReport('pub fn handler() {}'); report.workspace = { name: '</script><img src=x>', roots: ['/secret/root'] };
    const html = standaloneHtml(report);
    assert.match(html, /default-src 'none'/); assert.match(html, /Cargo Dependency Graph/); assert.match(html, /State Relationship Graph/); assert.doesNotMatch(html, /<script>.*<\/script><img/s); assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//);
  });

  it('renders semantic coverage as a real percentage in Markdown', async () => {
    const report = await sampleReport('pub fn handler() {}'); report.coverage!.parsedFiles = { resolved: 4, total: 5, percent: 80 }; report.coverage!.unknownCalls = 2;
    const markdown = markdownReport(report); assert.match(markdown, /Parsed Files \| 4 \| 5 \| 80\.0%/); assert.match(markdown, /Unknown Calls 2/); assert.doesNotMatch(markdown, /8000\.0%/);
  });

  it('resolves external modules declared through a Rust path attribute', async () => {
    const report = await analyzeSources([
      { uri: 'file:///repo/src/lib.rs', source: '#[path = "custom/helper_impl.rs"] mod helpers; fn run() { crate::helpers::help(); }', packageName: 'fixture', packageRoot: '/repo' },
      { uri: 'file:///repo/src/custom/helper_impl.rs', source: 'pub fn help() {}', packageName: 'fixture', packageRoot: '/repo' }
    ], wasm);
    assert.equal(report.programs[0].callGraph?.calls.find(item => item.sourceExpression === 'crate::helpers::help')?.status, 'resolved');
  });

  it('resolves public calls through indexed internal Cargo dependencies', async () => {
    const graph = buildCargoGraph([
      { uri: '/repo/Cargo.toml', text: '[workspace]\nmembers=["client","state"]' },
      { uri: '/repo/client/Cargo.toml', text: '[package]\nname="client"\n[dependencies]\nstate-lib={path="../state"}' },
      { uri: '/repo/state/Cargo.toml', text: '[package]\nname="state-lib"' }
    ], new Map([['/repo/client', ['use state_lib::validate;']], ['/repo/state', ['pub fn validate() {}']]]));
    const client = graph.packages.find(item => item.name === 'client')!; const state = graph.packages.find(item => item.name === 'state-lib')!;
    const report = await analyzeSources([
      { uri: 'file:///repo/client/src/lib.rs', source: 'use state_lib::validate; #[program] pub mod p { pub fn run() { validate(); } }', packageName: 'client', packageId: client.id, packageRoot: client.rootUri, workspaceGraph: graph },
      { uri: 'file:///repo/state/src/lib.rs', source: 'pub fn validate() {}', packageName: 'state-lib', packageId: state.id, packageRoot: state.rootUri, workspaceGraph: graph }
    ], wasm);
    const call = report.programs.find(item => item.name === 'client')?.callGraph?.calls.find(item => item.sourceExpression === 'validate');
    assert.equal(call?.status, 'resolved'); assert.equal(call?.target, 'state-lib::validate');
    const surface = report.programs.find(item => item.name === 'client')?.instructions.find(item => item.name === 'run')?.reachableSurface;
    assert.equal(surface?.complete, false); assert.match(surface?.incompleteReasons?.join('\n') ?? '', /cross-package functions indexed but not merged/);
  });

  it('links Quasar constraints and structured PDA templates across modules', async () => {
    const report = await analyzeSources([
      { uri: 'file:///q/src/lib.rs', source: 'use quasar_lang::prelude::*; mod accounts; mod state; #[program] mod p { pub fn create(ctx: Ctx<Create>) { accounts::handle(&mut ctx.accounts); } }', packageName: 'q', packageRoot: '/q' },
      { uri: 'file:///q/src/accounts.rs', source: 'use quasar_lang::prelude::*; #[derive(Accounts)] struct Create { #[account(mut)] payer: Signer, #[account(mut, init, address = Vault::seeds(payer.address()))] vault: Account<Vault> } pub fn handle(_: &mut Create) {}', packageName: 'q', packageRoot: '/q' },
      { uri: 'file:///q/src/state.rs', source: 'use quasar_lang::prelude::*; #[account] #[seeds(b"vault", payer: Address)] struct Vault { value: u64 }', packageName: 'q', packageRoot: '/q' }
    ], wasm);
    const program = report.programs[0]; const vault = program.accounts.find(item => item.name === 'vault');
    assert.equal(vault?.writable, true); assert.equal(vault?.pdaId, program.securitySurface.pdaSites[0].id);
    assert.deepEqual(program.securitySurface.pdaSites[0].seeds, ['b"vault"', 'payer']); assert.equal(program.instructions[0].reachableSurface?.accounts.length, 2);
  });

  it('does not create semantic accounts from bare account type references', async () => {
    const report = await sampleReport('fn helper(_: AccountInfo, _: AccountView) {}');
    assert.equal(report.programs[0].accounts.length, 0);
  });

  it('extracts only real native dispatch arms and resolves their handlers', async () => {
    const report = await sampleReport('fn process_instruction(accounts: &[AccountView], data: &[u8]) { match data.split_first() { Some((&IX_CREATE, rest)) => create(accounts, rest), _ => Err(Error) } } fn create(accounts: &[AccountView], data: &[u8]) { match parse(data) { Ok(Some(value)) => use_value(value), _ => Err(Error) }; }');
    assert.deepEqual(report.programs[0].instructions.map(item => [item.name, item.handler]), [['create', 'create']]);
  });

  it('requires evidence for native signer and writable account flags', async () => {
    const report = await sampleReport('fn process_instruction(accounts: &[AccountView]) { let [authority, vault, program] = accounts else { return }; if !authority.is_signer() { return } if !vault.owned_by(program.address()) { return } vault.resize(9); if program.address() != &ID { return } }');
    const accounts = report.programs[0].accounts;
    assert.equal(accounts.find(item => item.name === 'authority')?.signer, true);
    assert.equal(accounts.find(item => item.name === 'vault')?.writable, true); assert.equal(accounts.find(item => item.name === 'vault')?.ownerValidated, true);
    assert.equal(accounts.find(item => item.name === 'program')?.addressValidated, true);
  });

  it('preserves nested signer seeds and classifies nested system CPI instructions', async () => {
    const report = await sampleReport('fn create(accounts: &[AccountInfo], program_id: &Pubkey) { invoke_signed(&solana_system_interface::instruction::create_account(payer.key, vault.key, 1, 8, program_id), accounts, &[&[b"vault", authority.key.as_ref(), &[bump]]]); }');
    const program = report.programs[0]; assert.equal(program.securitySurface.cpiSites[0].targetKind, 'system-program');
    assert.deepEqual(program.securitySurface.pdaSites[0].seeds, ['b"vault"', 'authority.key.as_ref()', '[bump]']); assert.equal(program.securitySurface.cpiSites[0].signerPdaIds?.length, 1);
  });

  it('resolves Pinocchio Signer seed variables and turbofish CPI calls', async () => {
    const report = await sampleReport('fn pull(accounts: &[AccountView]) { let [vault, target] = accounts else { return }; let seeds = [Seed::from(b"vault"), Seed::from(vault.address().as_ref()), Seed::from(bump_bytes)]; let signer = Signer::from(&seeds); let ix = InstructionView { program_id: target.address(), accounts: &[], data: &[] }; invoke::<1>(&ix, &[vault]); CreateAccount { from: vault, to: target, owner: target.address() }.invoke_signed(&[signer]); }');
    const program = report.programs[0]; assert.equal(program.securitySurface.cpiSites.some(item => item.programAccountExpression === 'target.address()'), true);
    assert.deepEqual(program.securitySurface.pdaSites[0].seeds, ['b"vault"', 'vault.address().as_ref()', 'bump_bytes']);
  });

  it('categorizes internal, external, dynamic, and unknown call coverage separately', async () => {
    const report = await sampleReport('use external_crate::helper; fn local() {} fn run(value: Thing) { local(); helper(); drop(value); value.method(); missing(); }');
    assert.deepEqual(report.coverage?.internalCalls, { resolved: 1, total: 1, percent: 1 });
    assert.deepEqual(report.coverage?.externalCalls, { resolved: 2, total: 2, percent: 1 });
    assert.equal(report.coverage?.dynamicCalls, 1); assert.equal(report.coverage?.unknownCalls, 1);
  });

  it('does not mark instruction reachability incomplete for classified external calls', async () => {
    const report = await sampleReport('#[program] mod p { pub fn run() { external_crate::helper(); } }');
    assert.equal(report.programs[0].instructions[0].reachableSurface?.complete, true);
    assert.deepEqual(report.programs[0].instructions[0].reachableSurface?.unresolvedCalls, []);
  });

  it('treats absent parent workspace metadata as informational scope context', () => {
    const graph = buildCargoGraph([{ uri: '/repo/member/Cargo.toml', text: '[package]\nname="member"\n[dependencies]\nsolana-program.workspace=true' }], new Map());
    assert.equal(graph.diagnostics[0].severity, 'info'); assert.match(graph.diagnostics[0].message, /no containing workspace manifest/);
  });

  it('models explicit resize and state-write operations', async () => {
    const report = await sampleReport('fn update(account: &AccountView) { account.resize(64); account.set_inner(State { value: 1 }); }');
    assert.deepEqual(report.programs[0].runtimeOperations?.map(item => item.kind), ['realloc', 'state-write']);
  });

  it('extracts Shank tuple-variant arguments for source and IDL reconciliation', async () => {
    const report = await sampleReport('#[derive(ShankInstruction)] enum Instruction { AddCar(AddCarArgs), #[account(0, writable, name="vault")] Reset } struct AddCarArgs { value: u64 }');
    const instruction = report.programs[0].instructions.find(item => item.name === 'AddCar');
    assert.deepEqual(instruction?.arguments, [{ name: 'addCarArgs', type: 'AddCarArgs' }]);
  });
});

async function sampleReport(source: string) { return analyzeSources([{ uri: 'file:///fixture/lib.rs', source, packageName: 'fixture' }], wasm); }
