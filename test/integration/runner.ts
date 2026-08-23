import * as vscode from 'vscode';

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension('sealevel-insight.sealevel-insight')
    ?? vscode.extensions.all.find(item => item.packageJSON?.name === 'sealevel-insight');
  if (!extension) throw new Error('Sealevel Insight extension was not loaded.');
  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  if (!commands.includes('sealevelInsight.analyzeWorkspace')) throw new Error('Analyze command was not registered.');
  const report = await vscode.commands.executeCommand<{ files: unknown[] }>('sealevelInsight.analyzeWorkspace');
  if (!report || !Array.isArray(report.files)) throw new Error('Analysis did not return a report.');
}
