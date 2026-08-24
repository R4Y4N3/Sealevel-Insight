import * as vscode from 'vscode';
import { analyzeSources } from './analysis/analyzer';
import { scanWorkspace } from './discovery/workspaceScanner';
import { showReport } from './ui/reportPanel';
import { WorkspaceReport } from './model/report';
import { InsightExplorer, InsightCodeLens, InsightHover } from './ui/explorer';
import { discoverIdls } from './idl/discovery';
import { reconcileIdls } from './idl/reconciliation';
import { portableReport } from './core/serialization';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Sealevel Insight');
  const explorer = new InsightExplorer();
  const codeLens = new InsightCodeLens();
  let lastReport = context.workspaceState.get<WorkspaceReport>('sealevelInsight.lastReport');
  if (lastReport) { explorer.setReport(lastReport); codeLens.setReport(lastReport); }
  const command = vscode.commands.registerCommand('sealevelInsight.analyzeWorkspace', async () => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      void vscode.window.showWarningMessage('Sealevel Insight requires an open workspace.');
      return;
    }
    return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Sealevel Insight: analyzing workspace' }, async progress => {
      try {
        progress.report({ message: 'Scanning Rust sources' });
        const sources = await scanWorkspace();
        const wasmPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'tree-sitter-rust.wasm').fsPath;
        progress.report({ message: `Parsing ${sources.length} Rust files` });
        const runtimePath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'tree-sitter.wasm').fsPath;
        const report = await analyzeSources(sources, wasmPath, runtimePath);
        if (vscode.workspace.getConfiguration('sealevelInsight').get<boolean>('enableIdlAnalysis', false)) {
          const idls = (await Promise.all(workspaceFolders.map(folder => discoverIdls(folder.uri.fsPath)))).flat();
          report.idl = reconcileIdls(report.programs, idls);
        }
        lastReport = report;
        explorer.setReport(report);
        codeLens.setReport(report);
        report.diagnostics.forEach(diagnostic => output.appendLine(diagnostic));
        if (report.diagnostics.length) output.show(true);
        showReport(report);
        await context.workspaceState.update('sealevelInsight.lastReport', report);
        return report;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        output.appendLine(message);
        output.show(true);
        void vscode.window.showErrorMessage(`Sealevel Insight could not complete analysis: ${message}`);
      }
    });
  });
  const exportJson = vscode.commands.registerCommand('sealevelInsight.exportJson', async () => {
    const report = lastReport ?? context.workspaceState.get<WorkspaceReport>('sealevelInsight.lastReport');
    if (!report) { void vscode.window.showInformationMessage('Analyze a workspace before exporting JSON.'); return; }
    const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, 'sealevel-insight-report.json'), filters: { JSON: ['json'] } });
    if (uri) {
      const roots = (vscode.workspace.workspaceFolders ?? []).map(folder => folder.uri.fsPath);
      const portable = JSON.stringify(portableReport(report, roots), null, 2);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(portable, 'utf8'));
    }
  });
  let autoAnalyzeTimer: NodeJS.Timeout | undefined;
  const autoAnalyze = vscode.workspace.onDidSaveTextDocument(document => {
    if (document.languageId !== 'rust' || !vscode.workspace.getConfiguration('sealevelInsight').get<boolean>('autoAnalyze', false)) return;
    if (autoAnalyzeTimer) clearTimeout(autoAnalyzeTimer);
    autoAnalyzeTimer = setTimeout(() => void vscode.commands.executeCommand('sealevelInsight.analyzeWorkspace'), 400);
  });
  context.subscriptions.push(output, command, exportJson, autoAnalyze, { dispose: () => { if (autoAnalyzeTimer) clearTimeout(autoAnalyzeTimer); } }, vscode.window.registerTreeDataProvider('sealevelInsightExplorer', explorer), vscode.languages.registerCodeLensProvider({ language: 'rust' }, codeLens), vscode.languages.registerHoverProvider({ language: 'rust' }, new InsightHover(() => lastReport)));
}

export function deactivate(): void { }
