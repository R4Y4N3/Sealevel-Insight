import * as vscode from 'vscode';
import { WorkspaceReport } from '../model/report';
import { reportHtml } from '../report/reportBuilder';

export function showReport(extensionUri: vscode.Uri, report: WorkspaceReport): void {
  const panel = vscode.window.createWebviewPanel('sealevelInsightReport', 'Sealevel Insight', vscode.ViewColumn.One, { enableScripts: true });
  const nonce = `${Date.now()}${Math.random().toString(36).slice(2)}`;
  panel.webview.html = reportHtml(report, nonce);
}
