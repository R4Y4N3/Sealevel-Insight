import { CallGraph, CallSite, FunctionMetric, Evidence } from '../model/report';
import { RustNode, descendants, field, nodeText } from '../parser/rustAst';

export function buildCallGraph(files: Array<{ uri: string; root: RustNode }>, functions: FunctionMetric[]): CallGraph {
  const symbols = functions.map(fn => fn.qualifiedName ?? fn.name).sort();
  const symbolsByShortName = new Map<string, string[]>();
  for (const fn of functions) symbolsByShortName.set(fn.name, [...(symbolsByShortName.get(fn.name) ?? []), fn.qualifiedName ?? fn.name]);
  const uniqueSymbol = (name: string): string | undefined => {
    const matches = symbolsByShortName.get(name) ?? [];
    return matches.length === 1 ? matches[0] : undefined;
  };
  const calls: CallSite[] = [];
  for (const file of files) for (const fn of descendants(file.root, 'function_item')) {
    const caller = nodeText(field(fn, 'name'));
    for (const call of descendants(fn, 'call_expression')) {
      const callee = call.childForFieldName('function')?.text ?? '';
      if (!callee || /::/.test(callee)) continue;
      const resolvedName = uniqueSymbol(callee);
      const resolved = !!resolvedName;
      const location = { uri: file.uri, startLine: call.startPosition.row + 1, startColumn: call.startPosition.column, endLine: call.endPosition.row + 1, endColumn: call.endPosition.column };
      const evidence: Evidence[] = [{ description: resolved ? 'name-resolved function call' : 'unresolved direct call', location }];
      calls.push({ id: `call:${file.uri}:${call.startPosition.row + 1}:${call.startPosition.column}`, caller: uniqueSymbol(caller) ?? caller, callee: resolvedName ?? callee, resolved, location, evidence });
    }
  }
  return { symbols, calls, edges: calls.filter(call => call.resolved).map(call => ({ source: call.caller, target: call.callee, confidence: 0.75 })) };
}
