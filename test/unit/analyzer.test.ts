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
import { normalizeIdl, normalizeIdls, reconcileIdl, reconcileIdls } from '../../src/idl/reconciliation';
import { parseRust } from '../../src/parser/rustParser';
import { buildCallGraph } from '../../src/analysis/callGraph';
import { discoverIdls } from '../../src/idl/discovery';
import { portableReport } from '../../src/core/serialization';
import { buildScope } from '../../src/core/scope';
import { diffReports } from '../../src/core/diff';
import { validateReport } from '../../src/analysis/invariants';
import { applyCargoMetadata } from '../../src/discovery/cargoMetadata';

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
    assert.equal(program.securitySurface.cpiSites.length, 2);
    assert.equal(program.securitySurface.pdaSites.length, 2);
    assert.deepEqual(program.securitySurface.cpiSites.map(site => site.location.startLine), [2, 3]);
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

  it('normalizes the current Solana IDL v0.1 shape without false name or state mismatches', () => {
    const idl = normalizeIdl({
      address: '111', metadata: { name: 'demo', version: '1.2.3', spec: '0.1.0', dependencies: [{ name: 'token', version: '1.0.0' }], deployments: { mainnet: null, testnet: null, devnet: '111', localnet: null } },
      instructions: [{ name: 'doThing', discriminator: [1, 2, 3], docs: ['Does a thing'], accounts: [{ name: 'group', accounts: [{ name: 'authority', signer: true }, { name: 'vault', writable: true, address: 'vault-address', relations: ['authority'], pda: { seeds: [{ kind: 'const', value: [118] }] } }] }], args: [{ name: 'inputData', type: { defined: { name: 'Payload' } } }], returns: 'u64' }],
      accounts: [{ name: 'Vault', discriminator: [9] }], types: [{ name: 'Payload', serialization: 'borsh', type: { kind: 'struct', fields: [{ name: 'value', type: 'u64' }] } }],
      events: [{ name: 'Changed', discriminator: [7] }], constants: [{ name: 'MAX', type: 'u64', value: '10' }]
    })!;
    assert.equal(idl.name, 'demo'); assert.equal(idl.spec, '0.1.0'); assert.equal(idl.instructions[0].returns, 'u64'); assert.equal(idl.instructions[0].arguments?.[0].type, 'Payload');
    assert.deepEqual(idl.instructions[0].accounts[1].compositePath, ['group']); assert.equal(idl.instructions[0].accounts[1].address, 'vault-address'); assert.deepEqual(idl.instructions[0].accounts[1].relations, ['authority']);
    assert.deepEqual(idl.constants, [{ name: 'MAX', type: 'u64', value: '10', docs: undefined }]); assert.deepEqual(idl.validationErrors, []);
    const result = reconcileIdl({
      instructions: [{ name: 'do_thing', discriminator: '[1,2,3]', arguments: [{ name: 'input_data', type: 'Payload' }], location: { uri: 'x', startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 }, confidence: 1, evidence: [] }],
      accounts: [
        { id: 'account:authority', name: 'authority', type: 'Signer', signer: true, location: { uri: 'x', startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 }, confidence: 1, evidence: [] },
        { id: 'account:vault', name: 'vault', type: 'Account<Vault>', writable: true, constraints: [{ kind: 'seeds', location: { uri: 'x', startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 } }], location: { uri: 'x', startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 }, confidence: 1, evidence: [] }
      ],
      relationships: [{ instructionId: 'do_thing', accountId: 'account:authority', relationship: 'signer' }, { instructionId: 'do_thing', accountId: 'account:vault', relationship: 'writes' }],
      stateTypes: [{ id: 'state:Vault', name: 'Vault', package: 'demo', fields: [], visibility: 'pub', serialization: ['borsh'], zeroCopy: false, dynamicSize: false, pdaIds: [], initializationSites: [], reallocSites: [], closeSites: [], evidence: [], location: { uri: 'x', startLine: 2, startColumn: 0, endLine: 2, endColumn: 1 } }], identity: { programId: '111', sources: [], conflicts: [] }
      , events: [{ id: 'event:Changed', name: 'Changed', framework: 'anchor', location: { uri: 'x', startLine: 3, startColumn: 0, endLine: 3, endColumn: 1 }, emissionSites: [], evidence: [] }]
    }, idl);
    assert.equal(result.reconciliations.some(item => item.status === 'SOURCE_ONLY' || item.status === 'IDL_ONLY' || item.status === 'MISMATCH'), false, JSON.stringify(result.reconciliations));
  });

  it('reports malformed current-spec IDLs while retaining them for evidence', () => {
    const idl = normalizeIdl({ metadata: { name: 'demo', version: '1', spec: '0.1.0' }, instructions: [{ name: 'run' }] })!;
    assert.deepEqual(idl.validationErrors, ['v0.1.0 requires address.', 'instructions[0] requires a byte-array discriminator.', 'instructions[0] requires accounts.', 'instructions[0] requires args.']);
  });

  it('derives modern Anchor default and literal custom discriminators without inventing event_cpi events', async () => {
    const source = `use anchor_lang::prelude::*;
#[program] mod p {
  pub fn initialize(_ctx: Context<LogContext>) -> Result<()> { Ok(()) }
  #[instruction(discriminator = [1, 2, 3])] pub fn compact(_ctx: Context<LogContext>) -> Result<()> { Ok(()) }
}
#[account] pub struct Vault { pub value: u64 }
#[account(discriminator = b"CV")] pub struct CompactVault { pub value: u8 }
#[event] pub struct Changed { pub value: u64 }
#[event(discriminator = 9)] pub struct CompactChanged { pub value: u8 }
#[event_cpi] #[derive(Accounts)] pub struct LogContext<'info> { pub authority: Signer<'info> }`;
    const report = await analyzeSources([{ uri: 'anchor-discriminators/lib.rs', source, packageName: 'anchor-discriminators' }], wasm);
    const program = report.programs[0];
    assert.equal(program.instructions.find(item => item.name === 'initialize')?.discriminator, '[175,175,109,31,13,152,155,237]');
    assert.equal(program.instructions.find(item => item.name === 'compact')?.discriminator, '[1,2,3]');
    assert.equal(program.stateTypes?.find(item => item.name === 'Vault')?.discriminator, '[211,8,232,43,2,152,117,119]');
    assert.equal(program.stateTypes?.find(item => item.name === 'CompactVault')?.discriminator, '[67,86]');
    assert.deepEqual(program.events?.map(item => [item.name, item.discriminator]), [['Changed', '[78,218,231,86,31,167,245,14]'], ['CompactChanged', '[9]']]);
    assert.equal(program.events?.some(item => item.name === 'LogContext'), false);
  });

  it('derives Anchor and Quasar error codes using declared enum discriminants and offsets', async () => {
    const anchor = await analyzeSources([{ uri: 'errors/anchor.rs', packageName: 'errors', source: `use anchor_lang::prelude::*; #[error_code] enum DefaultErrors { #[msg("first")] First, Second = 7, Third } #[error_code(offset = 100)] enum OffsetErrors { Other }` }], wasm);
    assert.deepEqual(anchor.programs[0].errors?.map(item => [item.name, item.code, item.message]), [['First', 6000, 'first'], ['Second', 6007, undefined], ['Third', 6008, undefined], ['Other', 100, undefined]]);
    const quasar = await analyzeSources([{ uri: 'errors/quasar.rs', packageName: 'errors', source: `use quasar_lang::prelude::*; #[error_code] enum ProgramError { Invalid, Overflow }` }], wasm);
    assert.deepEqual(quasar.programs[0].errors?.map(item => [item.name, item.code, item.framework]), [['Invalid', 6000, 'quasar'], ['Overflow', 6001, 'quasar']]);
  });

  it('normalizes complete Codama roots including additional programs and node semantics', () => {
    const root = {
      kind: 'rootNode', version: '1.0.0', program: {
        kind: 'programNode', name: 'mainProgram', publicKey: 'Main111', version: '2.0.0',
        instructions: [{ kind: 'instructionNode', name: 'writeValue', discriminators: [{ kind: 'fieldDiscriminatorNode', name: 'tag', offset: 0 }], accounts: [{ kind: 'instructionAccountNode', name: 'vault', isWritable: true, isSigner: false, isOptional: true, defaultValue: { kind: 'pdaValueNode', pda: { kind: 'pdaLinkNode', name: 'vault' }, seeds: [] } }], arguments: [{ kind: 'instructionArgumentNode', name: 'tag', defaultValueStrategy: 'omitted', defaultValue: { kind: 'numberValueNode', number: 7 }, type: { kind: 'numberTypeNode', format: 'u8' } }, { kind: 'instructionArgumentNode', name: 'value', type: { kind: 'optionTypeNode', item: { kind: 'numberTypeNode', format: 'u64' } } }] }],
        accounts: [{ kind: 'accountNode', name: 'vault', idlName: 'Vault', discriminators: [{ kind: 'fieldDiscriminatorNode', name: 'tag', offset: 0 }], data: { kind: 'structTypeNode', fields: [{ kind: 'structFieldTypeNode', name: 'tag', defaultValueStrategy: 'omitted', defaultValue: { kind: 'bytesValueNode', data: '0102', encoding: 'base16' }, type: { kind: 'bytesTypeNode' } }, { kind: 'structFieldTypeNode', name: 'value', type: { kind: 'numberTypeNode', format: 'u64' } }] } }],
        definedTypes: [{ kind: 'definedTypeNode', name: 'payload', type: { kind: 'structTypeNode', fields: [] } }], errors: [{ kind: 'errorNode', name: 'badValue', code: 10, message: 'bad value' }], constants: [], pdas: []
      }, additionalPrograms: [{ kind: 'programNode', name: 'helperProgram', publicKey: 'Help111', instructions: [], accounts: [], definedTypes: [], errors: [], constants: [], pdas: [] }]
    };
    const programs = normalizeIdls(root);
    assert.equal(programs.length, 2); assert.deepEqual(programs.map(item => item.address), ['Main111', 'Help111']);
    assert.equal(programs[0].instructions[0].discriminator, '7'); assert.deepEqual(programs[0].instructions[0].arguments, [{ name: 'value', type: 'Option<u64>', docs: undefined }]);
    assert.deepEqual(programs[0].instructions[0].accounts[0], { name: 'vault', signer: false, writable: true, optional: true, address: undefined, pda: root.program.instructions[0].accounts[0].defaultValue, relations: undefined, docs: undefined, compositePath: undefined });
    assert.equal(programs[0].accounts?.[0].discriminator, '[1,2]'); assert.equal(programs[0].types?.some(item => item.name === 'payload'), true); assert.equal(programs[0].types?.some(item => item.name === 'vault'), true);
  });

  it('normalizes Quasar IDL resolver metadata into shared PDA and address evidence', () => {
    const idl = normalizeIdl({ spec: 'quasar-idl/1.0.0', name: 'q', instructions: [{ name: 'make', discriminator: [0], accounts: [{ name: 'vault', writable: true, resolver: { kind: 'pda', program: { kind: 'programId' }, seeds: [{ kind: 'const', value: [118] }] } }, { name: 'systemProgram', resolver: { kind: 'const', address: '11111111111111111111111111111111' } }], args: [] }] })!;
    assert.equal(idl.instructions[0].accounts[0].pda && typeof idl.instructions[0].accounts[0].pda === 'object', true);
    assert.equal(idl.instructions[0].accounts[1].address, '11111111111111111111111111111111');
  });

  it('reconciles state layouts and resolved discriminators while preserving unknown constant expressions', () => {
    const location = { uri: 'source.rs', startLine: 1, startColumn: 0, endLine: 1, endColumn: 1 };
    const base = { instructions: [{ name: 'run', discriminator: 'CUSTOM_DISC', location, confidence: 1, evidence: [] }], stateTypes: [{ id: 'state:Vault', name: 'Vault', package: 'p', fields: [{ name: 'value', type: 'u64' }], visibility: 'pub', serialization: ['borsh'], zeroCopy: false, discriminator: '[1,2]', dynamicSize: false, pdaIds: [], initializationSites: [], reallocSites: [], closeSites: [], evidence: [], location }], events: [{ id: 'event:Changed', name: 'Changed', discriminator: '[3]', location, emissionSites: [], evidence: [] }] };
    const idl = normalizeIdl({ instructions: [{ name: 'run', discriminator: [9], accounts: [], args: [] }], accounts: [{ name: 'Vault', discriminator: [9] }], types: [{ name: 'Vault', type: { kind: 'struct', fields: [{ name: 'value', type: 'u32' }] } }], events: [{ name: 'Changed', discriminator: [8] }] })!;
    const result = reconcileIdl(base, idl);
    assert.equal(result.reconciliations.find(item => item.item === 'instruction:run.discriminator')?.status, 'UNKNOWN');
    assert.equal(result.reconciliations.find(item => item.item === 'state:Vault.discriminator')?.status, 'MISMATCH');
    assert.equal(result.reconciliations.find(item => item.item === 'state:Vault.field:0.type')?.status, 'MISMATCH');
    assert.equal(result.reconciliations.find(item => item.item === 'event:Changed.discriminator')?.status, 'MISMATCH');
  });

  it('normalizes Shank discriminants and honors Shank field IDL overrides during reconciliation', async () => {
    const legacy = normalizeIdl({ instructions: [{ name: 'Create', discriminant: { type: 'u8', value: 4 }, accounts: [], args: [] }] })!;
    assert.equal(legacy.instructions[0].discriminator, '4');
    const source = `use shank::ShankAccount; #[derive(BorshSerialize, BorshDeserialize, ShankAccount)] pub struct Metadata { pub value: u32, #[idl_name("displayValue")] #[idl_type("u64")] pub wrapped: Wrapper, #[skip] pub internal: String }`;
    const report = await analyzeSources([{ uri: 'shank-fields/lib.rs', source, packageName: 'shank-fields' }], wasm);
    const idl = normalizeIdl({ instructions: [], accounts: [{ name: 'Metadata', type: { kind: 'struct', fields: [{ name: 'value', type: 'u32' }, { name: 'displayValue', type: 'u64' }] } }] })!;
    const result = reconcileIdl(report.programs[0], idl);
    assert.equal(result.reconciliations.some(item => item.status === 'MISMATCH'), false, JSON.stringify(result.reconciliations));
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

  it('follows repository-contained Codama config IDL and additionalIdls paths', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'sealevel-codama-'));
    try {
      await fs.mkdir(path.join(directory, 'interfaces'));
      await fs.writeFile(path.join(directory, 'codama.json'), JSON.stringify({ idl: 'interfaces/custom.json', additionalIdls: ['interfaces/helper.json'] }));
      await fs.writeFile(path.join(directory, 'interfaces/custom.json'), JSON.stringify({ address: 'Main111', metadata: { name: 'main' }, instructions: [] }));
      await fs.writeFile(path.join(directory, 'interfaces/helper.json'), JSON.stringify({ address: 'Help111', metadata: { name: 'helper' }, instructions: [] }));
      const idls = await discoverIdls(directory);
      assert.deepEqual(idls.map(item => item.name), ['main', 'helper']);
    } finally { await fs.rm(directory, { recursive: true, force: true }); }
  });

  it('keeps native account relationships evidence-backed', async () => {
    const source = 'pub fn process_instruction(accounts: &[AccountInfo]) { let authority = &accounts[0]; if authority.is_signer { invoke(&[], &[]); } }';
    const report = await analyzeSources([{ uri: 'native-rel/lib.rs', source, packageName: 'native-rel' }], wasm);
    assert.equal(report.programs[0].relationships?.length, 1);
    assert.equal(report.programs[0].relationships?.[0].relationship, 'signer');
    assert.equal(report.programs[0].accounts.find(account => account.name === 'authority')?.index, 0);
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
    const report = await analyzeSources([{ uri: 'file:///repo/program/src/lib.rs', source: 'use anchor_lang::prelude::*; #[program] mod p { pub fn run(ctx: Context<A>) {} } #[derive(Accounts)] struct A<\'info> { signer: Signer<\'info> }', packageName: 'program', manifestUri: '/repo/program/Cargo.toml' }], wasm);
    report.workspaceGraph = { workspaces: [{ rootUri: '/repo', manifestUri: '/repo/Cargo.toml', members: ['/repo/program'], excluded: ['/repo/ignored'], defaultMembers: ['/repo/program'] }], packages: [], dependencyEdges: [], diagnostics: [] };
    const portable = portableReport(report, '/repo');
    assert.equal(portable.files[0].uri, 'program/src/lib.rs');
    assert.equal(portable.programs[0].manifestUri, 'program/Cargo.toml');
    assert.equal(portable.workspaceGraph?.workspaces[0].rootUri, '.');
    assert.deepEqual(portable.workspaceGraph?.workspaces[0].members, ['program']);
    assert.doesNotMatch(JSON.stringify(portable), /file:\/\/\/repo\//); assert.equal(portable.auditManifest?.programs[0].instructionDossierIds[0], portable.programs[0].instructionDossiers?.[0].id);
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
    assert.deepEqual(changed, [{ id: 'diff:function:crate::added', after: 1 }, { id: 'diff:function:crate::removed', before: 1 }]);
  });

  it('models Cargo workspace inheritance, targets, features, and target dependencies', () => {
    const graph = buildCargoGraph([
      { uri: '/repo/Cargo.toml', text: '[workspace]\nmembers=["program"]\ndefault-members=["program"]\nresolver="2"\n[workspace.package]\nversion="1.2.3"\nedition="2021"\n[workspace.dependencies]\nsolana-program={version="3",features=["borsh"]}' },
      { uri: '/repo/program/Cargo.toml', fileUris: ['/repo/program/src/custom.rs', '/repo/program/src/main.rs', '/repo/program/build.rs'], text: '[package]\nname="program"\nversion.workspace=true\nedition.workspace=true\n[lib]\npath="src/custom.rs"\ncrate-type=["cdylib","lib"]\n[[bin]]\nname="client"\npath="src/main.rs"\n[dependencies]\nsolana-program={workspace=true,default-features=false}\n[target.\'cfg(unix)\'.dev-dependencies]\nhelper={version="1",optional=true,features=["x"]}\n[features]\ndefault=["fast"]\nfast=[]' }
    ], new Map([['/repo/program', ['entrypoint!(process_instruction);']]]));
    const pkg = graph.packages[0];
    assert.deepEqual(graph.workspaces[0].defaultMembers, ['/repo/program']);
    assert.equal(graph.workspaces[0].resolver, '2');
    assert.equal(pkg.version, '1.2.3');
    assert.deepEqual(pkg.targets.map(target => [target.kind, target.path]), [['bin', '/repo/program/src/main.rs'], ['build-script', '/repo/program/build.rs'], ['lib', '/repo/program/src/custom.rs']]);
    assert.deepEqual(pkg.dependencies[0].features, ['borsh']);
    assert.equal(pkg.dependencies[0].workspaceInherited, true);
    assert.equal(pkg.dependencies[1].targetCondition, 'cfg(unix)');
    assert.deepEqual(pkg.features[1], { name: 'fast', enables: [], evidence: [{ description: 'Cargo feature fast' }] });
  });

  it('reports malformed Cargo manifests and missing members without aborting', () => {
    const graph = buildCargoGraph([
      { uri: '/repo/Cargo.toml', text: '[workspace]\nmembers=["missing"]' },
      { uri: '/repo/bad/Cargo.toml', text: '[package\nname=' }
    ], new Map());
    assert.deepEqual(graph.diagnostics.map(item => item.category), ['cargo', 'cargo']);
    assert.ok(graph.diagnostics.some(item => item.message.includes('Invalid Cargo manifest TOML')));
    assert.ok(graph.diagnostics.some(item => item.message.includes('matched no discovered manifest')));
  });

  it('resolves qualified cross-file calls with module-aware symbols', async () => {
    const report = await analyzeSources([
      { uri: 'file:///repo/src/lib.rs', source: '#[program]\npub mod p { pub fn go() { crate::helpers::helper(); } }', packageName: 'p', packageRoot: '/repo' },
      { uri: 'file:///repo/src/helpers.rs', source: 'pub fn helper() { invoke(&[], &[]); }', packageName: 'p', packageRoot: '/repo' }
    ], wasm);
    const call = report.programs[0].callGraph?.calls.find(item => item.sourceExpression === 'crate::helpers::helper');
    assert.equal(call?.status, 'resolved');
    assert.equal(call?.target, 'crate::helpers::helper');
    assert.equal(report.programs[0].instructions[0].reachableSurface?.cpis.length, 1);
    assert.equal(report.programs[0].instructions[0].reachableSurface?.complete, false);
  });

  it('resolves import aliases and exposes dynamic method calls', async () => {
    const report = await analyzeSources([{ uri: 'file:///repo/src/lib.rs', packageName: 'p', packageRoot: '/repo', source: 'mod checks { pub fn validate() {} } use crate::checks::validate as check; fn run() { check(); account.validate(); }' }], wasm);
    const calls = report.programs[0].callGraph!.calls;
    assert.equal(calls.find(item => item.sourceExpression === 'check')?.target, 'crate::checks::validate');
    assert.equal(calls.find(item => item.sourceExpression === 'account.validate')?.status, 'dynamic');
  });

  it('handles recursive call cycles with deduplicated reachability', async () => {
    const source = '#[program]\npub mod p { pub fn go() { a(); } } fn a() { b(); } fn b() { a(); }';
    const report = await analyzeSources([{ uri: 'cycle.rs', source, packageName: 'cycle' }], wasm);
    assert.deepEqual(report.programs[0].instructions[0].reachableSurface?.functions, ['crate::a', 'crate::b', 'crate::p::go']);
  });

  it('extracts modern Anchor account semantics and lifecycle exactly', async () => {
    const source = '#[program]\npub mod p { pub fn create(ctx: Context<Create>) {} }\n#[derive(Accounts)]\npub struct Create<\'info> { #[account(init, payer = payer, space = 8 + Vault::INIT_SPACE, seeds = [b"vault", payer.key().as_ref()], bump, owner = crate::ID, realloc = 64, realloc::payer = payer, realloc::zero = true)] pub vault: Account<\'info, Vault>, #[account(mut)] pub payer: Signer<\'info>, #[account(executable)] pub target: UncheckedAccount<\'info> }\n#[account]\npub struct Vault { pub value: u64 }';
    const report = await analyzeSources([{ uri: 'anchor-modern.rs', source, packageName: 'p' }], wasm);
    const vault = report.programs[0].accounts.find(account => account.name === 'vault')!;
    assert.equal(vault.stateType, 'Vault');
    assert.deepEqual(vault.lifecycle, ['init', 'create', 'write', 'realloc']);
    assert.equal(vault.ownerExpectation, 'crate::ID');
    assert.deepEqual(vault.constraints?.map(item => item.kind), ['init', 'payer', 'space', 'seeds', 'bump', 'owner', 'realloc', 'realloc::payer', 'realloc::zero']);
    assert.deepEqual(report.programs[0].securitySurface.pdaSites[0].seeds, ['b"vault"', 'payer.key().as_ref()']);
  });

  it('preserves current Anchor account-to-account relationships and wrapper guarantees', async () => {
    const source = `#[program]
pub mod p { pub fn create(ctx: Context<Create>) {} }
#[derive(Accounts)]
pub struct Create<'info> {
  #[account(init, payer = payer, has_one = authority, close = refund, realloc = 64, realloc::payer = payer, seeds = [b"vault"], bump, seeds::program = other_program.key(), token::mint = mint, token::authority = authority, token::token_program = token_program, extensions::transfer_hook::program_id = hook_program)]
  pub vault: Account<'info, Vault>,
  pub payer: Signer<'info>, pub authority: Signer<'info>, pub refund: SystemAccount<'info>,
  pub other_program: Interface<'info, OtherProgram>, pub token_program: Interface<'info, TokenInterface>, pub clock: Sysvar<'info, Clock>,
  pub mint: InterfaceAccount<'info, Mint>, pub hook_program: UncheckedAccount<'info>
}`;
    const report = await analyzeSources([{ uri: 'anchor-relations.rs', source, packageName: 'anchor-relations' }], wasm);
    const accounts = report.programs[0].accounts;
    const vault = accounts.find(item => item.name === 'vault')!;
    assert.deepEqual(vault.relations?.map(item => [item.kind, item.target]), [
      ['payer', 'payer'], ['has-one', 'authority'], ['close-destination', 'refund'], ['realloc-payer', 'payer'], ['seed-program', 'other_program.key()'],
      ['token-mint', 'mint'], ['token-authority', 'authority'], ['token-program', 'token_program'], ['extension-program', 'hook_program']
    ]);
    assert.equal(accounts.find(item => item.name === 'refund')?.ownerExpectation, 'system-program');
    assert.equal(accounts.find(item => item.name === 'other_program')?.addressExpectation, 'OtherProgram');
    assert.equal(accounts.find(item => item.name === 'clock')?.addressExpectation, 'sysvar:Clock');
    assert.equal(report.programs[0].architecture?.edges.some(item => item.source === vault.id && item.label === 'has-one'), true);
  });

  it('models Anchor associated-token initialization as its actual generated CPI', async () => {
    const source = `#[program] pub mod p { pub fn create(ctx: Context<Create>) {} }
#[derive(Accounts)] pub struct Create<'info> {
#[account(init_if_needed, payer = payer, associated_token::mint = mint, associated_token::authority = authority, associated_token::token_program = token_program)] pub ata: InterfaceAccount<'info, TokenAccount>,
pub payer: Signer<'info>, pub authority: Signer<'info>, pub mint: InterfaceAccount<'info, Mint>, pub token_program: Interface<'info, TokenInterface>, pub system_program: Program<'info, System>, pub associated_token_program: Program<'info, AssociatedToken>
}`;
    const report = await analyzeSources([{ uri: 'anchor-ata.rs', source, packageName: 'anchor-ata' }], wasm);
    const cpi = report.programs[0].securitySurface.cpiSites[0];
    assert.equal(cpi.targetKind, 'associated-token'); assert.equal(cpi.operation, 'associated-token.create-idempotent'); assert.equal(cpi.operationCategory, 'token-account-create');
  });

  it('recognizes current Pinocchio lazy entrypoints', async () => {
    const source = 'use pinocchio::{lazy_program_entrypoint, entrypoint::InstructionContext, ProgramResult}; lazy_program_entrypoint!(process_instruction); pub fn process_instruction(mut context: InstructionContext) -> ProgramResult { let _ = context.instruction_data(); Ok(()) }';
    const report = await analyzeSources([{ uri: 'pinocchio-lazy.rs', source, packageName: 'pinocchio-lazy' }], wasm);
    assert.equal(report.programs[0].frameworkEvidence.some(item => item.framework === 'pinocchio' && item.evidence.some(evidence => evidence.description === 'lazy_program_entrypoint!')), true);
    assert.equal(report.programs[0].instructions.some(item => item.handler === 'process_instruction' && item.evidence.some(evidence => evidence.description.includes('explicit entrypoint'))), true);
  });

  it('extracts Steel macro discriminators, fields, and chain validation semantics', async () => {
    const source = `use steel::*;
#[repr(u8)] pub enum MyInstruction { Add = 7 }
#[repr(C)] pub struct Add { pub value: [u8; 8] }
instruction!(MyInstruction, Add);
#[repr(u8)] pub enum MyAccount { Counter = 2 }
#[repr(C)] #[derive(Pod, Zeroable)] pub struct Counter { pub value: u64 }
account!(MyAccount, Counter);
pub fn process_add(accounts: &[AccountInfo<'_>]) -> ProgramResult { let [counter_info, token_program] = accounts else { return Err(ProgramError::NotEnoughAccountKeys); }; let counter = counter_info.as_account_mut::<Counter>(&ID)?; token_program.is_program(&spl_token::ID)?; Ok(()) }`;
    const report = await analyzeSources([{ uri: 'steel-current.rs', source, packageName: 'steel-current' }], wasm);
    const instruction = report.programs[0].instructions.find(item => item.name === 'Add')!;
    assert.equal(instruction.discriminator, '7'); assert.deepEqual(instruction.arguments, [{ name: 'value', type: '[u8; 8]' }]);
    assert.equal(report.programs[0].accounts.find(item => item.wrapperType === 'SteelAccount')?.constraints?.[0].expression, '2');
    assert.equal(report.programs[0].stateTypes?.find(item => item.name === 'Counter')?.framework, 'steel');
    assert.equal(report.programs[0].stateTypes?.find(item => item.name === 'Counter')?.discriminator, '2');
    const counter = report.programs[0].accounts.find(item => item.name === 'counter_info')!;
    assert.equal(counter.stateType, 'Counter'); assert.equal(counter.ownerExpectation, '&ID'); assert.equal(counter.writable, true);
    const tokenProgram = report.programs[0].accounts.find(item => item.name === 'token_program')!;
    assert.equal(tokenProgram.executable, true); assert.equal(tokenProgram.addressExpectation, '&spl_token::ID');
  });

  it('imports saved Cargo metadata as an offline resolved graph', () => {
    const graph = buildCargoGraph([
      { uri: '/repo/Cargo.toml', text: '[workspace]\nmembers=["program"]' },
      { uri: '/repo/program/Cargo.toml', text: '[package]\nname="program"\nversion="1.0.0"\n[dependencies]\nanchor-lang="1"' }
    ], new Map([['/repo/program', ['entrypoint!(process_instruction);']]]));
    applyCargoMetadata(graph, {
      version: 1, workspace_root: '/repo', target_directory: '/repo/target', workspace_members: ['path+file:///repo/program#1.0.0'], workspace_default_members: ['path+file:///repo/program#1.0.0'],
      packages: [
        { id: 'path+file:///repo/program#1.0.0', name: 'program', version: '1.0.0', manifest_path: '/repo/program/Cargo.toml' },
        { id: 'registry+https://github.com/rust-lang/crates.io-index#anchor-lang@1.0.0', name: 'anchor-lang', version: '1.0.0', manifest_path: '/cargo/anchor-lang/Cargo.toml', source: 'registry+https://github.com/rust-lang/crates.io-index' }
      ],
      resolve: { root: 'path+file:///repo/program#1.0.0', nodes: [
        { id: 'path+file:///repo/program#1.0.0', features: ['default', 'idl-build'], deps: [{ name: 'anchor_lang', pkg: 'registry+https://github.com/rust-lang/crates.io-index#anchor-lang@1.0.0', dep_kinds: [{ kind: null, target: null }] }] },
        { id: 'registry+https://github.com/rust-lang/crates.io-index#anchor-lang@1.0.0', features: ['default'], deps: [] }
      ] }
    }, '/repo/cargo-metadata.json');
    assert.equal(graph.resolution?.nodes.length, 2); assert.equal(graph.resolution?.dependencyEdges.length, 1);
    assert.deepEqual(graph.packages.find(item => item.name === 'program')?.enabledFeatures, ['default', 'idl-build']);
    assert.deepEqual(graph.packages.find(item => item.name === 'program')?.dependencies[0].resolvedPackageIds, ['registry+https://github.com/rust-lang/crates.io-index#anchor-lang@1.0.0']);
  });

  it('classifies concrete System, Token, and associated-token CPI operations', async () => {
    const source = `fn run() {
      let ix = solana_system_interface::instruction::create_account(&payer, &vault, 1, 8, &ID);
      solana_cpi::invoke_signed(&ix, &accounts, &seeds);
      anchor_spl::token_interface::transfer_checked(ctx, 1, 6);
      anchor_spl::associated_token::create_idempotent(ctx);
    }`;
    const report = await analyzeSources([{ uri: 'cpi-operations.rs', source, packageName: 'cpi-operations' }], wasm);
    assert.deepEqual(report.programs[0].securitySurface.cpiSites.map(item => [item.targetKind, item.operation, item.operationCategory]), [
      ['system-program', 'system.create-account', 'account-creation'],
      ['spl-token', 'token.transfer-checked', 'token-transfer'],
      ['associated-token', 'associated-token.create-idempotent', 'token-account-create']
    ]);
  });

  it('classifies Pinocchio System instruction-builder method CPIs', async () => {
    const source = 'use pinocchio_system::instructions::CreateAccount; fn initialize() { CreateAccount { from: payer, to: vault, lamports: 1, space: 8, owner: &ID }.invoke(); }';
    const report = await analyzeSources([{ uri: 'pinocchio-system-cpi.rs', source, packageName: 'pinocchio-system-cpi' }], wasm);
    const cpi = report.programs[0].securitySurface.cpiSites[0];
    assert.equal(cpi.targetKind, 'system-program'); assert.equal(cpi.operation, 'system.create-account'); assert.equal(cpi.operationCategory, 'account-creation');
  });

  it('counts generic Anchor CPI wrapper calls but not context construction alone', async () => {
    const source = 'use callee::cpi::execute as call_execute; fn run() { call_execute(CpiContext::new(program, accounts)); let unused = CpiContext::new(other, other_accounts); }';
    const report = await analyzeSources([{ uri: 'anchor-custom-cpi.rs', source, packageName: 'anchor-custom-cpi' }], wasm);
    assert.equal(report.programs[0].securitySurface.cpiSites.length, 1);
    assert.equal(report.programs[0].securitySurface.cpiSites[0].target, 'program');
    assert.equal(report.programs[0].securitySurface.cpiSites[0].targetKind, 'custom');
  });

  it('extracts state codecs, sysvars, runtime operations, events, and errors', async () => {
    const source = '#[account(zero_copy)]\n#[derive(Pod, Zeroable)]\npub struct Vault { pub amount: u64, pub key: Pubkey }\n#[event]\npub struct Deposited { pub amount: u64 }\n#[error_code]\npub enum Error { #[msg("bad")] Bad }\nfn run() { let clock = Clock::get(); emit!(Deposited { amount: 1 }); set_return_data(&[]); }';
    const report = await analyzeSources([{ uri: 'semantic.rs', source, packageName: 'semantic' }], wasm);
    const program = report.programs[0];
    assert.deepEqual(program.stateTypes?.[0].serialization, ['zero-copy']);
    assert.equal(program.stateTypes?.[0].staticSize, 40);
    assert.equal(program.sysvars?.[0].name, 'Clock');
    assert.ok(program.runtimeOperations?.some(item => item.kind === 'return-data'));
    assert.equal(program.events?.[0].emissionSites.length, 1);
    assert.equal(program.errors?.[0].message, 'bad');
  });

  it('extracts native indexed, get, and destructured accounts with validations', async () => {
    const source = 'pub fn process_instruction(accounts: &[AccountInfo]) { let payer = &accounts[0]; let vault = accounts.get(1).unwrap(); let [authority, token_program, ..] = accounts else { return; }; if !payer.is_signer || !vault.is_writable || !token_program.executable || vault.owner != expected { return; } vault.try_borrow_mut_data(); }';
    const report = await analyzeSources([{ uri: 'native-accounts.rs', source, packageName: 'native' }], wasm);
    const accounts = report.programs[0].accounts.filter(item => item.name).map(item => ({ name: item.name, index: item.index, signer: item.signer, writable: item.writable, executable: item.executable, owner: item.ownerExpectation }));
    assert.deepEqual(accounts.slice(0, 4), [
      { name: 'payer', index: 0, signer: true, writable: false, executable: false, owner: undefined },
      { name: 'vault', index: 1, signer: false, writable: true, executable: false, owner: 'expected' },
      { name: 'authority', index: 0, signer: false, writable: false, executable: false, owner: undefined },
      { name: 'token_program', index: 1, signer: false, writable: false, executable: true, owner: undefined }
    ]);
  });

  it('parses PDA seeds structurally and links signed CPI sites', async () => {
    const source = 'fn run(authority: Pubkey) { let pda = Pubkey::find_program_address(&[b"vault", authority.as_ref()], &ID); invoke_signed(&ix, &accounts, &[&[b"vault", &[bump]]]); }';
    const report = await analyzeSources([{ uri: 'pda.rs', source, packageName: 'pda' }], wasm);
    const program = report.programs[0];
    assert.deepEqual(program.securitySurface.pdaSites[0].seeds, ['b"vault"', 'authority.as_ref()']);
    assert.equal(program.securitySurface.pdaSites[0].usedAsSigner, true);
    assert.deepEqual(program.securitySurface.cpiSites[0].signerPdaIds, [program.securitySurface.pdaSites[0].id]);
  });

  it('reports detailed IDL account privilege and ordering mismatches', async () => {
    const report = await analyzeSources([{ uri: 'anchor/lib.rs', source: await fixture('anchor-basic'), packageName: 'anchor' }], wasm);
    const idl = normalizeIdl({ instructions: [{ name: 'initialize', accounts: [{ name: 'authority', writable: false }, { name: 'vault', signer: false }] }] })!;
    const result = reconcileIdl(report.programs[0], idl);
    assert.ok(result.reconciliations.some(item => item.item.endsWith('.order') && item.status === 'MISMATCH'));
    assert.ok(result.reconciliations.some(item => item.item.endsWith('.writable') && item.status === 'MISMATCH'));
  });

  it('keeps report graph and summary invariants valid', async () => {
    const report = await analyzeSources([{ uri: 'anchor/lib.rs', source: await fixture('anchor-basic'), packageName: 'anchor' }], wasm);
    assert.deepEqual(validateReport(report), []);
  });
});
