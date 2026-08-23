import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(__dirname, '../../..');
  const extensionDevelopmentPath = mkdtempSync(path.join(tmpdir(), 'sealevel-insight-vsix-'));
  execFileSync('unzip', ['-q', path.join(repositoryRoot, 'sealevel-insight-0.5.0.vsix'), '-d', extensionDevelopmentPath]);
  const extensionPath = path.join(extensionDevelopmentPath, 'extension');
  const fixture = path.resolve(repositoryRoot, 'test/fixtures/custom-basic');
  await runTests({ extensionDevelopmentPath: extensionPath, launchArgs: [fixture], extensionTestsPath: path.resolve(__dirname, './runner') });
}
main().catch(error => { console.error(error); process.exit(1); });
