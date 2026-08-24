import { CompilationProfile, Evidence } from '../model/report';
import { RustNode } from '../parser/rustAst';

export type CfgStatus = 'active' | 'inactive' | 'unknown';
export interface CfgRange { status: 'unknown'; predicates: string[]; startLine: number; startColumn: number; endLine: number; endColumn: number; evidence: Evidence[]; }
export interface CfgFileAnalysis {
  source: string;
  inactiveItems: number;
  unknownItems: number;
  unknownPredicates: string[];
  unknownRanges: CfgRange[];
}

interface CfgContext { features?: Set<string>; profile?: CompilationProfile; options: Set<string>; }

export function analyzeConditionalCompilation(root: RustNode, uri: string, source: string, enabledFeatures?: string[], profile?: CompilationProfile): CfgFileAnalysis {
  const context: CfgContext = { features: enabledFeatures ? new Set(enabledFeatures) : undefined, profile, options: new Set(profile?.cfgOptions.map(normalizeOption) ?? []) };
  const inactive: Array<{ start: number; end: number }> = [];
  const unknownRanges: CfgRange[] = [];
  let inactiveItems = 0;
  walk(root, node => {
    if (node.type === 'attribute_item') return;
    const attributes = precedingAttributes(node);
    if (!attributes.length) return;
    const evaluations = attributes.flatMap(attribute => evaluateAttribute(attribute.text, context));
    if (!evaluations.length) return;
    const status: CfgStatus = evaluations.some(item => item.status === 'inactive') ? 'inactive' : evaluations.some(item => item.status === 'unknown') ? 'unknown' : 'active';
    const predicates = [...new Set(evaluations.filter(item => item.status !== 'active').map(item => item.predicate))].sort();
    if (status === 'inactive') {
      inactiveItems++;
      inactive.push({ start: attributes[0].startIndex, end: node.endIndex });
    } else if (status === 'unknown') {
      const location = { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
      unknownRanges.push({ status: 'unknown', predicates, startLine: location.startLine, startColumn: location.startColumn, endLine: location.endLine, endColumn: location.endColumn, evidence: predicates.map(predicate => ({ description: `Conditional compilation could not be evaluated: ${predicate}`, location })) });
    }
  });
  return {
    source: maskByteRanges(source, inactive), inactiveItems, unknownItems: unknownRanges.length,
    unknownPredicates: [...new Set(unknownRanges.flatMap(item => item.predicates))].sort(), unknownRanges
  };
}

function evaluateAttribute(attribute: string, context: CfgContext): Array<{ status: CfgStatus; predicate: string }> {
  const text = attribute.trim();
  if (text.startsWith('#[cfg(') && text.endsWith(')]')) {
    const predicate = text.slice(6, -2).trim(); return [{ status: evaluatePredicate(predicate, context), predicate }];
  }
  if (text.startsWith('#[cfg_attr(') && text.endsWith(')]')) {
    const body = text.slice(11, -2); const parts = splitTopLevel(body); if (parts.length < 2) return [];
    const condition = parts.shift()!.trim(); const conditionStatus = evaluatePredicate(condition, context);
    const nested = parts.flatMap(item => evaluateNestedCfg(item.trim(), context));
    if (!nested.length || conditionStatus === 'inactive') return [];
    if (conditionStatus === 'unknown') return [{ status: 'unknown', predicate: `cfg_attr(${condition}, ${parts.join(', ')})` }];
    return nested;
  }
  return [];
}

function evaluateNestedCfg(value: string, context: CfgContext): Array<{ status: CfgStatus; predicate: string }> {
  if (!value.startsWith('cfg(') || !value.endsWith(')')) return [];
  const predicate = value.slice(4, -1).trim(); return [{ status: evaluatePredicate(predicate, context), predicate }];
}

export function evaluateCfgPredicate(predicate: string, enabledFeatures?: string[], profile?: CompilationProfile): CfgStatus {
  return evaluatePredicate(predicate, { features: enabledFeatures ? new Set(enabledFeatures) : undefined, profile, options: new Set(profile?.cfgOptions.map(normalizeOption) ?? []) });
}

function evaluatePredicate(value: string, context: CfgContext): CfgStatus {
  const predicate = value.trim();
  if (predicate === 'true') return 'active';
  if (predicate === 'false') return 'inactive';
  if (predicate === 'test') return context.profile ? context.profile.mode === 'test' ? 'active' : 'inactive' : 'inactive';
  if (predicate === 'debug_assertions' && context.profile?.debugAssertions !== undefined) return context.profile.debugAssertions ? 'active' : 'inactive';
  const feature = /^feature\s*=\s*(?:"([^"]+)"|r#"([^"]+)"#)$/.exec(predicate);
  if (feature) {
    if (context.features) return context.features.has(feature[1] ?? feature[2]) ? 'active' : 'inactive';
    if (context.options.has(normalizeOption(predicate))) return 'active';
    return context.profile?.cfgKnowledge === 'complete' ? 'inactive' : 'unknown';
  }
  const composite = /^(all|any|not)\s*\(([\s\S]*)\)$/.exec(predicate);
  if (composite) {
    const values = splitTopLevel(composite[2]).map(item => evaluatePredicate(item, context));
    if (composite[1] === 'not') return values.length === 1 ? invert(values[0]) : 'unknown';
    if (composite[1] === 'all') return values.some(item => item === 'inactive') ? 'inactive' : values.every(item => item === 'active') ? 'active' : 'unknown';
    return values.some(item => item === 'active') ? 'active' : values.every(item => item === 'inactive') ? 'inactive' : 'unknown';
  }
  const normalized = normalizeOption(predicate);
  if (context.options.has(normalized)) return 'active';
  if (context.profile?.cfgKnowledge === 'complete' && isConfigurationOption(predicate)) return 'inactive';
  return 'unknown';
}

function precedingAttributes(node: RustNode): RustNode[] {
  const attributes: RustNode[] = []; let sibling = node.previousNamedSibling;
  while (sibling?.type === 'attribute_item') { attributes.unshift(sibling); sibling = sibling.previousNamedSibling; }
  return attributes;
}
function walk(node: RustNode, visit: (node: RustNode) => void): void { for (const child of node.namedChildren.filter((item): item is RustNode => !!item)) { visit(child); if (child.type !== 'attribute_item') walk(child, visit); } }
function invert(status: CfgStatus): CfgStatus { return status === 'active' ? 'inactive' : status === 'inactive' ? 'active' : 'unknown'; }
function normalizeOption(value: string): string { return value.trim().replace(/\s*=\s*/, '='); }
function isConfigurationOption(value: string): boolean { return /^[A-Za-z_][A-Za-z0-9_]*(?:\s*=\s*(?:"[^"]*"|r#"[^"]*"#))?$/.test(value.trim()); }
function splitTopLevel(value: string): string[] { const output: string[] = []; let depth = 0; let quoted = false; let start = 0; for (let index = 0; index < value.length; index++) { const char = value[index]; if (char === '"' && value[index - 1] !== '\\') quoted = !quoted; else if (!quoted && char === '(') depth++; else if (!quoted && char === ')') depth--; else if (!quoted && char === ',' && depth === 0) { output.push(value.slice(start, index)); start = index + 1; } } output.push(value.slice(start)); return output.map(item => item.trim()).filter(Boolean); }
function maskByteRanges(source: string, ranges: Array<{ start: number; end: number }>): string { if (!ranges.length) return source; const bytes = Buffer.from(source); for (const range of ranges) for (let index = Math.max(0, range.start); index < Math.min(bytes.length, range.end); index++) if (bytes[index] !== 10 && bytes[index] !== 13) bytes[index] = 32; return bytes.toString(); }
