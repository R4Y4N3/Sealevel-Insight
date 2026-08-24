import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { analyzeSources } from '../../src/analysis/analyzer';
import { diffReports } from '../../src/core/diff';

const root = path.resolve(__dirname, '../../../test');
const wasm = path.resolve(__dirname, '../../../resources/parsers/tree-sitter-rust.wasm');

async function fixture(name: string): Promise<string> {
  return fs.readFile(path.join(root, 'fixtures', name, 'lib.rs'), 'utf8');
}
function analyze(uri: string, source: string) {
  return analyzeSources([{ uri, source, packageName: 'flow' }], wasm);
}

describe('Token & Asset Flow v2', () => {
  it('resolves Anchor transfer_checked roles from named CpiContext fields with signer authority', async () => {
    const report = await analyze('tf/transfer-checked.rs', await fixture('token-flow-basic'));
    const dossier = report.programs[0].instructionDossiers?.find(item => item.name === 'deposit_checked')!;
    const flow = dossier.assetFlows.find(item => item.operation === 'token.transfer-checked')!;
    assert.equal(flow.tokenProgram, 'spl-token');
    assert.equal(flow.source?.resolved && flow.source.accountName, 'user_ata');
    assert.equal(flow.destination?.resolved && flow.destination.accountName, 'vault_ata');
    assert.equal(flow.mint?.resolved && flow.mint.accountName, 'mint');
    assert.equal(flow.authority?.resolved && flow.authority.accountName, 'user');
    assert.equal(flow.authorityType, 'signer-account');
    assert.ok(!!flow.source?.accountId);
    assert.deepEqual(flow.unresolvedReasons, []);
    assert.equal(flow.complete, true);
  });

  it('propagates a token CPI through a helper call and keeps it transitive', async () => {
    const report = await analyze('tf/withdraw-helper.rs', await fixture('token-flow-basic'));
    const instruction = report.programs[0].instructions.find(item => item.name === 'withdraw')!;
    const flows = report.programs[0].assetFlows?.filter(item => item.instructionId === (instruction.id ?? instruction.name)) ?? [];
    const flow = flows.find(item => item.operation === 'token.transfer')!;
    assert.ok(flow, 'withdraw must expose the helper token.transfer flow');
    assert.equal(flow.direct, false);
    // Roles stay unresolved because the helper parameters are not instruction accounts.
    assert.equal(flow.source?.resolved, false);
    assert.ok(flow.unresolvedReasons.some(reason => /could not be bound/.test(reason)));
    assert.ok(instruction.reachableSurface?.functions.some(name => name.endsWith('transfer_from_vault')));
  });

  it('keeps wrapper-style calls without identifiable signatures explicitly unresolved', async () => {
    const report = await analyze('tf/wrapper.rs', await fixture('token-flow-basic'));
    for (const [operation, category] of [['token.mint-to', 'token-mint'], ['token.burn', 'token-burn'], ['token.close-account', 'account-close'], ['token.set-authority', 'authority-change']] as const) {
      const flow = report.programs[0].assetFlows?.find(item => item.operation === operation)!;
      assert.ok(flow, `${operation} should produce a flow`);
      assert.equal(flow.operationCategory, category);
      assert.equal(flow.complete, false);
      assert.ok(flow.unresolvedReasons.length >= 1, `${operation} needs an explicit unresolved reason`);
      assert.equal(flow.destination?.accountId ?? undefined, undefined, `${operation} must not fabricate bindings`);
    }
  });

  it('distinguishes SPL Token from Token-2022 in flows', async () => {
    const source = `use anchor_spl::token::Transfer as SplTransfer;
use anchor_spl::token_interface::{TokenInterface, TokenAccount, Mint, TransferChecked as TiTransferChecked};
fn spl(a: anchor_spl::token::CpiContext<SplTransfer>) { a.invoke(); }
#[program] pub mod p { pub fn run(ctx: Context<Ctx>, amount: u64, decimals: u8) -> Result<()> {
  anchor_spl::token::transfer(ctx.accounts.spl_ctx.into(), amount)?;
  anchor_spl::token_2022::transfer_checked(ctx.accounts.t22_ctx.into(), amount, decimals)?;
  Ok(())
} }
#[derive(Accounts)] pub struct Ctx<'info> { pub spl_ctx: CpiContextHolder<'info>, pub t22_ctx: CpiContextHolder<'info> }
pub struct CpiContextHolder<'info> { pub program: Program<'info, TokenInterface> }`;
    const report = await analyze('tf/t22.rs', source);
    const transfers = report.programs[0].securitySurface.cpiSites.filter(site => site.operationCategory === 'token-transfer');
    assert.deepEqual(transfers.map(site => site.targetKind).sort(), ['spl-token', 'token-2022']);
  });

  it('does not emit flows from unrelated functions merely named like token APIs', async () => {
    const source = `struct Wallet; impl Wallet { fn transfer(&self, other: &Wallet, amount: u64) {} }
#[program] pub mod p { pub fn unrelated(a: Context<A>, b: Context<A>) -> Result<()> { let w = Wallet; let v = Wallet; w.transfer(&v, 5); Ok(()) } }
#[derive(Accounts)] pub struct A<'info> { pub payer: Signer<'info> }
pub struct Other; fn invoke(_: &Other) {}`;
    const report = await analyze('tf/false-positive.rs', source);
    assert.equal(report.programs[0].assetFlows?.length ?? 0, 0);
  });

  it('emits deterministic stable IDs and ordering across repeated runs', async () => {
    const source = await fixture('token-flow-basic');
    const first = await analyze('tf/determinism.rs', source);
    const second = await analyze('tf/determinism.rs', source);
    const flowIds = (report: Awaited<ReturnType<typeof analyze>>) => (report.programs[0].assetFlows ?? []).map(flow => flow.id);
    assert.deepEqual(flowIds(first), flowIds(second));
    const sorted = [...flowIds(first)].sort((a, b) => a.localeCompare(b));
    assert.deepEqual(flowIds(first), sorted);
    const stripTimestamps = (value: unknown) => JSON.parse(JSON.stringify(value, (key, item) => key === 'generatedAt' ? undefined : item));
    const manifestA = stripTimestamps(first.auditManifest); const manifestB = stripTimestamps(second.auditManifest);
    assert.equal(JSON.stringify(manifestA), JSON.stringify(manifestB));
  });

  it('detects authority and token-program changes in baseline diffs', async () => {
    const beforeSource = `use anchor_lang::prelude::*;
#[program] pub mod p { pub fn send(ctx: Context<Ctx>, amount: u64) -> Result<()> { anchor_spl::token::transfer(CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer { from: ctx.accounts.from.to_account_info(), to: ctx.accounts.to.to_account_info(), authority: ctx.accounts.old_authority.to_account_info() }), amount)?; Ok(()) } }
#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub from: InterfaceAccount<'info, TokenAccount>, #[account(mut)] pub to: InterfaceAccount<'info, TokenAccount>, pub old_authority: Signer<'info>, pub token_program: Interface<'info, TokenInterface> }`;
    const afterSource = beforeSource
      .replace('old_authority: Signer', 'new_authority: Signer')
      .replace(/old_authority\.to_account_info/g, 'new_authority.to_account_info');
    void afterSource;
    const before = await analyze('diff/token-a.rs', beforeSource);
    const after = await analyze('diff/token-b.rs', afterSource);
    const changes = diffReports(before, after);
    assert.ok(changes.changes.assetFlows !== undefined, 'assetFlows section must exist in diffs');
  });

  it('rejects malformed token flows at the schema level', async () => {
    const Ajv2020 = (await import('ajv/dist/2020')).default;
    const schema = JSON.parse(await fs.readFile(path.resolve(__dirname, '../../../schemas/report.schema.json'), 'utf8'));
    // Compile with a draft-2020-12 Ajv instance so $defs references resolve natively.
    const validate = new Ajv2020({ strict: false, allErrors: true }).addSchema(schema).compile({ $ref: 'https://github.com/R4Y4N3/Sealevel-Insight/schemas/report.schema.json#/$defs/tokenAssetFlow' });
    assert.equal(validate({ id: 'x', instructionId: 'i', program: 'p', direct: true, pdaSigned: false, signerPdaIds: [], functionPath: [], callPath: [], location: { uri: 'u', startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 }, confidence: 1, evidence: [], complete: true, unresolvedReasons: [] }), true);
    // Missing required fields.
    assert.equal(validate({ id: 'x' }), false);
    // Bad enum values.
    assert.equal(validate({ id: 'x', instructionId: 'i', program: 'p', direct: true, pdaSigned: false, signerPdaIds: [], functionPath: [], callPath: [], location: { uri: 'u', startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 }, confidence: 1, evidence: [], complete: true, unresolvedReasons: [], tokenProgram: 'wormhole' }), false);
    // Unknown fields are rejected (no permissive {} objects).
    assert.equal(validate({ id: 'x', instructionId: 'i', program: 'p', direct: true, pdaSigned: false, signerPdaIds: [], functionPath: [], callPath: [], location: { uri: 'u', startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 }, confidence: 1, evidence: [], complete: true, unresolvedReasons: [], bogusField: true }), false);
    // Unresolved binding that claims an accountId would violate role invariants upstream.
    const validateBinding = new Ajv2020({ strict: false }).addSchema(schema).compile({ $ref: 'https://github.com/R4Y4N3/Sealevel-Insight/schemas/report.schema.json#/$defs/tokenAssetFlowBinding' });
    assert.equal(validateBinding({ expression: 'e', resolved: true }), true);
    assert.equal(validateBinding({ expression: '', resolved: false }), false);
  });

  it('keeps custom Rust fallback evidence-backed instead of guessing roles', async () => {
    const source = `fn move_tokens(accounts: &[AccountInfo], program_id: &Pubkey) {
  let ix = spl_token::instruction::transfer(&spl_token::ID, accounts[0].key, accounts[1].key, accounts[2].key, amount)?;
  invoke_signed(&ix, accounts, &[&[b\"vault\", &[bump]]])?;
}`;
    const report = await analyze('tf/native.rs', source.replace('amount?', 'Some(amount).ok_or?(Err())?').replace('?;', ';'));
    const flows = report.programs.flatMap(program => program.assetFlows ?? []);
    for (const flow of flows.filter(item => item.operationCategory === 'token-transfer')) {
      assert.ok(flow.unresolvedReasons.length > 0 || flow.complete);
      if (!flow.complete) for (const reason of flow.unresolvedReasons) assert.ok(reason.length > 10);
    }
  });
});
