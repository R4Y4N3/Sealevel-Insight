import * as vscode from 'vscode';
import { SCHEMA_VERSION } from '../../src/core/version';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('R4Y4N3.sealevel-insight')
    ?? vscode.extensions.all.find(item => item.packageJSON?.name === 'sealevel-insight');
  if (!extension) throw new Error('Sealevel Insight extension was not loaded.');
  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  const expected = ['analyzeWorkspace', 'analyzePackage', 'analyzeFile', 'openReport', 'openArchitecture', 'openCallGraph', 'exportJson', 'exportMarkdown', 'exportHtml', 'exportScope', 'saveBaseline', 'compareBaseline', 'clearCache'].map(name => `sealevelInsight.${name}`);
  for (const command of expected) if (!commands.includes(command)) throw new Error(`${command} was not registered.`);
  const discovered = await vscode.workspace.findFiles('{**/*.rs,*.rs}');
  if (!discovered.length) throw new Error(`VS Code fixture discovery failed; workspace roots: ${(vscode.workspace.workspaceFolders ?? []).map(folder => folder.uri.fsPath).join(', ')}`);
  const report = await vscode.commands.executeCommand<{ schemaVersion: string; generatedAt: string; files: unknown[]; programs: Array<{ instructions: unknown[] }> }>('sealevelInsight.analyzeWorkspace');
  if (!report) throw new Error('Analysis command returned no report.');
  if (report.schemaVersion !== SCHEMA_VERSION || !Array.isArray(report.files) || !report.programs[0]?.instructions.length) throw new Error(`Analysis returned an incomplete report: ${JSON.stringify(report)}`);
  const document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'lib.rs'));
  await vscode.window.showTextDocument(document);
  const lenses = await vscode.commands.executeCommand<vscode.CodeLens[]>('vscode.executeCodeLensProvider', document.uri);
  if (!lenses?.some(lens => lens.command?.title.includes('accounts') && lens.command.title.includes('CPIs'))) throw new Error('Packaged CodeLens provider did not return semantic surface counts.');
  const hovers = await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', document.uri, new vscode.Position(14, 8));
  if (!hovers?.length) throw new Error('Packaged hover provider did not return account semantics.');
  const cached = await vscode.commands.executeCommand<{ generatedAt: string }>('sealevelInsight.analyzeWorkspace');
  if (cached?.generatedAt !== report.generatedAt) throw new Error('Repeated packaged analysis did not reuse its deterministic cache.');
  await vscode.commands.executeCommand('sealevelInsight.openReport');
}
