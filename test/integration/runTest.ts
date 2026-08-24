import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(__dirname, '../../..');
  const extensionDevelopmentPath = mkdtempSync(path.join(tmpdir(), 'sealevel-insight-vsix-'));
  execFileSync('unzip', ['-q', path.join(repositoryRoot, 'sealevel-insight-0.6.0.vsix'), '-d', extensionDevelopmentPath]);
  const extensionPath = path.join(extensionDevelopmentPath, 'extension');
  const fixture = path.resolve(repositoryRoot, 'test/fixtures/anchor-basic');
  const cli = path.join(extensionPath, 'dist/cli.js');
  for (const format of ['json', 'markdown', 'html']) {
    const output = path.join(extensionDevelopmentPath, `report.${format === 'markdown' ? 'md' : format}`);
    execFileSync(process.execPath, [cli, 'analyze', fixture, '--format', format, '--output', output, '--no-cache']);
    const content = readFileSync(output, 'utf8');
    if (format === 'json') { const report = JSON.parse(content); if (report.schemaVersion !== '0.6.0' || report.summary.instructions < 1) throw new Error('Packaged CLI JSON export is invalid.'); }
    if (format === 'markdown' && !content.includes('# Sealevel Insight')) throw new Error('Packaged CLI Markdown export is invalid.');
    if (format === 'html' && (!content.includes("default-src 'none'") || !content.includes('<!doctype html>'))) throw new Error('Packaged CLI HTML export is invalid.');
  }
  await runTests({ extensionDevelopmentPath: extensionPath, launchArgs: [fixture], extensionTestsPath: path.resolve(__dirname, './runner') });
}
main().catch(error => { console.error(error); process.exit(1); });
