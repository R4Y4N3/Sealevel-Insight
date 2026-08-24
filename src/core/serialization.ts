import { WorkspaceReport } from '../model/report';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export function portableReport(report: WorkspaceReport, root?: string | string[]): WorkspaceReport {
  const roots = (Array.isArray(root) ? root : root ? [root] : []).map(item => path.resolve(item));
  if (!roots.length) return report;
  const pathKeys = new Set(['uri', 'sourceUri', 'manifestUri', 'rootUri']);
  const pathArrayKeys = new Set(['roots', 'members', 'excluded']);
  const normalize = (value: unknown, key?: string): unknown => {
    if (Array.isArray(value)) return value.map(child => pathArrayKeys.has(key ?? '') && typeof child === 'string' ? relativeUri(child, roots) : normalize(child));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, pathKeys.has(childKey) && typeof child === 'string' ? relativeUri(child, roots) : normalize(child, childKey)]));
  };
  return normalize(report) as WorkspaceReport;
}

function relativeUri(uri: string, roots: string[]): string {
  let normalized = uri;
  try { if (uri.startsWith('file:')) normalized = fileURLToPath(uri); } catch { return uri; }
  const matches = roots.map(root => ({ root, relative: path.relative(root, path.resolve(normalized)) })).filter(item => item.relative === '' || (item.relative !== '..' && !item.relative.startsWith(`..${path.sep}`) && !path.isAbsolute(item.relative))).sort((a, b) => a.relative.length - b.relative.length);
  const match = matches[0];
  if (!match) return uri;
  const relative = match.relative || '.';
  if (roots.length > 1 && relative === '.') return path.basename(match.root);
  const prefix = roots.length > 1 ? `${path.basename(match.root)}/` : '';
  return `${prefix}${relative}`.replace(/\\/g, '/');
}

export function markdownReport(report: WorkspaceReport): string {
  return `# Sealevel Insight\n\nSchema: ${report.schemaVersion}\n\n## Overview\n\n| Metric | Value |\n|---|---:|\n| Programs | ${report.programs.length} |\n| Rust files | ${report.summary.rustFiles} |\n| nSLOC | ${report.summary.codeLoc} |\n| Functions | ${report.summary.functions} |\n| Instructions | ${report.summary.instructions} |\n| CPIs | ${report.summary.cpis} |\n| PDAs | ${report.summary.pdas} |\n\n## Programs\n\n${report.programs.map(program => `### ${program.name}\n\nFrameworks: ${program.frameworkEvidence.map(item => item.framework).join(', ') || 'unknown'}\n\nFunctions: ${program.functions.length}`).join('\n\n')}`;
}

export function standaloneHtml(value: unknown): string {
    const json = JSON.stringify(value).replace(/</g, '\\u003c');
    return `<!doctype html><meta charset="utf-8"><title>Sealevel Insight</title><style>body{font:14px sans-serif;max-width:1000px;margin:2rem auto;background:#fff;color:#222}pre{white-space:pre-wrap}</style><h1>Sealevel Insight</h1><pre id="report"></pre><script>document.getElementById('report').textContent=JSON.stringify(${json},null,2)</script>`;
  }
