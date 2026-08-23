import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { analyzeSources } from '../../src/analysis/analyzer';
import { classifyPackage } from '../../src/discovery/cargoDiscovery';
import { countLines } from '../../src/utils/text';

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
});
