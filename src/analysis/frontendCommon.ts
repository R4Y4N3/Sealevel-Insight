import { CallGraph, CallSite, Evidence, FileMetric, PackageKind, ProgramUnit, SourceLanguage } from '../model/report';
import { countLines } from '../utils/text';

export function createSourceProgram(name: string, language: SourceLanguage, manifestUri?: string, packageKind: PackageKind = 'solana-program', packageEvidence: Evidence[] = []): ProgramUnit {
  return {
    name, manifestUri, packageKind, packageEvidence, sourceLanguage: language, sourceFiles: [], rustFiles: [], functions: [], instructions: [], accounts: [], frameworkEvidence: [],
    securitySurface: { signerSignals: 0, writableSignals: 0, ownerValidationSignals: 0, addressValidationSignals: 0, remainingAccounts: 0, rawOrUncheckedAccounts: 0, manualAccountIteration: 0, unsafeBlocks: 0, manualSignerChecks: 0, manualOwnerChecks: 0, manualWritableChecks: 0, manualAddressChecks: 0, manualSerialization: 0, reallocOperations: 0, unsafeFunctions: 0, cpiSites: [], pdaSites: [] },
    relationships: [], architecture: { nodes: [], edges: [] }
  };
}

export function textFileMetric(uri: string, source: string, language: SourceLanguage, values: Partial<FileMetric> = {}): FileMetric {
  return { uri, language, ...countLines(source), functions: 0, structs: 0, enums: 0, traits: 0, implBlocks: 0, unsafeBlocks: 0, macroInvocations: 0, ...values };
}

export function offsetLocation(uri: string, source: string, start: number, end: number) {
  const before = source.slice(0, start).split(/\r?\n/); const through = source.slice(0, end).split(/\r?\n/);
  return { uri, startLine: before.length, startColumn: before.at(-1)!.length, endLine: through.length, endColumn: through.at(-1)!.length };
}

export function stableId(prefix: string, uri: string, line: number, name: string): string {
  return `${prefix}:${uri}:${line}:${name}`;
}

export function simpleCallGraph(symbols: string[], calls: CallSite[]): CallGraph {
  const orderedCalls = [...calls].sort((a, b) => a.id.localeCompare(b.id));
  const edges = orderedCalls.filter(call => call.resolved && call.target).map(call => ({ source: call.caller, target: call.target!, confidence: call.confidence ?? 0.5 })).sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`));
  const adjacency = new Map<string, string[]>(); for (const edge of edges) adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]);
  let nextIndex = 0; const indexes = new Map<string, number>(); const low = new Map<string, number>(); const stack: string[] = []; const onStack = new Set<string>(); const components: string[][] = [];
  const visit = (symbol: string): void => { indexes.set(symbol, nextIndex); low.set(symbol, nextIndex++); stack.push(symbol); onStack.add(symbol); for (const target of adjacency.get(symbol) ?? []) { if (!indexes.has(target)) { visit(target); low.set(symbol, Math.min(low.get(symbol)!, low.get(target)!)); } else if (onStack.has(target)) low.set(symbol, Math.min(low.get(symbol)!, indexes.get(target)!)); } if (low.get(symbol) !== indexes.get(symbol)) return; const component: string[] = []; let item = ''; do { item = stack.pop()!; onStack.delete(item); component.push(item); } while (item !== symbol); components.push(component.sort()); };
  for (const symbol of [...new Set(symbols)].sort()) if (!indexes.has(symbol)) visit(symbol);
  const cycles = components.filter(component => component.length > 1 || edges.some(edge => edge.source === component[0] && edge.target === component[0])).map(component => { const members = new Set(component); const cycleCalls = orderedCalls.filter(call => members.has(call.caller) && !!call.target && members.has(call.target)); return { id: `cycle:${component.join('|')}`, kind: component.length === 1 ? 'self-recursion' as const : 'mutual-recursion' as const, functions: component, callIds: cycleCalls.map(call => call.id), evidence: cycleCalls.map(call => ({ description: `${component.length === 1 ? 'self' : 'mutual'} recursion call`, location: call.location })) }; });
  return { symbols: [...new Set(symbols)].sort(), calls: orderedCalls, edges, cycles };
}
