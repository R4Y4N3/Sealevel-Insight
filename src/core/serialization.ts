import { WorkspaceReport } from '../model/report';

export function portableReport(report: WorkspaceReport, root?: string): WorkspaceReport {
  if (!root) return report;
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, key === 'uri' && typeof child === 'string' ? relativeUri(child, root) : normalize(child)]));
  };
  return normalize(report) as WorkspaceReport;
}

function relativeUri(uri: string, root: string): string {
  const normalized = uri.replace(/^file:\/\//, '');
  return normalized.startsWith(root) ? normalized.slice(root.length).replace(/^[/\\]/, '') : uri;
}

export function markdownReport(report: WorkspaceReport): string {
  return `# Sealevel Insight\n\nSchema: ${report.schemaVersion}\n\n## Overview\n\n| Metric | Value |\n|---|---:|\n| Programs | ${report.programs.length} |\n| Rust files | ${report.summary.rustFiles} |\n| nSLOC | ${report.summary.codeLoc} |\n| Functions | ${report.summary.functions} |\n| Instructions | ${report.summary.instructions} |\n| CPIs | ${report.summary.cpis} |\n| PDAs | ${report.summary.pdas} |\n\n## Programs\n\n${report.programs.map(program => `### ${program.name}\n\nFrameworks: ${program.frameworkEvidence.map(item => item.framework).join(', ') || 'unknown'}\n\nFunctions: ${program.functions.length}`).join('\n\n')}`;
}

  export function standaloneHtml(value: unknown): string {
    const json = JSON.stringify(value).replace(/</g, '\\u003c');
    return `<!doctype html><meta charset="utf-8"><title>Sealevel Insight</title><style>body{font:14px sans-serif;max-width:1000px;margin:2rem auto;background:#fff;color:#222}pre{white-space:pre-wrap}</style><h1>Sealevel Insight</h1><pre id="report"></pre><script>document.getElementById('report').textContent=JSON.stringify(${json},null,2)</script>`;
  }
