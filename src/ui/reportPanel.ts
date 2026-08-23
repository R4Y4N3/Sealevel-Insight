import * as vscode from 'vscode';
import { WorkspaceReport } from '../model/report';
import { reportHtml } from '../report/reportBuilder';
import { isWebviewMessage } from './messageProtocol';

export function showReport(extensionUri: vscode.Uri, report: WorkspaceReport): void {
  const panel = vscode.window.createWebviewPanel('sealevelInsightReport', 'Sealevel Insight', vscode.ViewColumn.One, { enableScripts: true });
  const nonce = `${Date.now()}${Math.random().toString(36).slice(2)}`;
  panel.webview.html = reportHtml(report, nonce);
  panel.webview.onDidReceiveMessage(message => {
    if (!isWebviewMessage(message)) return;
    const location = message.location;
    const uri = vscode.Uri.parse(location.uri);
    if (uri.scheme !== 'file' || !vscode.workspace.getWorkspaceFolder(uri)) return;
    void vscode.window.showTextDocument(uri, { selection: new vscode.Range(Math.max(0, location.startLine - 1), location.startColumn, Math.max(0, location.endLine - 1), location.endColumn), preview: true });
  });
}
