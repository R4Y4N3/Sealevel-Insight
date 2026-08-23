import * as vscode from 'vscode';
import { analyzeSources } from './analysis/analyzer';
import { scanWorkspace } from './discovery/workspaceScanner';
import { showReport } from './ui/reportPanel';
import { WorkspaceReport } from './model/report';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Sealevel Insight');
  const command = vscode.commands.registerCommand('sealevelInsight.analyzeWorkspace', async () => {
    if (!vscode.workspace.workspaceFolders?.length) {
      void vscode.window.showWarningMessage('Sealevel Insight requires an open workspace.');
      return;
    }
    await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Sealevel Insight: analyzing workspace' }, async progress => {
      try {
        progress.report({ message: 'Scanning Rust sources' });
        const sources = await scanWorkspace();
        const wasmPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'tree-sitter-rust.wasm').fsPath;
        progress.report({ message: `Parsing ${sources.length} Rust files` });
        const report = await analyzeSources(sources, wasmPath);
        report.diagnostics.forEach(diagnostic => output.appendLine(diagnostic));
        if (report.diagnostics.length) output.show(true);
        showReport(context.extensionUri, report);
        context.workspaceState.update('sealevelInsight.lastReport', report);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(message);
        output.show(true);
        void vscode.window.showErrorMessage(`Sealevel Insight could not complete analysis: ${message}`);
      }
    });
  });
  const exportJson = vscode.commands.registerCommand('sealevelInsight.exportJson', async () => {
    const report = context.workspaceState.get<WorkspaceReport>('sealevelInsight.lastReport');
    if (!report) { void vscode.window.showInformationMessage('Analyze a workspace before exporting JSON.'); return; }
    const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'sealevel-insight-report.json'), filters: { JSON: ['json'] } });
    if (uri) await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(report, null, 2), 'utf8'));
  });
  context.subscriptions.push(output, command, exportJson);
}

export function deactivate(): void { }
