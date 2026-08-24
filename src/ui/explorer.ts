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
    if (!element) return [new Item('Programs', vscode.TreeItemCollapsibleState.Expanded, 'programs'), new Item(`Review Hotspots (${this.report.reviewProfile?.length ?? 0})`, vscode.TreeItemCollapsibleState.Collapsed, 'hotspots')];
    if (element.kind === 'programs') return this.report.programs.map(program => new Item(program.name, vscode.TreeItemCollapsibleState.Collapsed, 'program', program.name));
    if (element.kind === 'hotspots') return this.report.programs.flatMap(program => (program.reviewHotspots ?? []).map(hotspot => {
      const item = hotspot.location ? Item.source(`${program.name}: ${hotspot.label} (${hotspot.score})`, 'hotspot', program.name, hotspot.location) : new Item(`${program.name}: ${hotspot.label} (${hotspot.score})`, vscode.TreeItemCollapsibleState.None, 'hotspot', program.name);
      item.tooltip = hotspot.reasons.join(', ');
      return item;
    }));
    const program = this.report.programs.find(item => item.name === element.programName);
    if (!program) return [];
    if (element.kind === 'program') return [
      new Item(`Instructions (${program.instructions.length})`, vscode.TreeItemCollapsibleState.Collapsed, 'instructions', program.name),
      new Item(`Accounts (${program.accounts.length})`, vscode.TreeItemCollapsibleState.Collapsed, 'accounts', program.name),
      new Item(`Functions (${program.functions.length})`, vscode.TreeItemCollapsibleState.Collapsed, 'functions', program.name)
    ];
    if (element.kind === 'instructions') return program.instructions.map(item => Item.source(item.name, 'instruction', program.name, item.location));
    if (element.kind === 'accounts') return program.accounts.map(item => Item.source(item.name ?? item.type, 'account', program.name, item.location));
    if (element.kind === 'functions') return program.functions.map(item => Item.source(item.name, 'function', program.name, item.location));
    return [];
  }
}

export class Item extends vscode.TreeItem {
  constructor(label: string, state: vscode.TreeItemCollapsibleState, public readonly kind?: string, public readonly programName?: string) { super(label, state); this.contextValue = kind; }
  static source(label: string, kind: string, programName: string, location: import('../model/sourceLocation').SourceLocation): Item {
    const item = new Item(label, vscode.TreeItemCollapsibleState.None, kind, programName);
    const uri = vscode.Uri.parse(location.uri);
    item.command = { command: 'vscode.open', title: 'Open source', arguments: [uri, { selection: new vscode.Range(location.startLine - 1, location.startColumn, location.endLine - 1, location.endColumn) }] };
    item.resourceUri = uri;
    return item;
  }
}

export class InsightCodeLens implements vscode.CodeLensProvider {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changed.event;
  private report?: WorkspaceReport;
  setReport(report: WorkspaceReport): void { this.report = report; this.changed.fire(); }
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
