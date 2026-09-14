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
import { applyCargoMetadata } from '../../src/discovery/cargoMetadata';
import { normalizeIdl, reconcileIdl } from '../../src/idl/reconciliation';
import { isCurrentSchemaVersion, SCHEMA_VERSION } from '../../src/core/version';

const wasm = path.resolve(__dirname, '../../../resources/parsers/tree-sitter-rust.wasm');

describe('Sealevel Insight v0.6 release semantics', () => {
  it('accepts only exact current-schema reports from persisted editor state', () => {
    assert.equal(isCurrentSchemaVersion(SCHEMA_VERSION), true);
    assert.equal(isCurrentSchemaVersion('0.7.0'), false);
    assert.equal(isCurrentSchemaVersion('0.6.0'), false);
  });
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

  it('rejects malformed semantic records instead of validating only their containers', async () => {
    const report = await sampleReport('pub fn handler() {}');
    report.programs[0].functions = ['not-a-function' as never]; report.programs[0].securitySurface.cpiSites = [42 as never];
    const schema = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../../schemas/report.schema.json'), 'utf8'));
    const validate = new Ajv2020({ strict: true }).compile(schema);
    assert.equal(validate(report), false); assert.ok(validate.errors?.some(error => /functions|cpiSites/.test(error.instancePath)));
  });

  it('validates instruction dossiers, state flows, and the audit manifest strictly', async () => {
    const report = await sampleReport('use anchor_lang::prelude::*; #[program] mod p { pub fn run(ctx: Context<A>) -> Result<()> { Ok(()) } } #[derive(Accounts)] struct A<\'info> { signer: Signer<\'info> }');
    assert.equal(report.auditManifest?.scope.dossiers, 1); assert.equal(report.programs[0].instructionDossiers?.length, 1); assert.equal(report.programs[0].stateFlows?.length, 1);
    const malformed = JSON.parse(JSON.stringify(report)); malformed.programs[0].instructionDossiers[0].accounts[0].ownerValidation.validated = 'yes';
    const schema = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../../schemas/report.schema.json'), 'utf8'));
    const validate = new Ajv2020({ strict: true }).compile(schema); assert.equal(validate(malformed), false); assert.ok(validate.errors?.some(error => /ownerValidation/.test(error.instancePath)));
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

  it('prunes internal analysis and editor caches before scope hashing', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'sealevel-prune-'));
    try {
      await fs.mkdir(path.join(root, 'src')); await fs.writeFile(path.join(root, 'src/lib.rs'), 'fn main() {}');
      for (const directory of ['.real-world-cache', '.vscode-test', '.sealevel-insight-cache']) { await fs.mkdir(path.join(root, directory)); await fs.writeFile(path.join(root, directory, 'hidden.rs'), 'fn hidden() {}'); }
      const scope = await buildScope(root);
      assert.deepEqual(scope.files.map(file => file.path), ['src/lib.rs']);
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

  it('round-trips only compatible current-schema cache entries', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sealevel-cache-')); const report = await sampleReport('pub fn handler() {}'); const key = analysisCacheKey([{ uri: 'lib.rs', source: 'pub fn handler() {}' }], {});
    try { await writeAnalysisCache(directory, key, report); assert.equal((await readAnalysisCache(directory, key))?.schemaVersion, SCHEMA_VERSION); await fs.writeFile(path.join(directory, `${key}.json`), JSON.stringify({ ...report, schemaVersion: '0.6.0' })); assert.equal(await readAnalysisCache(directory, key), undefined); }
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
    assert.ok(diff.changes.accounts.some(item => item.fields?.writable)); assert.ok(diff.changes.instructions.some(item => item.fields?.cpis)); assert.ok(diff.changes.instructionDossiers.some(item => item.fields?.cpis)); assert.ok(diff.changes.stateFlows.length > 0);
  });

  it('diffs same-named functions by qualified semantic identity', async () => {
    const before = await sampleReport('mod a { pub fn validate() {} } mod b { pub fn validate() { if true {} } }');
    const after = await sampleReport('mod a { pub fn validate() { if true {} } } mod b { pub fn validate() { if true {} } }');
    const changed = diffReports(before, after).changedFunctions;
    assert.equal(changed.length, 1); assert.match(changed[0].id, /crate::a::validate$/);
  });

  it('diffs nested witness paths and compilation profiles deterministically', async () => {
    const before = await sampleReport('#[program] mod p { pub fn run() { target(); } } fn target() {}');
    const after = await analyzeSources([{ uri: 'file:///fixture/lib.rs', source: '#[program] mod p { pub fn run() { helper(); } } fn helper() { target(); } fn target() {}', packageName: 'fixture' }], wasm, undefined, undefined, { compilationProfile: { target: 'sbf-solana-solana', mode: 'normal', cfgOptions: ['target_os="solana"'], cfgKnowledge: 'complete', evidence: [{ description: 'profile' }] } });
    const diff = diffReports(before, after);
    assert.ok(diff.changes.instructionDossiers.some(item => item.fields?.witnesses)); assert.ok(diff.changes.compilationProfile.some(item => item.fields?.target)); assert.ok(diff.changes.callGraph.some(item => item.fields?.calls));
    const legacy = JSON.parse(JSON.stringify(before)); for (const program of legacy.programs) for (const dossier of program.instructionDossiers ?? []) delete dossier.reachabilityWitnesses;
    assert.doesNotThrow(() => diffReports(legacy, after));
  });

  it('rejects incompatible report schemas before diffing', async () => {
    const before = await sampleReport('fn a() {}'); const after = { ...before, schemaVersion: '0.7.0' };
    assert.throws(() => diffReports(before, after), /Cannot diff report schema|Unsupported report schema/);
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
    assert.match(html, /default-src 'none'/); assert.match(html, /style-src 'sha256-[A-Za-z0-9+/=]+'/); assert.match(html, /script-src 'sha256-[A-Za-z0-9+/=]+'/); assert.doesNotMatch(html, /unsafe-inline|__INLINE_CSP__/); assert.match(html, /Audit Cockpit/); assert.match(html, /Instruction Dossiers/); assert.match(html, /Dispatch & Indirect Calls/); assert.match(html, /Recursion Components/); assert.match(html, /Cargo Dependency Graph/); assert.match(html, /State Relationship Graph/); assert.doesNotMatch(html, /<script>.*<\/script><img/s); assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//);
  });

  it('renders semantic coverage as a real percentage in Markdown', async () => {
    const report = await sampleReport('pub fn handler() {}'); report.coverage!.parsedFiles = { resolved: 4, total: 5, percent: 80 }; report.coverage!.unknownCalls = 2;
    const markdown = markdownReport(report); assert.match(markdown, /Audit Manifest/); assert.match(markdown, /Instruction Dossiers/); assert.match(markdown, /Dispatch & Indirect Calls/); assert.match(markdown, /Recursion Components/); assert.match(markdown, /Parsed Files \| 4 \| 5 \| 80\.0%/); assert.match(markdown, /Unknown Calls 2/); assert.doesNotMatch(markdown, /8000\.0%/);
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
    assert.equal(surface?.complete, true); assert.deepEqual(surface?.crossPackageSurfaces?.map(item => [item.program, item.functions]), [['state-lib', ['state-lib::validate']]]);
  });

  it('uses saved Cargo resolution for workspace dependencies and rejects crate-private targets', async () => {
    const graph = buildCargoGraph([
      { uri: '/repo/Cargo.toml', text: '[workspace]\nmembers=["client","helper"]' },
      { uri: '/repo/client/Cargo.toml', text: '[package]\nname="client"\nversion="1.0.0"\n[dependencies]\nhelper-lib="1"' },
      { uri: '/repo/helper/Cargo.toml', text: '[package]\nname="helper-lib"\nversion="1.0.0"' }
    ], new Map([['/repo/client', ['use helper_lib::public;']], ['/repo/helper', ['pub fn public() {}']]]));
    applyCargoMetadata(graph, { version: 1, workspace_root: '/repo', target_directory: '/repo/target', workspace_members: ['client-id', 'helper-id'], workspace_default_members: ['client-id'], packages: [
      { id: 'client-id', name: 'client', version: '1.0.0', manifest_path: '/repo/client/Cargo.toml' }, { id: 'helper-id', name: 'helper-lib', version: '1.0.0', manifest_path: '/repo/helper/Cargo.toml' }
    ], resolve: { root: 'client-id', nodes: [{ id: 'client-id', features: [], deps: [{ name: 'helper_lib', pkg: 'helper-id', dep_kinds: [{ kind: null, target: null }] }] }, { id: 'helper-id', features: [], deps: [] }] } }, '/repo/cargo-metadata.json');
    const client = graph.packages.find(item => item.name === 'client')!; const helper = graph.packages.find(item => item.name === 'helper-lib')!;
    const report = await analyzeSources([
      { uri: 'file:///repo/client/src/lib.rs', source: 'use helper_lib::{public, hidden}; #[program] mod p { pub fn run() { public(); hidden(); } }', packageName: client.name, packageId: client.id, packageRoot: client.rootUri, workspaceGraph: graph },
      { uri: 'file:///repo/helper/src/lib.rs', source: 'pub fn public() {} pub(crate) fn hidden() {}', packageName: helper.name, packageId: helper.id, packageRoot: helper.rootUri, workspaceGraph: graph }
    ], wasm);
    const calls = report.programs.find(item => item.name === 'client')?.callGraph?.calls ?? [];
    assert.equal(calls.find(item => item.sourceExpression === 'public')?.target, 'helper-lib::public');
    assert.equal(calls.find(item => item.sourceExpression === 'hidden')?.status, 'unresolved'); assert.match(calls.find(item => item.sourceExpression === 'hidden')?.resolutionReason ?? '', /no externally public indexed function/);
  });

  it('propagates recursive cross-package functions and CPI semantics', async () => {
    const graph = buildCargoGraph([
      { uri: '/repo/Cargo.toml', text: '[workspace]\nmembers=["client","helper"]' },
      { uri: '/repo/client/Cargo.toml', text: '[package]\nname="client"\n[dependencies]\nhelper-lib={path="../helper"}' },
      { uri: '/repo/helper/Cargo.toml', text: '[package]\nname="helper-lib"' }
    ], new Map([['/repo/client', ['use helper_lib::first;']], ['/repo/helper', ['pub fn first() {}']]]));
    const client = graph.packages.find(item => item.name === 'client')!; const helper = graph.packages.find(item => item.name === 'helper-lib')!;
    const report = await analyzeSources([
      { uri: 'file:///repo/client/src/lib.rs', source: 'use helper_lib::first; #[program] mod p { pub fn run() { first(); } }', packageName: 'client', packageId: client.id, packageRoot: client.rootUri, workspaceGraph: graph },
      { uri: 'file:///repo/helper/src/lib.rs', source: 'use solana_program::program::invoke; pub fn first() { second(); } fn second() { invoke(&[], &[]); }', packageName: 'helper-lib', packageId: helper.id, packageRoot: helper.rootUri, workspaceGraph: graph }
    ], wasm);
    const dossier = report.programs.find(item => item.name === 'client')?.instructionDossiers?.[0]!; const cross = dossier.crossPackageSurfaces[0];
    assert.deepEqual(cross.functions, ['helper-lib::first', 'helper-lib::second']); assert.equal(cross.cpiIds.length, 1); assert.equal(cross.complete, true); assert.equal(dossier.reachability.complete, true);
    assert.equal(dossier.reviewComplexity?.components.find(item => item.label === 'CPIs')?.value, 1);
    const witness = dossier.reachabilityWitnesses.find(item => item.targetKind === 'cpi')!;
    assert.equal(witness.targetProgram, 'helper-lib'); assert.deepEqual(witness.functionPath.map(item => item.split('::').at(-1)), ['run', 'first', 'second']); assert.equal(witness.callPath.length, 2);
  });

  it('records deterministic shortest witness paths to functions, semantic sites, and unresolved calls', async () => {
    const source = 'use solana_program::program::invoke; #[program] mod p { pub fn run() { long(); target(); } } fn long() { middle(); } fn middle() { target(); } fn target() { invoke(&[], &[]); missing(); }';
    const report = await sampleReport(source); const dossier = report.programs[0].instructionDossiers?.[0]!;
    const functionWitness = dossier.reachabilityWitnesses.find(item => item.targetKind === 'function' && item.targetId.endsWith('::target'))!;
    assert.deepEqual(functionWitness.functionPath.map(item => item.split('::').at(-1)), ['run', 'target']); assert.equal(functionWitness.callPath.length, 1);
    const cpiWitness = dossier.reachabilityWitnesses.find(item => item.targetKind === 'cpi')!; assert.deepEqual(cpiWitness.functionPath, functionWitness.functionPath);
    const unresolved = dossier.reachabilityWitnesses.find(item => item.targetKind === 'call')!; assert.deepEqual(unresolved.functionPath, functionWitness.functionPath); assert.equal(unresolved.callPath.length, 2);
  });

  it('filters known cfg branches and preserves unknown target predicates explicitly', async () => {
    const graph = buildCargoGraph([{ uri: '/repo/Cargo.toml', text: '[package]\nname="cfg-program"\n[features]\nenabled=[]\noff=[]' }], new Map([['/repo', ['#[program] mod p {}']]]));
    const pkg = graph.packages[0]; pkg.enabledFeatures = ['enabled'];
    const source = '#[cfg(feature = "enabled")]\nfn selected() {}\n#[cfg(feature = "off")]\nfn hidden() { invoke(&[], &[]); }\n#[cfg(test)]\nfn test_only() {}\n#[cfg(target_os = "solana")]\nfn target_specific() {}\n#[program]\nmod p { pub fn run() { selected(); target_specific(); } }';
    const report = await analyzeSources([{ uri: 'file:///repo/src/lib.rs', source, packageName: pkg.name, packageId: pkg.id, packageRoot: pkg.rootUri, workspaceGraph: graph }], wasm);
    const program = report.programs[0]; assert.deepEqual(program.functions.map(item => item.name).sort(), ['run', 'selected', 'target_specific']);
    assert.equal(program.conditionalCompilation?.featureKnowledge, 'cargo-metadata'); assert.equal(program.conditionalCompilation?.inactiveItems, 2); assert.equal(program.conditionalCompilation?.unknownItems, 1);
    assert.deepEqual(program.functions.find(item => item.name === 'target_specific')?.cfgPredicates, ['target_os = "solana"']);
    const dossier = program.instructionDossiers?.[0]!; assert.equal(dossier.reachability.complete, false); assert.match(dossier.reachability.incompleteReasons.join('\n'), /conditional compilation/); assert.equal(program.securitySurface.cpiSites.length, 0);
  });

  it('evaluates explicit complete compilation profiles without inferring cfg values from the target label', async () => {
    const source = '#[cfg(target_os = "solana")] fn solana() {} #[cfg(unix)] fn unix_only() {} #[cfg(test)] fn test_only() {} #[cfg(debug_assertions)] fn debug_only() {} #[cfg(target_arch = "sbf")] fn unknown_arch() {} #[cfg(feature = "manual")] fn manual_feature() {}';
    const report = await analyzeSources([{ uri: 'file:///fixture/lib.rs', source, packageName: 'fixture' }], wasm, undefined, undefined, { compilationProfile: { target: 'sbf-solana-solana', mode: 'test', debugAssertions: false, cfgOptions: ['target_os="solana"', 'feature="manual"'], cfgKnowledge: 'complete', evidence: [{ description: 'test profile' }] } });
    assert.deepEqual(report.programs[0].functions.map(item => item.name).sort(), ['manual_feature', 'solana', 'test_only']); assert.equal(report.compilationProfile?.target, 'sbf-solana-solana');
    const partial = await analyzeSources([{ uri: 'file:///fixture/lib.rs', source: '#[cfg(target_arch = "sbf")] fn maybe() {}', packageName: 'fixture' }], wasm, undefined, undefined, { compilationProfile: { target: 'sbf-solana-solana', mode: 'normal', cfgOptions: [], cfgKnowledge: 'partial', evidence: [{ description: 'target label only' }] } });
    assert.equal(partial.programs[0].functions[0].cfgStatus, 'unknown');
  });

  it('resolves typed inherent and trait method calls without guessing untyped receivers', async () => {
    const report = await sampleReport('trait Execute { fn execute(&self); } struct Worker; impl Execute for Worker { fn execute(&self) { helper(); } } fn helper() {} fn typed(worker: Worker) { worker.execute(); } fn dynamic(value: Unknown) { value.missing(); }');
    const calls = report.programs[0].callGraph?.calls ?? []; const typed = calls.find(item => item.sourceExpression === 'worker.execute')!; const dynamic = calls.find(item => item.sourceExpression === 'value.missing')!;
    assert.equal(typed.status, 'resolved'); assert.equal(typed.target, 'crate::Worker::execute'); assert.equal(typed.receiverType, 'Worker'); assert.match(typed.resolutionReason ?? '', /trait implementation/);
    assert.equal(dynamic.status, 'unresolved'); assert.equal(dynamic.receiverType, 'Unknown'); assert.match(dynamic.resolutionReason ?? '', /no indexed implementation/);
  });

  it('keeps ambiguous trait implementations explicit and excludes trait contracts as concrete functions', async () => {
    const report = await sampleReport('trait First { fn run(&self); } trait Second { fn run(&self); } struct Worker; impl First for Worker { fn run(&self) {} } impl Second for Worker { fn run(&self) {} } fn dispatch(worker: Worker) { worker.run(); }');
    const program = report.programs[0]; const call = program.callGraph?.calls.find(item => item.sourceExpression === 'worker.run')!;
    assert.equal(call.status, 'ambiguous'); assert.equal(call.candidateTargets?.length, 2); assert.match(call.resolutionReason ?? '', /multiple indexed inherent\/trait candidates/);
    assert.equal(program.functions.filter(item => item.name === 'run').length, 2);
    assert.equal(program.symbols?.filter(item => item.kind === 'trait').length, 2);
  });

  it('resolves associated functions, Self paths, and fully qualified trait dispatch', async () => {
    const report = await sampleReport('trait Execute { fn run(&self); fn build(); } struct Worker; impl Worker { fn new() { Self::helper(); } fn helper() {} } impl Execute for Worker { fn run(&self) { Self::build(); Self::helper(); } fn build() {} } fn dispatch(worker: &Worker) { Worker::new(); <Worker as Execute>::run(worker); }');
    const calls = report.programs[0].callGraph?.calls ?? [];
    const associated = calls.find(item => item.sourceExpression === 'Worker::new')!; assert.equal(associated.status, 'resolved'); assert.equal(associated.dispatchKind, 'associated-function'); assert.equal(associated.target, 'crate::Worker::new');
    const inherentSelf = calls.filter(item => item.sourceExpression === 'Self::helper'); assert.equal(inherentSelf.length, 2); assert.ok(inherentSelf.every(item => item.status === 'resolved' && item.target === 'crate::Worker::helper'));
    const traitSelf = calls.find(item => item.sourceExpression === 'Self::build')!; assert.equal(traitSelf.status, 'resolved'); assert.match(traitSelf.candidateTargets?.[0] ?? '', /as Execute/);
    const ufcs = calls.find(item => item.sourceExpression === '<Worker as Execute>::run')!; assert.equal(ufcs.status, 'resolved'); assert.equal(ufcs.dispatchKind, 'ufcs'); assert.equal(ufcs.target, 'crate::Worker::run');
  });

  it('keeps generic-bound and trait-object dispatch constrained but dynamically incomplete', async () => {
    const report = await sampleReport('trait Execute { fn execute(&self); fn defaulted(&self) {} } fn generic<T: Execute>(value: T) { value.execute(); value.defaulted(); } fn where_bound<T>(value: T) where T: Execute { value.execute(); } fn opaque(value: impl Execute) { value.execute(); } fn object(value: &dyn Execute) { value.execute(); }');
    const calls = report.programs[0].callGraph?.calls.filter(item => item.sourceExpression === 'value.execute') ?? [];
    const generic = calls.find(item => item.receiverType === 'T')!; assert.equal(generic.status, 'dynamic'); assert.equal(generic.dispatchKind, 'generic-bound'); assert.deepEqual(generic.candidateTargets, ['crate::Execute::execute']); assert.match(generic.resolutionReason ?? '', /monomorphization/);
    const object = calls.find(item => item.receiverType === '&dyn Execute')!; assert.equal(object.status, 'dynamic'); assert.equal(object.dispatchKind, 'trait-object'); assert.deepEqual(object.candidateTargets, ['crate::Execute::execute']);
    assert.equal(calls.find(item => item.caller === 'crate::where_bound')?.dispatchKind, 'generic-bound'); assert.equal(calls.find(item => item.caller === 'crate::opaque')?.dispatchKind, 'generic-bound');
    const defaulted = report.programs[0].callGraph?.calls.find(item => item.sourceExpression === 'value.defaulted')!; assert.deepEqual(defaulted.candidateTargets, ['crate::Execute::defaulted']); assert.equal(report.programs[0].functions.some(item => item.name === 'defaulted'), false);
  });

  it('resolves simple alias and supported deref receiver transforms with evidence', async () => {
    const report = await sampleReport('trait Execute { fn execute(&self); } struct Worker; type Alias = Worker; impl Execute for Worker { fn execute(&self) {} } fn dispatch(worker: &Box<Alias>) { worker.execute(); }');
    const call = report.programs[0].callGraph?.calls.find(item => item.sourceExpression === 'worker.execute')!;
    assert.equal(call.status, 'resolved'); assert.equal(call.target, 'crate::Worker::execute'); assert.deepEqual(call.resolutionTransforms, ['autoderef reference &Box<Alias> -> Box<Alias>', 'supported deref wrapper Box<...> -> Alias', 'type alias Alias -> Worker']);
    assert.ok(call.evidence.some(item => /Dispatch transform/.test(item.description)));
  });

  it('resolves local closure and function-item bindings through their bodies', async () => {
    const report = await sampleReport('#[program] mod p { pub fn run() { let f = helper; let closure = || helper(); f(); closure(); } } fn helper() { deeper(); } fn deeper() {}');
    const program = report.programs[0]; const calls = program.callGraph?.calls ?? [];
    const functionItem = calls.find(item => item.sourceExpression === 'f')!; assert.equal(functionItem.status, 'resolved'); assert.equal(functionItem.dispatchKind, 'function-item'); assert.equal(functionItem.target, 'crate::helper'); assert.deepEqual(functionItem.macroOrigins, ['program']);
    const closure = calls.find(item => item.sourceExpression === 'closure')!; assert.equal(closure.status, 'resolved'); assert.equal(closure.dispatchKind, 'closure'); assert.match(closure.target ?? '', /\{\{closure@/);
    const closureBody = calls.find(item => item.sourceExpression === 'helper' && item.caller.includes('{{closure@'))!; assert.equal(closureBody.status, 'resolved');
    assert.equal(program.instructions[0].reachableSurface?.complete, true); assert.ok(program.instructions[0].reachableSurface?.functions.includes('crate::deeper'));
  });

  it('keeps runtime-selected function pointers explicit and records candidate identities', async () => {
    const report = await sampleReport('type Callback = fn(); fn first() {} fn second() {} fn dispatch(callback: fn(), aliased: Callback) { callback(); aliased(); let mut selected: fn() = first; selected = second; selected(); }');
    const calls = report.programs[0].callGraph?.calls ?? [];
    const parameter = calls.find(item => item.sourceExpression === 'callback')!; assert.equal(parameter.status, 'dynamic'); assert.equal(parameter.dispatchKind, 'function-pointer'); assert.match(parameter.resolutionReason ?? '', /supplied by the caller/);
    const selected = calls.find(item => item.sourceExpression === 'selected')!; assert.equal(selected.status, 'dynamic'); assert.equal(selected.dispatchKind, 'function-pointer'); assert.deepEqual(selected.candidateTargets, ['crate::first', 'crate::second']);
    const aliased = calls.find(item => item.sourceExpression === 'aliased')!; assert.equal(aliased.status, 'dynamic'); assert.equal(aliased.receiverType, 'Callback');
  });

  it('emits deterministic recursion components and local macro-origin uncertainty', async () => {
    const report = await sampleReport('macro_rules! route { () => { helper() } } fn self_call() { self_call(); } fn a() { b(); } fn b() { a(); } fn run() { route!(); }');
    const graph = report.programs[0].callGraph!;
    assert.deepEqual(graph.cycles.map(item => [item.kind, item.functions]), [['mutual-recursion', ['crate::a', 'crate::b']], ['self-recursion', ['crate::self_call']]]);
    assert.ok(graph.cycles.every(item => item.callIds.length > 0));
    const macro = graph.calls.find(item => item.sourceExpression === 'route!')!; assert.equal(macro.status, 'dynamic'); assert.equal(macro.dispatchKind, 'macro-origin'); assert.match(macro.resolutionReason ?? '', /does not expand macro token trees/);
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
    assert.equal(report.coverage?.dynamicCalls, 0); assert.equal(report.coverage?.unknownCalls, 2);
    const method = report.programs[0].callGraph?.calls.find(item => item.sourceExpression === 'value.method'); assert.equal(method?.receiverType, 'Thing'); assert.match(method?.resolutionReason ?? '', /no indexed implementation/);
  });

  it('does not mark instruction reachability incomplete for classified external calls', async () => {
    const report = await sampleReport('#[program] mod p { pub fn run() { external_crate::helper(); } }');
    assert.equal(report.programs[0].instructions[0].reachableSurface?.complete, true);
    assert.deepEqual(report.programs[0].instructions[0].reachableSurface?.unresolvedCalls, []);
    assert.equal(report.programs[0].reviewHotspots?.some(item => item.reasons.some(reason => /unresolved|unknown\/dynamic/.test(reason))), false);
  });

  it('models current Quasar lifecycle and wrapper validations', async () => {
    const report = await sampleReport('use quasar_lang::prelude::*; #[program] mod p { #[instruction] pub fn open(ctx: Ctx<CreateVault>) {} #[instruction] pub fn close(ctx: Ctx<CloseVault>) {} } #[account(discriminator = 1)] #[seeds(b"vault", authority: Address)] pub struct Vault { authority: Address, bump: u8 } #[derive(Accounts)] pub struct CreateVault { #[account(init(idempotent), payer = payer, address = Vault::seeds(authority.address()))] pub vault: Account<Vault>, #[account(mut)] pub payer: Signer, pub authority: Signer, pub system_program: Program<SystemProgram> } #[derive(Accounts)] pub struct CloseVault { #[account(mut, close(dest = authority))] pub vault: Account<Vault>, #[account(mut)] pub authority: Signer, pub token_program: Interface<TokenInterface>, pub system: SystemAccount }');
    const program = report.programs[0];
    const created = program.accounts.find(item => item.contextType === 'CreateVault' && item.name === 'vault')!;
    const closed = program.accounts.find(item => item.contextType === 'CloseVault' && item.name === 'vault')!;
    const tokenProgram = program.accounts.find(item => item.name === 'token_program')!; const system = program.accounts.find(item => item.name === 'system')!;
    assert.deepEqual(created.lifecycle, ['init', 'create', 'write']); assert.deepEqual(created.constraints?.map(item => item.kind), ['init(idempotent)', 'payer', 'address', 'seeds']);
    assert.deepEqual(closed.lifecycle, ['write', 'close']); assert.equal(closed.constraints?.find(item => item.kind === 'close')?.expression, 'dest = authority');
    assert.equal(tokenProgram.executable, true); assert.equal(tokenProgram.addressValidated, true); assert.equal(system.ownerValidated, true); assert.equal(system.ownerExpectation, 'SystemProgram');
  });

  it('extracts Quasar explicit discriminators, arguments, remaining contexts, and borrowed mutable wrappers', async () => {
    const report = await sampleReport(`use quasar_lang::prelude::*;
#[program] mod p { #[instruction(discriminator = [0, 1])] pub fn write(ctx: CtxWithRemaining<Write>, amount: u64) -> Result<(), ProgramError> { let signers = ctx.remaining_accounts().parse::<Signer, 10>()?; Ok(()) } }
#[derive(Accounts)] pub struct Write<'info> { pub payer: &'info mut Signer, pub vault: &'info mut Account<Vault>, pub system_program: &'info Program<System> }
#[account(discriminator = 2)] pub struct Vault { pub amount: u64 }
#[event(discriminator = 4)] pub struct Written { pub amount: u64 }`);
    const program = report.programs[0]; const instruction = program.instructions[0];
    assert.equal(instruction.contextType, 'Write'); assert.equal(instruction.discriminator, '[0,1]'); assert.deepEqual(instruction.arguments, [{ name: 'amount', type: 'u64' }]);
    assert.equal(program.accounts.find(item => item.name === 'payer')?.signer, true); assert.equal(program.accounts.find(item => item.name === 'payer')?.writable, true);
    assert.equal(program.accounts.find(item => item.name === 'vault')?.stateType, 'Vault'); assert.equal(program.accounts.find(item => item.name === 'vault')?.writable, true);
    assert.equal(program.accounts.find(item => item.name === 'system_program')?.executable, true); assert.ok(program.securitySurface.remainingAccounts > 0);
    assert.deepEqual(instruction.remainingAccounts, { kind: 'append', name: 'remainingAccounts', min: 0, max: null, item: { clientType: 'accountMeta', signer: 'input', writable: 'input' }, policy: { position: 'afterDeclaredAccounts', order: 'preserveInput' }, onChainType: 'Signer', onChainMax: 10, evidence: instruction.remainingAccounts?.evidence });
    assert.equal(program.instructionDossiers?.[0].remainingAccounts?.onChainMax, 10);
    const idl = normalizeIdl({ spec: 'quasar-idl/1.0.0', instructions: [{ name: 'write', discriminator: [0, 1], accounts: [{ name: 'payer', signer: true, writable: true }, { name: 'vault', writable: true }, { name: 'systemProgram' }], args: [{ name: 'amount', type: 'u64' }], remainingAccounts: { kind: 'append', name: 'remainingAccounts', min: 0, max: null, item: { clientType: 'accountMeta', signer: 'input', writable: 'input' }, policy: { position: 'afterDeclaredAccounts', order: 'preserveInput' } } }] })!;
    assert.equal(reconcileIdl(program, idl).reconciliations.some(item => item.item.includes('remainingAccounts') && item.status === 'MISMATCH'), false);
    assert.deepEqual(program.events?.map(item => [item.name, item.discriminator, item.framework]), [['Written', '[4]', 'quasar']]);
  });

  it('models Quasar ABI returns, account relations, idempotent init, and method-style signed CPIs', async () => {
    const report = await sampleReport(`use quasar_lang::prelude::*;
#[program] mod p {
  #[instruction(discriminator = 7)]
  pub fn execute(ctx: Ctx<Execute>) -> Result<PodU64, ProgramError> { ctx.accounts.run(&ctx.bumps)?; Ok(PodU64::from(1u64)) }
}
#[derive(Accounts)] pub struct Execute<'info> {
  #[account(init_if_needed, payer = payer, seeds = [b"vault", payer], bump, has_one = authority, close(dest = authority))]
  pub vault: &'info mut Account<Vault>,
  #[account(mut)] pub payer: &'info mut Signer,
  pub authority: &'info Signer,
  pub source: &'info mut Account<Token>,
  pub destination: &'info mut Account<Token>,
  pub token_program: &'info Program<TokenProgram>,
  pub custom_program: &'info Program<CustomProgram>,
}
impl<'info> Execute<'info> {
  pub fn run(&mut self, bumps: &ExecuteBumps) -> Result<(), ProgramError> {
    let seeds = bumps.vault_seeds();
    self.token_program.transfer(self.source, self.destination, self.authority, 1).invoke_signed(&seeds)?;
    let custom_call = self.custom_program.execute(self.vault, self.authority, 1);
    custom_call.invoke_with_signers(&[seeds])?;
    Ok(())
  }
}
#[account(discriminator = 1)] pub struct Vault { pub authority: Address }
pub struct Token; pub struct TokenProgram; pub struct CustomProgram;`);
    const program = report.programs[0]; const instruction = program.instructions[0]; const vault = program.accounts.find(item => item.name === 'vault')!;
    assert.equal(instruction.returns, 'PodU64'); assert.deepEqual(vault.lifecycle, ['init', 'create', 'write', 'close']);
    assert.deepEqual(vault.relations?.map(item => [item.kind, item.target]), [['payer', 'payer'], ['has-one', 'authority'], ['close-destination', 'authority']]);
    assert.ok(instruction.reachableSurface?.reviewComplexity?.components.every(item => item.label !== 'remaining_accounts use'));
    const token = program.securitySurface.cpiSites.find(item => item.operation === 'token.transfer');
    assert.equal(token?.targetKind, 'spl-token'); assert.equal(token?.pdaSigned, true); assert.deepEqual(token?.accountArguments, ['self.source', 'self.destination', 'self.authority', '1']);
    assert.ok(token?.signerPdaIds?.includes(vault.pdaId!));
    const custom = program.securitySurface.cpiSites.find(item => item.invocationApi?.includes('invoke_with_signers'));
    assert.equal(custom?.target, 'self.custom_program'); assert.equal(custom?.pdaSigned, true); assert.ok(custom?.signerPdaIds?.includes(vault.pdaId!));
    const matched = normalizeIdl({ instructions: [{ name: 'execute', discriminator: [7], accounts: [], args: [], returns: 'PodU64' }] })!;
    assert.equal(reconcileIdl({ instructions: [instruction], identity: undefined }, matched).reconciliations.some(item => item.item.endsWith('.returns')), false);
    const mismatch = normalizeIdl({ instructions: [{ name: 'execute', discriminator: [7], accounts: [], args: [], returns: 'u64' }] })!;
    assert.equal(reconcileIdl({ instructions: [instruction], identity: undefined }, mismatch).reconciliations.some(item => item.item.endsWith('.returns') && item.status === 'MISMATCH'), true);
  });

  it('charges review complexity for a declared remaining-account contract', async () => {
    const report = await sampleReport('use quasar_lang::prelude::*; #[program] mod p { #[instruction(discriminator = 1)] pub fn route(ctx: CtxWithRemaining<Route>) -> Result<(), ProgramError> { Ok(()) } } #[derive(Accounts)] pub struct Route {}');
    const component = report.programs[0].instructions[0].reachableSurface?.reviewComplexity?.components.find(item => item.label === 'remaining_accounts use');
    assert.deepEqual(component, { label: 'remaining_accounts use', value: 1, weight: 8, contribution: 8 });
  });

  it('propagates account lifecycle and mutation sites into instruction dossiers', async () => {
    const report = await sampleReport('use anchor_lang::prelude::*; #[program] pub mod p { pub fn create(ctx: Context<Create>) -> Result<()> { ctx.accounts.vault.set_inner(Vault { value: 1 }); Ok(()) } } #[derive(Accounts)] pub struct Create<\'info> { #[account(init, payer = payer, space = 16, close = payer)] pub vault: Account<\'info, Vault>, #[account(mut)] pub payer: Signer<\'info>, pub system_program: Program<\'info, System> } #[account] pub struct Vault { pub value: u64 }');
    const surface = report.programs[0].instructions[0].reachableSurface!;
    assert.equal(surface.initializationSites?.length, 1); assert.equal(surface.closeSites?.length, 1); assert.ok((surface.serializationSites?.length ?? 0) >= 1); assert.ok((surface.dataMutationSites?.length ?? 0) >= 1);
    const state = report.programs[0].stateTypes?.find(item => item.name === 'Vault')!; assert.equal(state.initializationSites.length, 1); assert.equal(state.closeSites.length, 1);
    const dossier = report.programs[0].instructionDossiers?.[0]!; const vault = dossier.accounts.find(item => item.name === 'vault')!;
    assert.equal(dossier.reachability.complete, surface.complete); assert.deepEqual(dossier.reachability.incompleteReasons, surface.incompleteReasons); assert.equal(vault.ownerValidation.validated, true); assert.deepEqual(vault.lifecycle, ['close', 'create', 'init', 'write']); assert.ok(dossier.semanticSites.initialization.length > 0);
    const flow = report.programs[0].stateFlows?.find(item => item.accountId === vault.accountId)!; assert.deepEqual(flow.operations, ['close', 'create', 'init', 'write']); assert.equal(flow.stateType, 'Vault');
    assert.equal(report.auditManifest?.reviewQueue[0].dossierId, dossier.id); assert.equal(report.auditManifest?.scope.stateFlows, report.programs[0].stateFlows?.length);
  });

  it('treats absent parent workspace metadata as informational scope context', () => {
    const graph = buildCargoGraph([{ uri: '/repo/member/Cargo.toml', text: '[package]\nname="member"\n[dependencies]\nsolana-program.workspace=true' }], new Map());
    assert.equal(graph.diagnostics[0].severity, 'info'); assert.match(graph.diagnostics[0].message, /no containing workspace manifest/);
  });

  it('models explicit resize and state-write operations', async () => {
    const report = await sampleReport('fn update(account: &AccountView) { account.resize(64); account.set_inner(State { value: 1 }); }');
    assert.deepEqual(report.programs[0].runtimeOperations?.map(item => item.kind), ['realloc', 'state-write']);
  });

  it('resolves field-level state access through aliases and helper arguments', async () => {
    const report = await sampleReport(`use anchor_lang::prelude::*;
#[program] pub mod p {
  pub fn update(ctx: Context<Update>) -> Result<()> {
    let vault_alias = &mut ctx.accounts.vault;
    apply_update(vault_alias);
    move_lamports(&ctx.accounts.vault.to_account_info());
    Ok(())
  }
}
fn apply_update(vault: &mut Vault) { vault.balance += 1; let _authority = vault.authority; }
fn move_lamports(vault_info: &AccountInfo) { vault_info.add_lamports(1); }
#[derive(Accounts)] pub struct Update<'info> { #[account(mut)] pub vault: Account<'info, Vault> }
#[account] pub struct Vault { pub balance: u64, pub authority: Pubkey }`);
    const program = report.programs[0]; const dossier = program.instructionDossiers?.[0]!;
    const vault = dossier.accounts.find(item => item.name === 'vault')!;
    assert.ok(vault.stateAccesses.some(item => item.functionName === 'apply_update' && item.operation === 'data-write' && item.fieldPath === 'balance' && item.resolved));
    assert.ok(vault.stateAccesses.some(item => item.functionName === 'apply_update' && item.operation === 'data-read' && item.fieldPath === 'authority' && item.resolved));
    assert.ok(vault.stateAccesses.some(item => item.functionName === 'move_lamports' && item.operation === 'lamport-write' && item.resolved));
    const flow = program.stateFlows?.find(item => item.accountId === vault.accountId)!;
    assert.deepEqual(flow.fieldReads, ['authority']); assert.deepEqual(flow.fieldWrites, ['balance']); assert.equal(flow.accessComplete, true);
    assert.ok(dossier.stateAccesses.some(item => item.functionPath.length === 2 && item.callPath.length === 1));
  });

  it('does not propagate account provenance through unrelated computed values', async () => {
    const report = await sampleReport(`use anchor_lang::prelude::*;
#[program] pub mod p { pub fn inspect(ctx: Context<Inspect>) -> Result<()> { let digest = hash(ctx.accounts.vault.key().as_ref()); let mut copy = digest; copy.bytes[0] = 1; Ok(()) } }
#[derive(Accounts)] pub struct Inspect<'info> { pub vault: Account<'info, Vault> }
#[account] pub struct Vault { pub balance: u64 }
fn hash(_: &[u8]) -> Digest { Digest { bytes: [0; 32] } } struct Digest { bytes: [u8; 32] }`);
    const accesses = report.programs[0].instructions[0].reachableSurface?.stateAccesses ?? [];
    assert.equal(accesses.some(item => item.fieldPath === 'bytes'), false);
  });

  it('tracks native borrow, deserialize, serialize, resize, close, and owner changes as distinct sites', async () => {
    const report = await sampleReport(`use borsh::{BorshDeserialize, BorshSerialize};
#[derive(BorshDeserialize, BorshSerialize)] pub struct State { pub value: u64 }
pub fn process_instruction(accounts: &[AccountInfo]) -> ProgramResult {
  let vault = &accounts[0];
  let mut data = vault.try_borrow_mut_data()?;
  let mut state = State::try_from_slice(&data)?;
  state.value += 1;
  state.serialize(&mut &mut data[..])?;
  vault.realloc(64, true)?;
  vault.assign(&crate::ID);
  vault.close(destination)?;
  Ok(())
}`);
    const program = report.programs[0]; const operations = new Set(program.stateAccessSites?.map(item => item.operation));
    for (const operation of ['data-write', 'deserialize', 'serialize', 'realloc', 'owner-change', 'close']) assert.equal(operations.has(operation as never), true, `missing ${operation}`);
    const flow = program.stateFlows?.[0]!;
    assert.ok(flow.accessSiteIds.length >= 6); assert.deepEqual(flow.fieldWrites, ['value']);
    assert.ok(program.instructions[0].reachableSurface?.reallocSites?.some(item => item.startsWith('instruction-access:')));
    assert.ok(program.instructions[0].reachableSurface?.closeSites?.some(item => item.startsWith('instruction-access:')));
  });

  it('models current Pinocchio AccountView safe, unchecked, pointer, owner, resize, and close APIs', async () => {
    const report = await sampleReport(`use pinocchio::{AccountView, Resize};
pub fn process_instruction(accounts: &mut [AccountView]) -> ProgramResult {
  let account = &mut accounts[0];
  let _read = account.try_borrow()?;
  let _raw = unsafe { account.borrow_unchecked_mut() };
  let _ptr = account.data_mut_ptr();
  unsafe { account.assign(&ID); }
  account.resize_unchecked(64)?;
  unsafe { account.close_unchecked(); }
  Ok(())
}`);
    const account = report.programs[0].accounts.find(item => item.name === 'account')!;
    assert.equal(account.writable, true); assert.deepEqual(account.dataAccess, ['read', 'write']);
    const operations = new Set(report.programs[0].instructions[0].reachableSurface?.stateAccesses?.map(item => item.operation));
    for (const operation of ['data-read', 'data-write', 'owner-change', 'realloc', 'close']) assert.equal(operations.has(operation as never), true, `missing ${operation}`);
  });

  it('extracts Shank tuple-variant arguments for source and IDL reconciliation', async () => {
    const report = await sampleReport('#[derive(ShankInstruction)] enum Instruction { AddCar(AddCarArgs), #[account(0, sig, writ, name="vault")] Reset } struct AddCarArgs { value: u64 }');
    const instruction = report.programs[0].instructions.find(item => item.name === 'AddCar');
    assert.deepEqual(instruction?.arguments, [{ name: 'addCarArgs', type: 'AddCarArgs' }]); assert.equal(instruction?.discriminator, '0');
    assert.equal(report.programs[0].instructions.find(item => item.name === 'Reset')?.discriminator, '1');
    const account = report.programs[0].accounts.find(item => item.name === 'vault')!; assert.equal(account.signer, true); assert.equal(account.writable, true);
  });
});

async function sampleReport(source: string) { return analyzeSources([{ uri: 'file:///fixture/lib.rs', source, packageName: 'fixture' }], wasm); }
