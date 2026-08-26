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

  it('does not misclassify ordinary EVM Solidity or generic assembly as Solana programs', async () => {
    const report = await analyze([
      { uri: 'file:///workspace/erc20.sol', language: 'solang-solidity', source: 'pragma solidity ^0.8.0; contract C { function value() public pure returns (uint) { return 1; } }' },
      { uri: 'file:///workspace/x86.s', language: 'sbf-assembly', source: '.globl main\nmain:\n  mov %rax, %rbx\n  ret\n' }
    ]);
    assert.equal(report.programs.length, 0); assert.equal(report.files.length, 2); assert.equal(report.summary.sourceFiles, 2);
    assert.equal(report.diagnostics.every(item => item.includes('without creating a Solana program')), true);
  });

  it('is deterministic apart from generatedAt', async () => {
    const input: SourceInput = { uri: 'file:///workspace/minimal.sbpf', language: 'sbf-assembly', packageName: 'minimal', source: '.global entrypoint\nentrypoint:\n mov64 r0, 0\n exit\n' };
    const first = await analyze([input]); const second = await analyze([input]); first.generatedAt = second.generatedAt;
    assert.deepEqual(first, second); assert.equal(JSON.stringify(first.auditManifest), JSON.stringify(second.auditManifest));
  });
});
