import * as vscode from 'vscode';

void (async () => {
  const extension = vscode.extensions.getExtension('sealevel-insight.sealevel-insight')
    ?? vscode.extensions.all.find(item => item.packageJSON?.name === 'sealevel-insight');
  if (!extension) throw new Error('Sealevel Insight extension was not loaded.');
  await extension.activate();
  const commands = await vscode.commands.getCommands(true);
  if (!commands.includes('sealevelInsight.analyzeWorkspace')) throw new Error('Analyze command was not registered.');
  await vscode.commands.executeCommand('sealevelInsight.analyzeWorkspace');
})();
