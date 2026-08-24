import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { analyzeSources } from '../../src/analysis/analyzer';
import { classifyPackage } from '../../src/discovery/cargoDiscovery';
import { countLines } from '../../src/utils/text';
import { buildCargoGraph } from '../../src/discovery/cargoGraph';
import { enrichSteel } from '../../src/adapters/steelAdapter';
import { enrichQuasar } from '../../src/adapters/quasarAdapter';
import { normalizeIdl, reconcileIdl, reconcileIdls } from '../../src/idl/reconciliation';
import { parseRust } from '../../src/parser/rustParser';
import { buildCallGraph } from '../../src/analysis/callGraph';
import { discoverIdls } from '../../src/idl/discovery';
import { portableReport } from '../../src/core/serialization';
import { buildScope } from '../../src/core/scope';
import { diffReports } from '../../src/core/diff';

const root = path.resolve(__dirname, '../../../test');
const wasm = path.resolve(__dirname, '../../../resources/parsers/tree-sitter-rust.wasm');

async function fixture(name: string): Promise<string> {
  return fs.readFile(path.join(root, 'fixtures', name, 'lib.rs'), 'utf8');
}

describe('Sealevel Insight analyzer', () => {
  it('extracts generic and Anchor signals with source locations', async () => {
    const report = await analyzeSources([{ uri: 'anchor/lib.rs', source: await fixture('anchor-basic'), packageName: 'anchor' }], wasm);
    assert.equal(report.summary.functions, 1);
    assert.equal(report.summary.instructions, 1);
    assert.ok(report.summary.pdas >= 1 || report.summary.signerSignals >= 1);
    assert.ok(report.programs[0].frameworkEvidence.some(evidence => evidence.framework === 'anchor'));
    assert.equal(report.programs[0].functions[0].location.startLine, 5);
    assert.ok(report.programs[0].accounts.some(account => account.constraints?.some(constraint => constraint.kind === 'seeds')));
    assert.ok((report.programs[0].architecture?.edges.length ?? 0) > 0);
    assert.ok((report.programs[0].relationships?.length ?? 0) > 0);
  });

  it('analyzes unknown frameworks through generic Rust metrics', async () => {
    const report = await analyzeSources([{ uri: 'custom/lib.rs', source: await fixture('custom-basic'), packageName: 'custom' }], wasm);
    assert.equal(report.programs[0].frameworkEvidence.length, 0);
    assert.equal(report.summary.functions, 1);
    assert.ok(report.programs[0].functions[0].complexity >= 3);
  });

  it('enriches native and Pinocchio patterns independently', async () => {
    const report = await analyzeSources([
      { uri: 'native/lib.rs', source: await fixture('native-basic'), packageName: 'native' },
      { uri: 'pinocchio/lib.rs', source: await fixture('pinocchio-basic'), packageName: 'pinocchio' }
    ], wasm);
    assert.equal(report.programs.length, 2);
    assert.ok(report.programs[0].frameworkEvidence.some(evidence => evidence.framework === 'native-solana'));
    assert.ok(report.programs[1].frameworkEvidence.some(evidence => evidence.framework === 'pinocchio'));
    assert.ok(report.summary.cpis >= 2);
  });

  it('keeps analyzing when one file is malformed', async () => {
    const report = await analyzeSources([
      { uri: 'bad/lib.rs', source: 'pub fn broken( {' , packageName: 'bad' },
      { uri: 'good/lib.rs', source: await fixture('custom-basic'), packageName: 'good' }
    ], wasm);
    assert.equal(report.programs.length, 2);
    assert.equal(report.summary.functions, 1);
    assert.equal(report.diagnostics.length, 1);
  });

  it('serializes a deterministic JSON-compatible report', async () => {
    const report = await analyzeSources([{ uri: 'custom/lib.rs', source: await fixture('custom-basic'), packageName: 'custom' }], wasm);
    const parsed = JSON.parse(JSON.stringify(report));
    assert.equal(parsed.programs[0].name, 'custom');
    assert.equal(typeof parsed.generatedAt, 'string');
  });

  it('classifies Cargo packages without treating every crate as a program', () => {
    assert.equal(classifyPackage('[package]\nname="math"\n[lib]', 'pub fn add() {}').kind, 'library');
    assert.equal(classifyPackage('[package]\nname="state"\n[dependencies]\nsolana-program="2"', 'pub struct State;').kind, 'library');
    assert.equal(classifyPackage('[dependencies]\nsolana-program="2"', 'entrypoint!(process_instruction);').kind, 'solana-program');
    assert.equal(classifyPackage('[[test]]\nname="integration_test"', '#[test] fn test() {}').kind, 'test');
  });

  it('extracts every CPI and PDA call with exact locations', async () => {
    const source = `pub fn flow() {\n  invoke(&a);\n  solana_cpi::invoke_signed(&a, &b, &c);\n  CpiContext::new(x, y);\n  let first = find_program_address(&[b"a"], &id);\n  let second = create_program_address(&[b"b"], &id);\n}`;
    const report = await analyzeSources([{ uri: 'flow/lib.rs', source, packageName: 'flow' }], wasm);
    const program = report.programs[0];
    assert.equal(program.securitySurface.cpiSites.length, 3);
    assert.equal(program.securitySurface.pdaSites.length, 2);
    assert.deepEqual(program.securitySurface.cpiSites.map(site => site.location.startLine), [2, 3, 4]);
    assert.deepEqual(program.securitySurface.pdaSites.map(site => site.location.startLine), [5, 6]);
    assert.equal(program.securitySurface.cpiSites[1].pdaSigned, true);
  });

  it('counts Rust visibility and lexical comment lines accurately', async () => {
    const source = `// comment\npub fn public_fn() {}\npub(crate) fn crate_fn() {}\npub(super) unsafe fn unsafe_fn() {}\nfn private_fn() { let text = "// not a comment"; /* inline */ }\n/* outer\n /* nested */\nend */\n`;
    const report = await analyzeSources([{ uri: 'metrics/lib.rs', source, packageName: 'metrics' }], wasm);
    const functions = report.programs[0].functions;
    assert.deepEqual(functions.map(fn => fn.visibility), ['pub', 'pub(crate)', 'pub(super)', 'private']);
    assert.equal(functions.filter(fn => fn.isUnsafe).length, 1);
    const counts = countLines(source);
    assert.equal(counts.commentLines, 4);
    assert.equal(counts.codeLines, 4);
  });

  it('resolves Cargo workspace members, path dependencies, and exclusions', () => {
    const graph = buildCargoGraph([
      { uri: '/repo/Cargo.toml', text: '[workspace]\nmembers=["programs/*","libs/state"]\nexclude=["libs/ignored"]' },
      { uri: '/repo/programs/vault/Cargo.toml', text: '[package]\nname="vault"\n[dependencies]\nstate={path="../../libs/state"}' },
      { uri: '/repo/libs/state/Cargo.toml', text: '[package]\nname="state"\n[lib]' },
      { uri: '/repo/libs/ignored/Cargo.toml', text: '[package]\nname="ignored"\n[lib]' }
    ], new Map([['/repo/programs/vault', ['entrypoint!(process_instruction)']], ['/repo/libs/state', ['pub struct State;']]]));
    assert.deepEqual(graph.workspaces[0].members, ['/repo/libs/state', '/repo/programs/vault']);
    assert.equal(graph.packages.find(pkg => pkg.name === 'vault')?.dependencies[0].internalPackageId, 'cargo:/repo/libs/state');
    assert.equal(graph.packages.find(pkg => pkg.name === 'state')?.kind, 'library');
  });

  it('detects Steel and Quasar as additive framework evidence', () => {
    assert.equal(enrichSteel('use steel; instruction!(Withdraw);').at(0)?.framework, 'steel');
    assert.equal(enrichQuasar('use quasar_lang::prelude;').at(0)?.framework, 'quasar');
  });

  it('normalizes and reconciles IDL instructions', () => {
    const idl = normalizeIdl({ address: '111', instructions: [{ name: 'withdraw', accounts: [{ name: 'authority', isSigner: true }] }] });
    assert.equal(idl?.instructions[0].accounts[0].signer, true);
    const result = reconcileIdl({ instructions: [{ name: 'withdraw', location: { uri: 'x', startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 }, confidence: 1, evidence: [] }], identity: { programId: '222', sources: [], conflicts: [] } }, idl!);
    assert.equal(result.reconciliations[0].status, 'MATCHED');
    assert.equal(result.reconciliations[1].status, 'MISMATCH');
  });

  it('resolves only unambiguous direct calls in a call graph', async () => {
    const parsed = await parseRust('calls.rs', 'fn helper() {} fn handler() { helper(); missing(); }', wasm);
    const graph = buildCallGraph([{ uri: 'calls.rs', root: parsed.tree!.rootNode }], [{ name: 'helper', location: { uri: 'calls.rs', startLine: 1, startColumn: 0, endLine: 1, endColumn: 12 }, lines: 1, complexity: 1, parameters: 0, isPublic: false, isUnsafe: false }]);
    assert.equal(graph.calls.length, 2);
    assert.equal(graph.edges.length, 1);
    assert.equal(graph.calls.find(call => call.callee === 'missing')?.resolved, false);
  });

  it('propagates reachable helper surfaces to instructions', async () => {
    const source = `#[program]\npub mod p { pub fn go() { helper(); } }\nfn helper() { invoke_signed(&[], &[], &[]); }`;
    const report = await analyzeSources([{ uri: 'reach/lib.rs', source, packageName: 'reach' }], wasm);
    assert.equal(report.programs[0].instructions[0].reachableSurface?.cpis.length, 1);
    assert.ok(report.programs[0].instructions[0].reachableSurface?.functions.some(name => name.endsWith('helper')));
  });

  it('discovers IDL files without invoking external tools', async () => {
    const idls = await discoverIdls(path.resolve(root, 'fixtures'));
    assert.equal(idls.length, 1);
    assert.equal(idls[0].instructions[0].name, 'withdraw');
  });

  it('keeps native account relationships evidence-backed', async () => {
    const source = 'pub fn process_instruction(accounts: &[AccountInfo]) { let authority = &accounts[0]; if authority.is_signer { invoke(&[], &[]); } }';
    const report = await analyzeSources([{ uri: 'native-rel/lib.rs', source, packageName: 'native-rel' }], wasm);
    assert.equal(report.programs[0].relationships?.length, 1);
    assert.equal(report.programs[0].relationships?.[0].relationship, 'unknown');
  });

  it('extracts Pinocchio current-style signals', async () => {
    const source = 'use pinocchio::account_info::AccountView; pub fn process_entrypoint(accounts: &mut [AccountView]) -> ProgramResult { pinocchio::cpi::invoke_signed(&[], accounts, &[]); }';
    const report = await analyzeSources([{ uri: 'pinocchio-current/lib.rs', source, packageName: 'pinocchio-current' }], wasm);
    assert.equal(report.programs[0].frameworkEvidence.some(item => item.framework === 'pinocchio'), true);
    assert.equal(report.summary.cpis, 1);
    assert.equal(report.summary.pdaSignedCpis, 1);
  });

  it('uses semantic Steel and Quasar extraction without aliasing them to Anchor', async () => {
    const steel = await analyzeSources([{ uri: 'steel/lib.rs', source: await fixture('steel-basic'), packageName: 'steel' }], wasm);
    const quasar = await analyzeSources([{ uri: 'quasar/lib.rs', source: await fixture('quasar-basic'), packageName: 'quasar' }], wasm);
    assert.equal(steel.programs[0].frameworkEvidence.some(item => item.framework === 'steel'), true);
    assert.equal(quasar.programs[0].frameworkEvidence.some(item => item.framework === 'quasar'), true);
    assert.equal(quasar.programs[0].instructions.some(item => item.name === 'withdraw'), true);
  });

  it('propagates workspace dependency graph into report inputs', async () => {
    const graph = buildCargoGraph([{ uri: '/repo/Cargo.toml', text: '[workspace]\nmembers=["program"]' }, { uri: '/repo/program/Cargo.toml', text: '[package]\nname="program"' }], new Map([['/repo/program', ['pub fn handler() {}']]]));
    const report = await analyzeSources([{ uri: 'program/lib.rs', source: 'pub fn handler() {}', packageName: 'program', workspaceGraph: graph }], wasm);
    assert.equal(report.workspaceGraph?.packages[0].name, 'program');
    assert.equal(report.workspaceGraph?.workspaces[0].members[0], '/repo/program');
  });

  it('preserves account relationship IDs in architecture edges', async () => {
    const report = await analyzeSources([{ uri: 'anchor/lib.rs', source: await fixture('anchor-basic'), packageName: 'anchor' }], wasm);
    const program = report.programs[0];
    const accountIds = new Set(program.accounts.map(account => account.id));
    const relationship = program.relationships?.find(item => accountIds.has(item.accountId));
    assert.ok(relationship);
    assert.ok(program.architecture?.edges.some(edge => edge.target === relationship.accountId && ['reads', 'writes', 'signs'].includes(edge.type)));
  });

  it('does not resolve ambiguous short function names', async () => {
    const source = 'mod a { fn helper() {} } mod b { fn helper() {} } fn handler() { helper(); }';
    const report = await analyzeSources([{ uri: 'ambiguous/lib.rs', source, packageName: 'ambiguous' }], wasm);
    assert.equal(report.programs[0].callGraph?.calls.find(call => call.callee === 'helper')?.resolved, false);
  });

  it('builds external program summaries and reachable CPI links', async () => {
    const source = '#[program]\npub mod p { pub fn go() { helper(); } }\nfn helper() { invoke_signed(&[], &[], &[]); }';
    const report = await analyzeSources([{ uri: 'external/lib.rs', source, packageName: 'external' }], wasm);
    const program = report.programs[0];
    assert.equal(program.externalPrograms?.[0].signedCpiCount, 1);
    assert.deepEqual(program.instructions[0].reachableSurface?.externalPrograms, [program.externalPrograms?.[0].id]);
  });

  it('extracts program identity conflicts and review hotspots', async () => {
    const source = 'declare_id!("111"); declare_id!("222"); pub unsafe fn risky(account: AccountInfo) { if true { if true { invoke(&[], &[]); invoke(&[], &[]); } } }';
    const report = await analyzeSources([{ uri: 'identity/lib.rs', source, packageName: 'identity' }], wasm);
    assert.equal(report.programs[0].identity?.programId, '111');
    assert.equal(report.programs[0].identity?.conflicts.length, 1);
    assert.ok((report.reviewProfile?.length ?? 0) > 0);
    assert.equal(report.programs[0].reviewHotspots?.[0].location?.uri, 'identity/lib.rs');
  });

  it('reconciles each IDL with its matching source program', () => {
    const location = { uri: 'x', startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 };
    const programs = [
      { name: 'vault-one', rustFiles: [], functions: [], instructions: [{ name: 'deposit', location, confidence: 1, evidence: [] }], accounts: [], frameworkEvidence: [], securitySurface: { signerSignals: 0, writableSignals: 0, ownerValidationSignals: 0, addressValidationSignals: 0, remainingAccounts: 0, rawOrUncheckedAccounts: 0, manualAccountIteration: 0, unsafeBlocks: 0, manualSignerChecks: 0, manualOwnerChecks: 0, manualWritableChecks: 0, manualAddressChecks: 0, manualSerialization: 0, reallocOperations: 0, unsafeFunctions: 0, cpiSites: [], pdaSites: [] } },
      { name: 'vault-two', rustFiles: [], functions: [], instructions: [{ name: 'withdraw', location, confidence: 1, evidence: [] }], accounts: [], frameworkEvidence: [], securitySurface: { signerSignals: 0, writableSignals: 0, ownerValidationSignals: 0, addressValidationSignals: 0, remainingAccounts: 0, rawOrUncheckedAccounts: 0, manualAccountIteration: 0, unsafeBlocks: 0, manualSignerChecks: 0, manualOwnerChecks: 0, manualWritableChecks: 0, manualAddressChecks: 0, manualSerialization: 0, reallocOperations: 0, unsafeFunctions: 0, cpiSites: [], pdaSites: [] } }
    ];
    const result = reconcileIdls(programs, [
      { sourceUri: 'file:///target/idl/vault_one.json', instructions: [{ name: 'deposit', accounts: [] }] },
      { sourceUri: 'file:///target/idl/vault_two.json', instructions: [{ name: 'withdraw', accounts: [] }] }
    ]);
    assert.deepEqual(result.reconciliations.map(item => item.status), ['MATCHED', 'MATCHED']);
  });

  it('makes all report path fields portable without matching sibling prefixes', async () => {
    const report = await analyzeSources([{ uri: 'file:///repo/program/src/lib.rs', source: 'fn run() {}', packageName: 'program', manifestUri: '/repo/program/Cargo.toml' }], wasm);
    report.workspaceGraph = { workspaces: [{ rootUri: '/repo', manifestUri: '/repo/Cargo.toml', members: ['/repo/program'], excluded: ['/repo/ignored'] }], packages: [], dependencyEdges: [] };
    const portable = portableReport(report, '/repo');
    assert.equal(portable.files[0].uri, 'program/src/lib.rs');
    assert.equal(portable.programs[0].manifestUri, 'program/Cargo.toml');
    assert.equal(portable.workspaceGraph?.workspaces[0].rootUri, '.');
    assert.deepEqual(portable.workspaceGraph?.workspaces[0].members, ['program']);
    const outside = portableReport({ ...report, files: [{ ...report.files[0], uri: 'file:///repo-sibling/lib.rs' }] }, '/repo');
    assert.equal(outside.files[0].uri, 'file:///repo-sibling/lib.rs');
  });

  it('includes root-level files in the default scope glob', async () => {
    const scopeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'sealevel-scope-'));
    await fs.writeFile(path.join(scopeRoot, 'root.rs'), 'fn root() {}');
    await fs.mkdir(path.join(scopeRoot, 'generated'));
    await fs.writeFile(path.join(scopeRoot, 'generated', 'copy.rs'), 'fn root() {}');
    try {
      const scope = await buildScope(scopeRoot);
      assert.deepEqual(scope.inScope, ['root.rs']);
      assert.equal(scope.files.find(file => file.path === 'generated/copy.rs')?.duplicateOf, 'root.rs');
    } finally {
      await fs.rm(scopeRoot, { recursive: true, force: true });
    }
  });

  it('reports added and removed functions in report diffs', async () => {
    const before = await analyzeSources([{ uri: 'diff/lib.rs', source: 'fn removed() {}', packageName: 'diff' }], wasm);
    const after = await analyzeSources([{ uri: 'diff/lib.rs', source: 'fn added() {}', packageName: 'diff' }], wasm);
    const changed = diffReports(before, after).changedFunctions;
    assert.deepEqual(changed, [{ id: 'diff:added', after: 1 }, { id: 'diff:removed', before: 1 }]);
  });
});
