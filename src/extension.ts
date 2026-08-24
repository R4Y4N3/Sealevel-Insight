import * as vscode from 'vscode';
import { AnalysisCancelledError, analyzeSources } from './analysis/analyzer';
import { scanWorkspace } from './discovery/workspaceScanner';
import { showReport } from './ui/reportPanel';
import { CompilationProfile, WorkspaceReport } from './model/report';
import { InsightExplorer, InsightCodeLens, InsightHover } from './ui/explorer';
import { discoverIdlsDetailed } from './idl/discovery';
import { reconcileIdls } from './idl/reconciliation';
import { markdownReport, portableReport, standaloneHtml } from './core/serialization';
import { buildCapabilities } from './analysis/capabilities';
import { enrichProgramIdentities, programIdentityFingerprint } from './discovery/programIdentity';
import { analysisCacheKey, clearAnalysisCache, readAnalysisCache, writeAnalysisCache } from './core/cache';
import { buildScope } from './core/scope';
import { diffReports } from './core/diff';
import { refreshAuditProducts } from './analysis/auditProducts';

type AnalysisMode = 'workspace' | 'package' | 'file';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Sealevel Insight');
  const diagnostics = vscode.languages.createDiagnosticCollection('Sealevel Insight');
  const explorer = new InsightExplorer(); const codeLens = new InsightCodeLens();
  let lastReport = context.workspaceState.get<WorkspaceReport>('sealevelInsight.lastReport');
  if (lastReport) { explorer.setReport(lastReport); codeLens.setReport(lastReport); publishDiagnostics(lastReport, diagnostics); }
  let analysisGeneration = 0;

  const runAnalysis = async (mode: AnalysisMode): Promise<WorkspaceReport | undefined> => {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) { void vscode.window.showWarningMessage('Sealevel Insight requires an open workspace.'); return; }
    const generation = ++analysisGeneration;
    return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Sealevel Insight: analyzing ${mode}`, cancellable: true }, async (progress, token) => {
      try {
        progress.report({ message: 'Scanning Rust and Cargo sources' });
        let sources = await scanWorkspace(); if (token.isCancellationRequested || generation !== analysisGeneration) return;
        const activeUri = vscode.window.activeTextEditor?.document.uri.toString();
        if (mode === 'file') sources = sources.filter(source => source.uri === activeUri);
        if (mode === 'package') { const active = sources.find(source => source.uri === activeUri); if (!active) throw new Error('The active editor is not a discovered Rust source file.'); sources = sources.filter(source => source.packageId ? source.packageId === active.packageId : source.packageName === active.packageName); }
        if (!sources.length) throw new Error(`No Rust sources matched the ${mode} analysis scope.`);
        const configuration = vscode.workspace.getConfiguration('sealevelInsight');
        const enableIdl = configuration.get<boolean>('enableIdlAnalysis', false); const idlPatterns = configuration.get<string[]>('idlPatterns');
        const discoveries = enableIdl ? await Promise.all(workspaceFolders.map(folder => discoverIdlsDetailed(folder.uri.fsPath, idlPatterns))) : [];
        const fingerprints = await Promise.all(workspaceFolders.map(folder => programIdentityFingerprint(folder.uri.fsPath)));
        const compilationProfile = profileFromConfiguration(configuration);
        const cacheConfig = { mode, includePatterns: configuration.get('includePatterns'), excludePatterns: configuration.get('excludePatterns'), includeTests: configuration.get('includeTests'), maxFileSize: configuration.get('maxFileSize'), compilationProfile, idls: discoveries.flatMap(item => item.programs), fingerprints };
        const cacheKey = analysisCacheKey(sources, cacheConfig); const cacheDir = vscode.Uri.joinPath(context.globalStorageUri, 'analysis-cache').fsPath;
        let report = await readAnalysisCache(cacheDir, cacheKey);
        if (!report) {
          progress.report({ message: `Parsing and indexing ${sources.length} Rust files` });
          const wasmPath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'tree-sitter-rust.wasm').fsPath; const runtimePath = vscode.Uri.joinPath(context.extensionUri, 'dist', 'tree-sitter.wasm').fsPath;
          report = await analyzeSources(sources, wasmPath, runtimePath, () => token.isCancellationRequested || generation !== analysisGeneration, { compilationProfile });
          if (token.isCancellationRequested || generation !== analysisGeneration) return;
          report.workspace = { name: workspaceFolders.map(folder => folder.name).join(', '), roots: workspaceFolders.map(folder => folder.uri.fsPath) };
          const identityDiagnostics = (await Promise.all(workspaceFolders.map(folder => enrichProgramIdentities(folder.uri.fsPath, report!.programs)))).flat(); report.analysisDiagnostics?.push(...identityDiagnostics); report.diagnostics.push(...identityDiagnostics.map(item => item.message));
          if (enableIdl) { const idlDiagnostics = discoveries.flatMap(item => item.diagnostics); report.analysisDiagnostics?.push(...idlDiagnostics); report.diagnostics.push(...idlDiagnostics.map(item => item.message)); report.idl = reconcileIdls(report.programs, discoveries.flatMap(item => item.programs)); for (const program of report.programs) program.capabilities = buildCapabilities(program, true); }
          refreshAuditProducts(report);
          if (token.isCancellationRequested || generation !== analysisGeneration) return;
          await writeAnalysisCache(cacheDir, cacheKey, report);
        } else progress.report({ message: 'Loaded deterministic analysis cache' });
        if (token.isCancellationRequested || generation !== analysisGeneration) return;
        lastReport = report; explorer.setReport(report); codeLens.setReport(report); publishDiagnostics(report, diagnostics);
        report.diagnostics.forEach(item => output.appendLine(item)); if (report.diagnostics.length) output.show(true);
        showReport(report); await context.workspaceState.update('sealevelInsight.lastReport', report); return report;
      } catch (error) { if (error instanceof AnalysisCancelledError || token.isCancellationRequested || generation !== analysisGeneration) return; const message = error instanceof Error ? error.message : String(error); output.appendLine(message); output.show(true); void vscode.window.showErrorMessage(`Sealevel Insight could not complete analysis: ${message}`); throw error; }
    });
  };

  const commands: vscode.Disposable[] = [
    vscode.commands.registerCommand('sealevelInsight.analyzeWorkspace', () => runAnalysis('workspace')),
    vscode.commands.registerCommand('sealevelInsight.analyzePackage', () => runAnalysis('package')),
    vscode.commands.registerCommand('sealevelInsight.analyzeFile', () => runAnalysis('file')),
    vscode.commands.registerCommand('sealevelInsight.openReport', () => lastReport ? showReport(lastReport) : void vscode.window.showInformationMessage('Analyze a workspace before opening a report.')),
    vscode.commands.registerCommand('sealevelInsight.openArchitecture', () => lastReport ? showReport(lastReport) : void vscode.window.showInformationMessage('Analyze a workspace before opening architecture.')),
    vscode.commands.registerCommand('sealevelInsight.openCallGraph', () => lastReport ? showReport(lastReport) : void vscode.window.showInformationMessage('Analyze a workspace before opening a call graph.')),
    vscode.commands.registerCommand('sealevelInsight.exportJson', () => exportReport('json')),
    vscode.commands.registerCommand('sealevelInsight.exportMarkdown', () => exportReport('markdown')),
    vscode.commands.registerCommand('sealevelInsight.exportHtml', () => exportReport('html')),
    vscode.commands.registerCommand('sealevelInsight.exportScope', exportScope),
    vscode.commands.registerCommand('sealevelInsight.saveBaseline', async () => { if (!lastReport) { void vscode.window.showInformationMessage('Analyze a workspace before saving a baseline.'); return; } await context.workspaceState.update('sealevelInsight.baseline', lastReport); void vscode.window.showInformationMessage('Sealevel Insight baseline saved.'); }),
    vscode.commands.registerCommand('sealevelInsight.compareBaseline', async () => { const baseline = context.workspaceState.get<WorkspaceReport>('sealevelInsight.baseline'); if (!baseline || !lastReport) { void vscode.window.showInformationMessage('Save a baseline and analyze the workspace before comparing.'); return; } const document = await vscode.workspace.openTextDocument({ language: 'json', content: JSON.stringify(diffReports(baseline, lastReport), null, 2) }); await vscode.window.showTextDocument(document, { preview: true }); }),
    vscode.commands.registerCommand('sealevelInsight.clearCache', async () => { await clearAnalysisCache(vscode.Uri.joinPath(context.globalStorageUri, 'analysis-cache').fsPath); void vscode.window.showInformationMessage('Sealevel Insight analysis cache cleared.'); })
  ];

  async function exportReport(format: 'json' | 'markdown' | 'html'): Promise<void> { if (!lastReport) { void vscode.window.showInformationMessage('Analyze a workspace before exporting.'); return; } const extension = format === 'markdown' ? 'md' : format; const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, `sealevel-insight-report.${extension}`), filters: { [format.toUpperCase()]: [extension] } }); if (!uri) return; const roots = (vscode.workspace.workspaceFolders ?? []).map(folder => folder.uri.fsPath); const portable = portableReport(lastReport, roots); const text = format === 'json' ? JSON.stringify(portable, null, 2) : format === 'markdown' ? markdownReport(portable) : standaloneHtml(portable); await vscode.workspace.fs.writeFile(uri, Buffer.from(text, 'utf8')); }
  async function exportScope(): Promise<void> { const folder = vscode.workspace.workspaceFolders?.[0]; if (!folder) return; const scope = await buildScope(folder.uri.fsPath); const uri = await vscode.window.showSaveDialog({ defaultUri: vscode.Uri.joinPath(folder.uri, 'sealevel-insight-scope.json'), filters: { JSON: ['json'] } }); if (uri) await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(scope, null, 2))); }

  let autoAnalyzeTimer: NodeJS.Timeout | undefined;
  const scheduleAuto = (uri?: vscode.Uri) => { if (!vscode.workspace.getConfiguration('sealevelInsight').get<boolean>('autoAnalyze', false)) return; if (uri && !/\.(?:rs|toml|json)$|\.sealevel-insight\.json$/.test(uri.path)) return; if (autoAnalyzeTimer) clearTimeout(autoAnalyzeTimer); autoAnalyzeTimer = setTimeout(() => void runAnalysis('workspace'), 500); };
  const watcher = vscode.workspace.createFileSystemWatcher('**/{*.rs,Cargo.toml,Anchor.toml,Quasar.toml,*.json,.sealevel-insight.json}'); watcher.onDidCreate(scheduleAuto); watcher.onDidChange(scheduleAuto); watcher.onDidDelete(scheduleAuto);
  const saveWatcher = vscode.workspace.onDidSaveTextDocument(document => scheduleAuto(document.uri));
  context.subscriptions.push(output, diagnostics, ...commands, watcher, saveWatcher, { dispose: () => { analysisGeneration++; if (autoAnalyzeTimer) clearTimeout(autoAnalyzeTimer); } }, vscode.window.registerTreeDataProvider('sealevelInsightExplorer', explorer), vscode.languages.registerCodeLensProvider({ language: 'rust' }, codeLens), vscode.languages.registerHoverProvider({ language: 'rust' }, new InsightHover(() => lastReport)));
}

function publishDiagnostics(report: WorkspaceReport, collection: vscode.DiagnosticCollection): void { collection.clear(); const grouped = new Map<string, vscode.Diagnostic[]>(); for (const item of report.analysisDiagnostics ?? []) { if (!item.location?.uri.startsWith('file:')) continue; const severity = item.severity === 'error' ? vscode.DiagnosticSeverity.Error : item.severity === 'warning' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information; const diagnostic = new vscode.Diagnostic(new vscode.Range(item.location.startLine - 1, item.location.startColumn, item.location.endLine - 1, item.location.endColumn), item.message, severity); diagnostic.source = 'Sealevel Insight'; diagnostic.code = item.category; grouped.set(item.location.uri, [...(grouped.get(item.location.uri) ?? []), diagnostic]); } for (const [uri, items] of grouped) collection.set(vscode.Uri.parse(uri), items); }
function profileFromConfiguration(configuration: vscode.WorkspaceConfiguration): CompilationProfile | undefined {
  const target = configuration.get<string>('compilationTarget', '').trim(); const cfgOptions = configuration.get<string[]>('cfgOptions', []).filter(item => typeof item === 'string' && item.trim()).map(item => item.trim());
  const cfgKnowledge = configuration.get<'partial' | 'complete'>('cfgKnowledge', 'partial'); const mode = configuration.get<'normal' | 'test'>('compilationMode', 'normal'); const debug = configuration.get<'unknown' | 'enabled' | 'disabled'>('debugAssertions', 'unknown');
  if (!target && !cfgOptions.length && cfgKnowledge === 'partial' && mode === 'normal' && debug === 'unknown') return undefined;
  return { target: target || undefined, mode, debugAssertions: debug === 'unknown' ? undefined : debug === 'enabled', cfgOptions: [...new Set(cfgOptions)].sort(), cfgKnowledge, evidence: [{ description: `VS Code compilation profile${target ? ` target ${target}` : ''}; ${cfgKnowledge} cfg option set` }] };
}
export function deactivate(): void { }
