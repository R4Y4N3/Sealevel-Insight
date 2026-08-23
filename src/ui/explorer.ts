import * as vscode from 'vscode';
import { WorkspaceReport } from '../model/report';

export class InsightExplorer implements vscode.TreeDataProvider<Item> {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;
  private report?: WorkspaceReport;
  setReport(report: WorkspaceReport): void { this.report = report; this.changed.fire(); }
  getTreeItem(item: Item): vscode.TreeItem { return item; }
  getChildren(element?: Item): Item[] {
    if (!this.report) return [new Item('Run Analyze Workspace first', vscode.TreeItemCollapsibleState.None)];
    if (!element) return [new Item('Programs', vscode.TreeItemCollapsibleState.Expanded, 'programs'), new Item(`Review Hotspots (${this.report.reviewProfile?.length ?? 0})`, vscode.TreeItemCollapsibleState.None)];
    if (element.kind !== 'programs') return [];
    return this.report.programs.map(program => new Item(program.name, vscode.TreeItemCollapsibleState.Collapsed, 'program'));
  }
}

export class Item extends vscode.TreeItem {
  constructor(label: string, state: vscode.TreeItemCollapsibleState, public readonly kind?: string) { super(label, state); this.contextValue = kind; }
}

export class InsightCodeLens implements vscode.CodeLensProvider {
  private report?: WorkspaceReport;
  setReport(report: WorkspaceReport): void { this.report = report; }
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!this.report || !vscode.workspace.getConfiguration('sealevelInsight').get<boolean>('showCodeLens', true)) return [];
    const functions = this.report.programs.flatMap(program => program.functions.filter(fn => fn.location.uri === document.uri.toString() && this.report!.programs.some(item => item.instructions.some(instruction => instruction.functionName === fn.name))));
    return functions.map(fn => new vscode.CodeLens(new vscode.Range(fn.location.startLine - 1, 0, fn.location.startLine - 1, 0), { title: `Sealevel Insight • complexity ${fn.complexity}`, command: 'sealevelInsight.analyzeWorkspace' }));
  }
}

export class InsightHover implements vscode.HoverProvider {
  constructor(private readonly report: () => WorkspaceReport | undefined) {}
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const report = this.report();
    const line = position.line + 1;
    const account = report?.programs.flatMap(program => program.accounts).find(item => item.location.uri === document.uri.toString() && item.location.startLine <= line && item.location.endLine >= line);
    if (!account) return undefined;
    return new vscode.Hover(`**${account.name ?? account.type}**\n\nSigner: ${account.signer ? 'yes' : 'no'}\n\nWritable: ${account.writable ? 'yes' : 'no'}\n\nConstraints: ${(account.constraints ?? []).map(constraint => constraint.kind).join(', ') || 'none'}`);
  }
}
