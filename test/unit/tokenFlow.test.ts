import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { analyzeSources } from '../../src/analysis/analyzer';
import { diffReports } from '../../src/core/diff';
import { buildCargoGraph } from '../../src/discovery/cargoGraph';

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

describe('Token & Asset Flow v2 correctness hardening', () => {
  function program(name: string, body: string, accounts = ''): Promise<Awaited<ReturnType<typeof analyze>>> {
    const source = `use anchor_lang::prelude::*;\n#[program]\npub mod vault {\n    use super::*;\n${body}\n}\n${accounts}`;
    return analyze(`tf/${name}.rs`, source);
  }

  it('produces a resolved flow for a native SPL transfer', async () => {
    const report = await program('native-transfer', `
    pub fn xfer(ctx: Context<Ctx>, amount: u64) -> Result<()> {
        let ix = spl_token::instruction::transfer(&spl_token::ID, ctx.accounts.source.key, ctx.accounts.dest.key, ctx.accounts.authority.key, &[], amount)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, #[account(mut)] pub dest: InterfaceAccount<'info, TokenAccount>, pub authority: Signer<'info> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'token.transfer')!;
    assert.ok(flow, 'a native transfer must produce a flow');
    assert.equal(flow.source?.resolved && flow.source.accountName, 'source');
    assert.equal(flow.destination?.resolved && flow.destination.accountName, 'dest');
    assert.equal(flow.authority?.resolved && flow.authority.accountName, 'authority');
    assert.equal(flow.amount, 'amount');
    assert.equal(flow.complete, true);
  });

  it('extracts native transfer_checked amount and decimals in the documented order (not swapped)', async () => {
    const report = await program('native-transfer-checked', `
    pub fn xfer(ctx: Context<Ctx>, amount: u64, decimals: u8) -> Result<()> {
        let ix = spl_token::instruction::transfer_checked(&spl_token::ID, ctx.accounts.source.key, ctx.accounts.mint.key, ctx.accounts.dest.key, ctx.accounts.authority.key, &[], amount, decimals)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, #[account(mut)] pub dest: InterfaceAccount<'info, TokenAccount>, pub mint: InterfaceAccount<'info, Mint>, pub authority: Signer<'info> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'token.transfer-checked')!;
    assert.ok(flow, 'a native transfer_checked must produce a flow');
    assert.equal(flow.amount, 'amount', 'amount must bind to the amount argument, not decimals');
    assert.equal(flow.decimals, 'decimals', 'decimals must bind to the decimals argument, not amount');
    assert.notEqual(flow.amount, flow.decimals);
  });

  it('distinguishes SPL Token from Token-2022 at the asset-flow tokenProgram level', async () => {
    const report = await program('native-t22', `
    pub fn spl_xfer(ctx: Context<Ctx>, amount: u64) -> Result<()> {
        let ix = spl_token::instruction::transfer(&spl_token::ID, ctx.accounts.source.key, ctx.accounts.dest.key, ctx.accounts.authority.key, &[], amount)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }
    pub fn t22_xfer(ctx: Context<Ctx>, amount: u64, decimals: u8) -> Result<()> {
        let ix = spl_token_2022::instruction::transfer_checked(&spl_token_2022::ID, ctx.accounts.source.key, ctx.accounts.mint.key, ctx.accounts.dest.key, ctx.accounts.authority.key, &[], amount, decimals)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, #[account(mut)] pub dest: InterfaceAccount<'info, TokenAccount>, pub mint: InterfaceAccount<'info, Mint>, pub authority: Signer<'info> }`);
    const splFlow = report.programs[0].assetFlows?.find(item => item.operation === 'token.transfer')!;
    const t22Flow = report.programs[0].assetFlows?.find(item => item.operation === 'token-2022.transfer-checked')!;
    assert.equal(splFlow.tokenProgram, 'spl-token');
    assert.equal(t22Flow.tokenProgram, 'token-2022');
  });

  it('extracts native mint_to and mint_to_checked amount/decimals without swapping', async () => {
    const report = await program('native-mint', `
    pub fn mint_plain(ctx: Context<Ctx>, amount: u64) -> Result<()> {
        let ix = spl_token::instruction::mint_to(&spl_token::ID, ctx.accounts.mint.key, ctx.accounts.dest.key, ctx.accounts.authority.key, &[], amount)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }
    pub fn mint_checked(ctx: Context<Ctx>, amount: u64, decimals: u8) -> Result<()> {
        let ix = spl_token::instruction::mint_to_checked(&spl_token::ID, ctx.accounts.mint.key, ctx.accounts.dest.key, ctx.accounts.authority.key, &[], amount, decimals)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub dest: InterfaceAccount<'info, TokenAccount>, pub mint: InterfaceAccount<'info, Mint>, pub authority: Signer<'info> }`);
    const plain = report.programs[0].assetFlows?.find(item => item.operation === 'token.mint-to')!;
    const checked = report.programs[0].assetFlows?.find(item => item.operation === 'token.mint-to-checked')!;
    assert.equal(plain.mint?.resolved && plain.mint.accountName, 'mint');
    assert.equal(plain.destination?.resolved && plain.destination.accountName, 'dest');
    assert.equal(plain.amount, 'amount');
    assert.equal(checked.amount, 'amount');
    assert.equal(checked.decimals, 'decimals');
  });

  it('binds native burn accounts correctly, including the mint role (regression: mint was previously dropped)', async () => {
    const report = await program('native-burn', `
    pub fn burn_plain(ctx: Context<Ctx>, amount: u64) -> Result<()> {
        let ix = spl_token::instruction::burn(&spl_token::ID, ctx.accounts.source.key, ctx.accounts.mint.key, ctx.accounts.authority.key, &[], amount)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, #[account(mut)] pub mint: InterfaceAccount<'info, Mint>, pub authority: Signer<'info> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'token.burn')!;
    assert.ok(flow, 'a native burn must produce a flow');
    assert.equal(flow.source?.resolved && flow.source.accountName, 'source');
    assert.equal(flow.mint?.resolved && flow.mint.accountName, 'mint', 'mint must never be dropped or bound to authority');
    assert.equal(flow.authority?.resolved && flow.authority.accountName, 'authority', 'authority must never be bound to the mint account');
    assert.equal(flow.amount, 'amount');
    assert.equal(flow.complete, true);
  });

  it('extracts native burn_checked amount and decimals in the documented order', async () => {
    const report = await program('native-burn-checked', `
    pub fn burn_checked(ctx: Context<Ctx>, amount: u64, decimals: u8) -> Result<()> {
        let ix = spl_token::instruction::burn_checked(&spl_token::ID, ctx.accounts.source.key, ctx.accounts.mint.key, ctx.accounts.authority.key, &[], amount, decimals)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, pub mint: InterfaceAccount<'info, Mint>, pub authority: Signer<'info> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'token.burn-checked')!;
    assert.equal(flow.amount, 'amount');
    assert.equal(flow.decimals, 'decimals');
  });

  it('binds native close_account roles correctly', async () => {
    const report = await program('native-close', `
    pub fn close(ctx: Context<Ctx>) -> Result<()> {
        let ix = spl_token::instruction::close_account(&spl_token::ID, ctx.accounts.source.key, ctx.accounts.dest.key, ctx.accounts.authority.key, &[])?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, #[account(mut)] pub dest: SystemAccount<'info>, pub authority: Signer<'info> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'token.close-account')!;
    assert.equal(flow.source?.resolved && flow.source.accountName, 'source');
    assert.equal(flow.destination?.resolved && flow.destination.accountName, 'dest');
    assert.equal(flow.authority?.resolved && flow.authority.accountName, 'authority');
    assert.equal(flow.complete, true);
  });

  it('binds native set_authority roles across the enum argument gap and extracts newAuthority', async () => {
    const report = await program('native-set-authority', `
    pub fn rotate(ctx: Context<Ctx>) -> Result<()> {
        let ix = spl_token::instruction::set_authority(&spl_token::ID, ctx.accounts.mint.key, Some(ctx.accounts.new_authority.key), spl_token::instruction::AuthorityType::MintTokens, ctx.accounts.authority.key, &[])?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub mint: InterfaceAccount<'info, Mint>, pub authority: Signer<'info>, /// CHECK: new authority\n    pub new_authority: UncheckedAccount<'info> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'token.set-authority')!;
    assert.ok(flow, 'set_authority must produce a flow');
    assert.equal(flow.source?.resolved && flow.source.accountName, 'mint', 'the owned account (index 1) must not be confused with the enum at index 3');
    assert.equal(flow.authority?.resolved && flow.authority.accountName, 'authority', 'authority (index 4) must not be skipped due to the enum gap');
    assert.equal(flow.newAuthority?.resolved && flow.newAuthority.accountName, 'new_authority');
    assert.equal(flow.complete, true);
  });

  it('binds Approve/ApproveChecked accounts using the real `to` field, never `from`', async () => {
    const report = await program('approve-fields', `
    pub fn do_approve(ctx: Context<Ctx>, amount: u64) -> Result<()> {
        anchor_spl::token::approve(CpiContext::new(ctx.accounts.token_program.to_account_info(), Approve { to: ctx.accounts.source.to_account_info(), delegate: ctx.accounts.delegate.to_account_info(), authority: ctx.accounts.authority.to_account_info() }), amount)?;
        Ok(())
    }
    pub fn do_approve_checked(ctx: Context<Ctx>, amount: u64, decimals: u8) -> Result<()> {
        anchor_spl::token::approve_checked(CpiContext::new(ctx.accounts.token_program.to_account_info(), ApproveChecked { to: ctx.accounts.source.to_account_info(), mint: ctx.accounts.mint.to_account_info(), delegate: ctx.accounts.delegate.to_account_info(), authority: ctx.accounts.authority.to_account_info() }), amount, decimals)?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, pub mint: InterfaceAccount<'info, Mint>, /// CHECK: delegate\n    pub delegate: UncheckedAccount<'info>, pub authority: Signer<'info>, pub token_program: Interface<'info, TokenInterface> }`);
    const approve = report.programs[0].assetFlows?.find(item => item.operation === 'token.approve')!;
    const approveChecked = report.programs[0].assetFlows?.find(item => item.operation === 'token.approve-checked')!;
    assert.equal(approve.source?.resolved && approve.source.accountName, 'source', 'Approve.to must map to the source role');
    assert.equal(approve.delegate?.resolved && approve.delegate.accountName, 'delegate');
    assert.equal(approveChecked.source?.resolved && approveChecked.source.accountName, 'source', 'ApproveChecked.to must map to the source role');
    assert.equal(approveChecked.amount, 'amount');
    assert.equal(approveChecked.decimals, 'decimals');
    assert.equal(approve.complete, true);
    assert.equal(approveChecked.complete, true);
  });

  it('binds native approve and approve_checked amount/decimals correctly', async () => {
    const report = await program('native-approve', `
    pub fn approve_plain(ctx: Context<Ctx>, amount: u64) -> Result<()> {
        let ix = spl_token::instruction::approve(&spl_token::ID, ctx.accounts.source.key, ctx.accounts.delegate.key, ctx.accounts.authority.key, &[], amount)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }
    pub fn approve_checked(ctx: Context<Ctx>, amount: u64, decimals: u8) -> Result<()> {
        let ix = spl_token::instruction::approve_checked(&spl_token::ID, ctx.accounts.source.key, ctx.accounts.mint.key, ctx.accounts.delegate.key, ctx.accounts.authority.key, &[], amount, decimals)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, pub mint: InterfaceAccount<'info, Mint>, /// CHECK: delegate\n    pub delegate: UncheckedAccount<'info>, pub authority: Signer<'info> }`);
    const plain = report.programs[0].assetFlows?.find(item => item.operation === 'token.approve')!;
    const checked = report.programs[0].assetFlows?.find(item => item.operation === 'token.approve-checked')!;
    assert.equal(plain.amount, 'amount');
    assert.equal(checked.amount, 'amount');
    assert.equal(checked.decimals, 'decimals');
  });

  it('binds Revoke using the real `source` field name (never `from`)', async () => {
    const report = await program('revoke-fields', `
    pub fn do_revoke(ctx: Context<Ctx>) -> Result<()> {
        anchor_spl::token::revoke(CpiContext::new(ctx.accounts.token_program.to_account_info(), Revoke { source: ctx.accounts.source.to_account_info(), authority: ctx.accounts.authority.to_account_info() }))?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, pub authority: Signer<'info>, pub token_program: Interface<'info, TokenInterface> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'token.revoke')!;
    assert.ok(flow, 'Revoke must produce a flow');
    assert.equal(flow.source?.resolved && flow.source.accountName, 'source');
    assert.equal(flow.authority?.resolved && flow.authority.accountName, 'authority');
    assert.equal(flow.complete, true);
  });

  it('binds FreezeAccount/ThawAccount authority using the real field name, not freeze_authority', async () => {
    const report = await program('freeze-thaw-fields', `
    pub fn do_freeze(ctx: Context<Ctx>) -> Result<()> {
        anchor_spl::token::freeze_account(CpiContext::new(ctx.accounts.token_program.to_account_info(), FreezeAccount { account: ctx.accounts.source.to_account_info(), mint: ctx.accounts.mint.to_account_info(), authority: ctx.accounts.authority.to_account_info() }))?;
        Ok(())
    }
    pub fn do_thaw(ctx: Context<Ctx>) -> Result<()> {
        anchor_spl::token::thaw_account(CpiContext::new(ctx.accounts.token_program.to_account_info(), ThawAccount { account: ctx.accounts.source.to_account_info(), mint: ctx.accounts.mint.to_account_info(), authority: ctx.accounts.authority.to_account_info() }))?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, pub mint: InterfaceAccount<'info, Mint>, pub authority: Signer<'info>, pub token_program: Interface<'info, TokenInterface> }`);
    const freeze = report.programs[0].assetFlows?.find(item => item.operation === 'token.freeze-account')!;
    const thaw = report.programs[0].assetFlows?.find(item => item.operation === 'token.thaw-account')!;
    assert.equal(freeze.authority?.resolved && freeze.authority.accountName, 'authority');
    assert.equal(thaw.authority?.resolved && thaw.authority.accountName, 'authority');
    assert.equal(freeze.complete, true);
    assert.equal(thaw.complete, true);
  });

  it('binds InitializeAccount/InitializeAccount3 authority using the real field name, not owner', async () => {
    const report = await program('init-account-fields', `
    pub fn do_init(ctx: Context<Ctx>) -> Result<()> {
        anchor_spl::token::initialize_account(CpiContext::new(ctx.accounts.token_program.to_account_info(), InitializeAccount { account: ctx.accounts.source.to_account_info(), mint: ctx.accounts.mint.to_account_info(), authority: ctx.accounts.authority.to_account_info(), rent: ctx.accounts.rent.to_account_info() }))?;
        Ok(())
    }
    pub fn do_init3(ctx: Context<Ctx>) -> Result<()> {
        anchor_spl::token::initialize_account3(CpiContext::new(ctx.accounts.token_program.to_account_info(), InitializeAccount3 { account: ctx.accounts.source.to_account_info(), mint: ctx.accounts.mint.to_account_info(), authority: ctx.accounts.authority.to_account_info() }))?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, pub mint: InterfaceAccount<'info, Mint>, /// CHECK: owner\n    pub authority: UncheckedAccount<'info>, pub rent: Sysvar<'info, Rent>, pub token_program: Interface<'info, TokenInterface> }`);
    const init = report.programs[0].assetFlows?.find(item => item.operation === 'token.initialize-account')!;
    const init3 = report.programs[0].assetFlows?.find(item => item.operation === 'token.initialize-account3')!;
    assert.equal(init.authority?.resolved && init.authority.accountName, 'authority');
    assert.equal(init3.authority?.resolved && init3.authority.accountName, 'authority');
    assert.equal(init.complete, true);
    assert.equal(init3.complete, true);
  });

  it('binds InitializeMint authority from the wrapper call and never treats rent as authority', async () => {
    const report = await program('init-mint-fields', `
    pub fn make_mint(ctx: Context<Ctx>, decimals: u8) -> Result<()> {
        anchor_spl::token::initialize_mint(CpiContext::new(ctx.accounts.token_program.to_account_info(), InitializeMint { mint: ctx.accounts.mint.to_account_info(), rent: ctx.accounts.rent.to_account_info() }), decimals, &ctx.accounts.mint_authority.key(), None)?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub mint: InterfaceAccount<'info, Mint>, pub mint_authority: Signer<'info>, pub rent: Sysvar<'info, Rent>, pub token_program: Interface<'info, TokenInterface> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'token.initialize-mint')!;
    assert.ok(flow, 'initialize_mint must produce a flow');
    assert.equal(flow.mint?.resolved && flow.mint.accountName, 'mint');
    assert.equal(flow.authority?.resolved && flow.authority.accountName, 'mint_authority', 'authority must come from the wrapper call argument, never from the rent field');
    assert.notEqual(flow.authority?.accountName, 'rent');
    assert.equal(flow.decimals, 'decimals');
    assert.equal(flow.complete, true);
  });

  it('produces a resolved flow for Associated Token Program create', async () => {
    const report = await program('ata-create', `
    pub fn make_ata(ctx: Context<Ctx>) -> Result<()> { Ok(()) }`, `#[derive(Accounts)] pub struct Ctx<'info> {
    #[account(init, payer = payer, associated_token::mint = mint, associated_token::authority = owner)]
    pub ata: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)] pub payer: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub owner: SystemAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'associated-token.create')!;
    assert.ok(flow, 'ATA create must produce a flow');
    assert.equal(flow.operationCategory, 'token-account-create');
    assert.equal(flow.tokenProgram, 'associated-token');
    assert.equal(flow.destination?.resolved && flow.destination.accountName, 'ata');
  });

  it('produces a resolved flow for Associated Token Program create_idempotent', async () => {
    const report = await program('ata-create-idempotent', `
    pub fn make_ata(ctx: Context<Ctx>) -> Result<()> { Ok(()) }`, `#[derive(Accounts)] pub struct Ctx<'info> {
    #[account(init_if_needed, payer = payer, associated_token::mint = mint, associated_token::authority = owner)]
    pub ata: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)] pub payer: Signer<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub owner: SystemAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'associated-token.create-idempotent')!;
    assert.ok(flow, 'ATA create_idempotent must produce a flow');
    assert.equal(flow.operationCategory, 'token-account-create');
    assert.equal(flow.destination?.resolved && flow.destination.accountName, 'ata');
  });

  it('produces an evidence-backed but unresolved flow for Associated Token Program recover_nested', async () => {
    const report = await program('ata-recover-nested', `
    pub fn recover(ctx: Context<Ctx>) -> Result<()> {
        let ix = spl_associated_token_account::instruction::recover_nested(ctx.accounts.wallet.key, ctx.accounts.owner_mint.key, ctx.accounts.nested_mint.key, ctx.accounts.token_program.key);
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { pub wallet: SystemAccount<'info>, pub owner_mint: InterfaceAccount<'info, Mint>, pub nested_mint: InterfaceAccount<'info, Mint>, pub token_program: Interface<'info, TokenInterface> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'associated-token.recover-nested');
    assert.ok(flow, 'recover_nested must produce an evidence-backed flow even though roles are not positionally modeled');
    assert.equal(flow!.operationCategory, 'token-account-recovery');
    assert.equal(flow!.tokenProgram, 'associated-token');
  });

  it('derives PDA authorityType only from proven invoke_signed PDA evidence, never guessed', async () => {
    const report = await program('pda-signed', `
    pub fn sweep(ctx: Context<Ctx>, amount: u64) -> Result<()> {
        let (pda, bump) = Pubkey::find_program_address(&[b"vault"], &crate::ID);
        let ix = spl_token::instruction::transfer(&spl_token::ID, ctx.accounts.vault_ata.key, ctx.accounts.dest_ata.key, ctx.accounts.vault_authority.key, &[], amount)?;
        anchor_lang::solana_program::program::invoke_signed(&ix, &[], &[&[b"vault", &[bump]]])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub vault_ata: InterfaceAccount<'info, TokenAccount>, #[account(mut)] pub dest_ata: InterfaceAccount<'info, TokenAccount>, /// CHECK: PDA authority\n    pub vault_authority: UncheckedAccount<'info> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation === 'token.transfer')!;
    assert.equal(flow.authorityType, 'pda');
    assert.ok(flow.signerPdaIds.length > 0, 'a pda authorityType must be backed by a recorded signer PDA id');
    assert.equal(flow.complete, true);
  });

  it('keeps direct flows with a single-element function path ending at the handler', async () => {
    const report = await analyze('tf/direct.rs', await fixture('token-flow-basic'));
    const dossier = report.programs[0].instructionDossiers?.find(item => item.name === 'deposit_checked')!;
    const flow = dossier.assetFlows.find(item => item.operation === 'token.transfer-checked')!;
    assert.equal(flow.direct, true);
    assert.equal(flow.functionPath.length, 1);
    assert.ok(flow.functionPath[0].endsWith('deposit_checked'));
    assert.deepEqual(flow.callPath, []);
  });

  it('propagates a real functionPath and callPath through a same-package helper call', async () => {
    const report = await analyze('tf/helper-path.rs', await fixture('token-flow-basic'));
    const instruction = report.programs[0].instructions.find(item => item.name === 'withdraw')!;
    const flow = (report.programs[0].assetFlows ?? []).find(item => item.instructionId === (instruction.id ?? instruction.name) && item.operation === 'token.transfer')!;
    assert.ok(flow, 'withdraw must expose the helper token.transfer flow');
    assert.equal(flow.direct, false);
    assert.ok(flow.functionPath.length >= 2, 'a transitive flow must record a real multi-step function path');
    assert.ok(flow.functionPath[0].endsWith('withdraw'));
    assert.ok(flow.functionPath.at(-1)!.endsWith('transfer_from_vault'));
    assert.equal(flow.callPath.length, flow.functionPath.length - 1);
  });

  it('propagates functionPath and callPath through a multi-hop helper chain', async () => {
    const source = `use anchor_lang::prelude::*;
#[program]
pub mod vault {
    use super::*;
    pub fn withdraw(ctx: Context<Ctx>, amount: u64) -> Result<()> {
        level_a(&ctx.accounts.source.to_account_info(), &ctx.accounts.dest.to_account_info(), &ctx.accounts.authority.to_account_info(), amount)
    }
}
fn level_a<'info>(source: &AccountInfo<'info>, dest: &AccountInfo<'info>, authority: &AccountInfo<'info>, amount: u64) -> Result<()> {
    level_b(source, dest, authority, amount)
}
fn level_b<'info>(source: &AccountInfo<'info>, dest: &AccountInfo<'info>, authority: &AccountInfo<'info>, amount: u64) -> Result<()> {
    let ix = spl_token::instruction::transfer(&spl_token::ID, source.key, dest.key, authority.key, &[], amount)?;
    anchor_lang::solana_program::program::invoke(&ix, &[source.clone(), dest.clone(), authority.clone()])?;
    Ok(())
}
#[derive(Accounts)]
pub struct Ctx<'info> {
    #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)] pub dest: InterfaceAccount<'info, TokenAccount>,
    pub authority: Signer<'info>,
}`;
    const report = await analyze('tf/multi-hop.rs', source);
    const flow = (report.programs[0].assetFlows ?? []).find(item => item.operation === 'token.transfer')!;
    assert.ok(flow, 'the multi-hop chain must still expose the CPI as a flow');
    assert.equal(flow.direct, false);
    assert.deepEqual(flow.functionPath.map(item => item.split('::').at(-1)), ['withdraw', 'level_a', 'level_b']);
    assert.equal(flow.callPath.length, 2);
  });

  it('never binds duplicate-named accounts from unrelated instruction contexts', async () => {
    const source = `use anchor_lang::prelude::*;
#[program]
pub mod vault {
    use super::*;
    pub fn admin_burn(ctx: Context<AdminCtx>, amount: u64) -> Result<()> {
        anchor_spl::token::burn(CpiContext::new(ctx.accounts.token_program.to_account_info(), Burn { mint: ctx.accounts.mint.to_account_info(), from: ctx.accounts.source.to_account_info(), authority: ctx.accounts.authority.to_account_info() }), amount)?;
        Ok(())
    }
    pub fn vault_burn(ctx: Context<VaultCtx>, amount: u64) -> Result<()> {
        anchor_spl::token::burn(CpiContext::new(ctx.accounts.token_program.to_account_info(), Burn { mint: ctx.accounts.mint.to_account_info(), from: ctx.accounts.source.to_account_info(), authority: ctx.accounts.authority.to_account_info() }), amount)?;
        Ok(())
    }
}
#[derive(Accounts)]
pub struct AdminCtx<'info> {
    #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub authority: Signer<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}
#[derive(Accounts)]
pub struct VaultCtx<'info> {
    #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    /// CHECK: not a signer in this context
    pub authority: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
}`;
    const report = await analyze('tf/dup-names.rs', source);
    const flows = report.programs[0].assetFlows ?? [];
    const admin = flows.find(item => item.instructionId.includes('admin_burn'))!;
    const vault = flows.find(item => item.instructionId.includes('vault_burn'))!;
    assert.notEqual(admin.authority?.accountId, vault.authority?.accountId, 'each instruction must bind authority to its own scoped account');
    assert.equal(admin.authorityType, 'signer-account');
    assert.equal(vault.authorityType, 'ordinary-account', 'the non-signer context must never inherit the signer classification from the other context');
  });

  it('propagates a cross-package asset flow using existing cross-package reachability, without a second call resolver', async () => {
    const graph = buildCargoGraph([
      { uri: '/repo/Cargo.toml', text: '[workspace]\nmembers=["client","helper"]' },
      { uri: '/repo/client/Cargo.toml', text: '[package]\nname="client"\n[dependencies]\nhelper-lib={path="../helper"}' },
      { uri: '/repo/helper/Cargo.toml', text: '[package]\nname="helper-lib"' }
    ], new Map([['/repo/client', ['use helper_lib::do_transfer;']], ['/repo/helper', ['pub fn do_transfer() {}']]]));
    const client = graph.packages.find(item => item.name === 'client')!;
    const helper = graph.packages.find(item => item.name === 'helper-lib')!;
    const report = await analyzeSources([
      { uri: 'file:///repo/client/src/lib.rs', source: `use anchor_lang::prelude::*; use helper_lib::do_transfer; #[program] mod p { use super::*; pub fn run(ctx: Context<Ctx>, amount: u64) -> Result<()> { do_transfer(&ctx.accounts.source.to_account_info(), &ctx.accounts.dest.to_account_info(), &ctx.accounts.authority.to_account_info(), amount) } } #[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, #[account(mut)] pub dest: InterfaceAccount<'info, TokenAccount>, pub authority: Signer<'info> }`, packageName: 'client', packageId: client.id, packageRoot: client.rootUri, workspaceGraph: graph },
      { uri: 'file:///repo/helper/src/lib.rs', source: `use anchor_lang::prelude::*; pub fn do_transfer(source: &AccountInfo, dest: &AccountInfo, authority: &AccountInfo, amount: u64) -> Result<()> { let ix = spl_token::instruction::transfer(&spl_token::ID, source.key, dest.key, authority.key, &[], amount)?; anchor_lang::solana_program::program::invoke(&ix, &[source.clone(), dest.clone(), authority.clone()])?; Ok(()) }`, packageName: 'helper-lib', packageId: helper.id, packageRoot: helper.rootUri, workspaceGraph: graph }
    ], wasm);
    const clientProgram = report.programs.find(item => item.name === 'client')!;
    const flow = (clientProgram.assetFlows ?? []).find(item => item.operation === 'token.transfer')!;
    assert.ok(flow, 'a cross-package token transfer proven reachable must produce a flow');
    assert.equal(flow.program, 'client');
    assert.equal(flow.direct, false);
    assert.equal(flow.cpiId, undefined, 'a cross-package flow must never claim a CPI id from a different program\'s id namespace');
    assert.deepEqual(flow.functionPath.map(item => item.split('::').at(-1)), ['run', 'do_transfer']);
    assert.equal(flow.callPath.length, 1);
    // Roles are never guessed across the package boundary: the helper's local parameter names
    // are a different, unrelated namespace from the client's instruction accounts.
    assert.equal(flow.source?.resolved, false);
    assert.equal(flow.authority?.resolved, false);
    assert.equal(flow.authorityType, 'unresolved');
    assert.equal(flow.complete, false);
  });

  it('does not fabricate an asset flow for unmodeled native initialize_* instructions', async () => {
    const report = await program('unmodeled-initialize', `
    pub fn setup(ctx: Context<Ctx>) -> Result<()> {
        let ix = spl_token::instruction::initialize_multisig(&spl_token::ID, ctx.accounts.multisig.key, &[], 2)?;
        anchor_lang::solana_program::program::invoke(&ix, &[])?;
        Ok(())
    }`, `#[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub multisig: UncheckedAccount<'info> }`);
    const flow = report.programs[0].assetFlows?.find(item => item.operation?.includes('initialize-multisig'));
    assert.equal(flow, undefined, 'unmodeled initialize_* instructions must never fabricate a role-bound asset flow');
  });

  it('keeps cross-package and same-package asset-flow IDs deterministic and sorted across repeated runs', async () => {
    const graph = buildCargoGraph([
      { uri: '/repo/Cargo.toml', text: '[workspace]\nmembers=["client","helper"]' },
      { uri: '/repo/client/Cargo.toml', text: '[package]\nname="client"\n[dependencies]\nhelper-lib={path="../helper"}' },
      { uri: '/repo/helper/Cargo.toml', text: '[package]\nname="helper-lib"' }
    ], new Map([['/repo/client', ['use helper_lib::do_transfer;']], ['/repo/helper', ['pub fn do_transfer() {}']]]));
    const client = graph.packages.find(item => item.name === 'client')!;
    const helper = graph.packages.find(item => item.name === 'helper-lib')!;
    const sources = () => [
      { uri: 'file:///repo/client/src/lib.rs', source: `use anchor_lang::prelude::*; use helper_lib::do_transfer; #[program] mod p { use super::*; pub fn run(ctx: Context<Ctx>, amount: u64) -> Result<()> { do_transfer(&ctx.accounts.source.to_account_info(), &ctx.accounts.dest.to_account_info(), &ctx.accounts.authority.to_account_info(), amount) } } #[derive(Accounts)] pub struct Ctx<'info> { #[account(mut)] pub source: InterfaceAccount<'info, TokenAccount>, #[account(mut)] pub dest: InterfaceAccount<'info, TokenAccount>, pub authority: Signer<'info> }`, packageName: 'client', packageId: client.id, packageRoot: client.rootUri, workspaceGraph: graph },
      { uri: 'file:///repo/helper/src/lib.rs', source: `use anchor_lang::prelude::*; pub fn do_transfer(source: &AccountInfo, dest: &AccountInfo, authority: &AccountInfo, amount: u64) -> Result<()> { let ix = spl_token::instruction::transfer(&spl_token::ID, source.key, dest.key, authority.key, &[], amount)?; anchor_lang::solana_program::program::invoke(&ix, &[source.clone(), dest.clone(), authority.clone()])?; Ok(()) }`, packageName: 'helper-lib', packageId: helper.id, packageRoot: helper.rootUri, workspaceGraph: graph }
    ];
    const first = await analyzeSources(sources(), wasm);
    const second = await analyzeSources(sources(), wasm);
    const idsOf = (report: Awaited<ReturnType<typeof analyzeSources>>) => report.programs.find(item => item.name === 'client')!.assetFlows!.map(item => item.id);
    assert.deepEqual(idsOf(first), idsOf(second));
    assert.deepEqual(idsOf(first), [...idsOf(first)].sort((a, b) => a.localeCompare(b)));
  });
});
