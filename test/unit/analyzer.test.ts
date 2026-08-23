import * as assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { analyzeSources } from '../../src/analysis/analyzer';

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
});
