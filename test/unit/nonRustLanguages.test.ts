import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import { analyzeSources, SourceInput } from '../../src/analysis/analyzer';
import { markdownReport, standaloneHtml } from '../../src/core/serialization';

const rustWasm = path.resolve(__dirname, '../../../resources/parsers/tree-sitter-rust.wasm');
const solidityWasm = path.resolve(__dirname, '../../../resources/parsers/tree-sitter-solidity.wasm');
const runtimeWasm = path.resolve(__dirname, '../../../node_modules/web-tree-sitter/tree-sitter.wasm');

async function analyze(inputs: SourceInput[]) { return analyzeSources(inputs, rustWasm, runtimeWasm, undefined, { solidityWasmPath: solidityWasm }); }

describe('non-Rust Solana language frontends', () => {
  it('models Solang instructions, accounts, helper reachability, CPIs, asset flow, PDA annotations, and program identity', async () => {
    const source = `import 'solana';
@program_id("11111111111111111111111111111111")
contract Vault {
  uint64 counter;
  @payer(payer)
  @seed("vault")
  @bump(bump)
  constructor() {}

  @mutableAccount(source)
  @mutableAccount(destination)
  @signer(authority)
  function transfer_tokens(uint64 amount) public {
    helper(amount);
  }

  function helper(uint64 amount) internal {
    counter += 1;
    SplToken.transfer(tx.accounts.source.key, tx.accounts.destination.key, tx.accounts.authority.key, amount);
  }

  function recursive_helper() internal {
    recursive_helper();
  }
}`;
    const report = await analyze([{ uri: 'file:///workspace/vault.sol', source, language: 'solang-solidity', packageName: 'solang-vault' }]);
    assert.equal(report.summary.solidityFiles, 1); assert.equal(report.summary.rustFiles, 0);
    const program = report.programs[0]; assert.equal(program.sourceLanguage, 'solang-solidity'); assert.equal(program.identity?.programId, '11111111111111111111111111111111');
    assert.deepEqual(program.instructions.map(item => item.name).sort(), ['new', 'transfer_tokens']);
    assert.deepEqual(program.instructions.find(item => item.name === 'transfer_tokens')?.arguments, [{ name: 'amount', type: 'uint64' }]);
    assert.equal(program.accounts.find(item => item.name === 'authority')?.signer, true);
    assert.equal(program.accounts.find(item => item.name === 'source')?.writable, true);
    assert.equal(program.securitySurface.pdaSites.some(item => item.seeds?.includes('"vault"')), true);
    assert.equal(program.securitySurface.cpiSites.some(item => item.operation === 'create-account' && item.targetKind === 'system-program'), true);
    assert.equal(program.securitySurface.cpiSites.some(item => item.operation === 'transfer'), true);
    assert.equal(program.stateTypes?.[0]?.fields.some(item => item.name === 'counter' && item.type === 'uint64'), true);
    assert.deepEqual(program.functions.find(item => item.name === 'helper')?.stateAccess, ['Vault']);
    assert.equal(program.callGraph?.cycles.some(item => item.kind === 'self-recursion' && item.functions.some(name => name.endsWith('::recursive_helper'))), true);
    const surface = program.instructions.find(item => item.name === 'transfer_tokens')?.reachableSurface;
    assert.equal(surface?.functions.some(item => item.endsWith('::helper')), true); assert.equal(surface?.cpis.length, 1);
    const flow = program.assetFlows?.find(item => item.operation === 'transfer'); assert.equal(flow?.amount, 'amount'); assert.equal(flow?.source?.accountName, 'source'); assert.equal(flow?.destination?.accountName, 'destination');
    assert.equal(report.analysisDiagnostics?.filter(item => item.category === 'invariant').length, 0);
    assert.match(markdownReport(report), /Solang Solidity: 1/); assert.match(standaloneHtml(report), /Solang files/);
    const schema = JSON.parse(await readFile(path.resolve(__dirname, '../../../schemas/report.schema.json'), 'utf8')); const validate = new Ajv2020({ strict: true }).compile(schema); assert.equal(validate(report), true, JSON.stringify(validate.errors));
  });

  it('models sBPF entrypoints, direct and indirect calls, branches, syscalls, signed CPI, PDA derivation, and memory access', async () => {
    const source = `.globl entrypoint
.type entrypoint,@function
entrypoint:
  mov64 r1, r10
  jeq r1, 0, done
  call helper
  callx r2
done:
  exit
.type helper,@function
helper:
  ldxdw r3, [r1+0]
  stxdw [r1+8], r3
  call sol_log_64_
  syscall sol_try_find_program_address
  syscall sol_invoke_signed_c
  exit
`;
    const report = await analyze([{ uri: 'file:///workspace/program.s', source, language: 'sbf-assembly', packageName: 'assembly-program' }]);
    assert.equal(report.summary.assemblyFiles, 1); const program = report.programs[0]; assert.equal(program.sourceLanguage, 'sbf-assembly');
    assert.deepEqual(program.instructions.map(item => item.name), ['entrypoint']); assert.equal(program.functions.find(item => item.name === 'entrypoint')?.complexity, 2);
    assert.equal(program.callGraph?.calls.some(item => item.status === 'resolved' && item.callee === 'helper'), true);
    assert.equal(program.callGraph?.calls.some(item => item.status === 'dynamic' && item.indirect), true);
    assert.equal(program.callGraph?.calls.some(item => item.status === 'external' && item.callee === 'sol_log_64_'), true);
    assert.equal(program.securitySurface.cpiSites.some(item => item.pdaSigned && item.targetKind === 'dynamic'), true);
    assert.equal(program.securitySurface.pdaSites.some(item => item.derivationApi === 'sol_try_find_program_address'), true);
    assert.equal(program.securitySurface.pdaSites.some(item => item.usedAsSigner && item.relatedCpiIds?.length), true);
    assert.equal(program.runtimeOperations?.some(item => item.kind === 'data-read'), true); assert.equal(program.runtimeOperations?.some(item => item.kind === 'data-write'), true);
    assert.equal(program.instructions[0].reachableSurface?.complete, false);
  });

  it('recognizes current sBPF branch/PQR-era mnemonics and counts only backward jumps as loops', async () => {
    const source = `.globl entrypoint
entrypoint:
  lddw r1, 4294967296
loop:
  udiv64 r1, 2
  srem64 r2, 3
  hor64 r3, 4
  jset r1, 1, loop
  exit
`;
    const report = await analyze([{ uri: 'file:///workspace/current.sbpf', source, language: 'sbf-assembly', packageName: 'current-sbpf' }]);
    assert.equal(report.programs.length, 1);
    assert.equal(report.programs[0].functions.find(item => item.name === 'entrypoint')?.complexity, 2);
    assert.equal(report.files[0].loops, 1);
  });

  it('does not misclassify ordinary EVM Solidity or generic assembly as Solana programs', async () => {
    const report = await analyze([
      { uri: 'file:///workspace/erc20.sol', language: 'solang-solidity', source: 'pragma solidity ^0.8.0; contract C { function value() public pure returns (uint) { return 1; } }' },
      { uri: 'file:///workspace/x86.s', language: 'sbf-assembly', source: '.globl main\nmain:\n  mov %rax, %rbx\n  ret\n' },
      { uri: 'file:///workspace/filter.s', language: 'sbf-assembly', source: '.globl filter\n.type filter,@function\nfilter:\n  mov64 r0, 0\n  exit\n' }
    ]);
    assert.equal(report.programs.length, 0); assert.equal(report.files.length, 3); assert.equal(report.summary.sourceFiles, 3);
    assert.equal(report.diagnostics.every(item => item.includes('without creating a Solana program')), true);
  });

  it('models official Solang parameter PDA annotations and separates SPL reads from real token CPIs', async () => {
    const source = `import 'solana';
@program_id("Foo5mMfYo5RhRcWa4NZ2bwFn4Kdhe8rNK5jchxsKrivA")
contract Token {
  @space(500)
  @seed("Token")
  @payer(payer)
  constructor(@seed bytes seed_val, @bump bytes1 bump_val) {}

  @account(mint)
  function total_supply() external view returns (uint64) {
    return SplToken.total_supply(tx.accounts.mint);
  }

  @mutableAccount(mint)
  @mutableAccount(account)
  @signer(authority)
  function mint(uint64 amount) external {
    SplToken.mint_to(tx.accounts.mint.key, tx.accounts.account.key, tx.accounts.authority.key, amount);
  }
}`;
    const report = await analyze([{ uri: 'file:///workspace/official-token.sol', source, language: 'solang-solidity', packageName: 'official-token' }]);
    const program = report.programs[0]; const constructor = program.instructions.find(item => item.name === 'new')!;
    assert.deepEqual(constructor.arguments, [{ name: 'seed_val', type: 'bytes' }, { name: 'bump_val', type: 'bytes1' }]);
    assert.deepEqual(program.securitySurface.pdaSites[0]?.seeds, ['"Token"', 'seed_val']);
    assert.equal(program.securitySurface.pdaSites[0]?.bump, 'bump_val');
    assert.equal(program.securitySurface.cpiSites.filter(item => item.targetKind === 'spl-token').length, 1);
    assert.equal(program.securitySurface.cpiSites.some(item => item.operation === 'total_supply'), false);
    assert.equal(program.runtimeOperations?.some(item => item.api === 'SplToken.total_supply' && item.kind === 'data-read'), true);
    assert.equal(program.callGraph?.calls.some(item => item.callee === 'SplToken.total_supply' && item.status === 'external'), true);
    assert.equal(program.assetFlows?.some(item => item.operation === 'mint_to' && item.amount === 'amount'), true);
    assert.equal(program.accounts.length, 7);
    assert.equal(program.relationships?.every(relation => program.accounts.some(account => account.id === relation.accountId)), true);
    assert.equal(report.analysisDiagnostics?.some(item => item.category === 'invariant'), false);
  });

  it('keeps unmodeled Solang token helpers unresolved and canonicalizes remove_mint_authority', async () => {
    const source = `import 'solana'; contract Token {
      @mutableAccount(mint) @signer(authority)
      function update(uint64 amount) external {
        SplToken.transfer_checked(tx.accounts.mint.key, tx.accounts.mint.key, tx.accounts.mint.key, tx.accounts.authority.key, amount, 6);
        SplToken.remove_mint_authority(tx.accounts.mint.key, tx.accounts.authority.key);
      }
    }`;
    const report = await analyze([{ uri: 'file:///workspace/token-helpers.sol', source, language: 'solang-solidity', packageName: 'token-helpers' }]);
    const program = report.programs[0];
    assert.equal(program.securitySurface.cpiSites.some(item => item.operation === 'transfer_checked'), false);
    assert.equal(program.callGraph?.calls.some(item => item.callee === 'SplToken.transfer_checked' && item.status === 'unresolved'), true);
    assert.equal(program.securitySurface.cpiSites.some(item => item.operation === 'set_authority' && item.invocationApi === 'Solang SplToken.remove_mint_authority'), true);
  });

  it('is deterministic apart from generatedAt', async () => {
    const input: SourceInput = { uri: 'file:///workspace/minimal.sbpf', language: 'sbf-assembly', packageName: 'minimal', source: '.global entrypoint\nentrypoint:\n mov64 r0, 0\n exit\n' };
    const first = await analyze([input]); const second = await analyze([input]); first.generatedAt = second.generatedAt;
    assert.deepEqual(first, second); assert.equal(JSON.stringify(first.auditManifest), JSON.stringify(second.auditManifest));
  });
});
