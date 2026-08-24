import { CallGraph, CallResolutionStatus, CallSite, Evidence, FunctionMetric, RustSymbol } from '../model/report';
import { descendants, RustNode } from '../parser/rustAst';
import { RustSymbolIndex } from './symbolIndex';

export function buildCallGraph(files: Array<{ uri: string; root: RustNode }>, functions: FunctionMetric[], index?: RustSymbolIndex): CallGraph {
  const symbols = index?.symbols.filter(symbol => symbol.kind === 'function' || symbol.kind === 'method') ?? fallbackSymbols(functions);
  const calls: CallSite[] = [];
  for (const file of files) {
    for (const call of descendants(file.root, 'call_expression')) {
      const expression = call.childForFieldName('function')?.text ?? '';
      if (!expression) continue;
      const callerSymbol = enclosingFunction(symbols, file.uri, call.startPosition.row + 1, call.startPosition.column);
      const caller = callerSymbol?.qualifiedName ?? enclosingFallback(functions, file.uri, call.startPosition.row + 1)?.qualifiedName ?? '<unknown>';
      const resolution = resolveCall(expression, callerSymbol, file.uri, symbols, index);
      const location = { uri: file.uri, startLine: call.startPosition.row + 1, startColumn: call.startPosition.column, endLine: call.endPosition.row + 1, endColumn: call.endPosition.column };
      const evidence: Evidence[] = [{ description: `${resolution.status} Rust call ${expression}`, location }];
      calls.push({
        id: `call:${file.uri}:${location.startLine}:${location.startColumn}`, caller, callee: resolution.target ?? expression,
        resolved: resolution.status === 'resolved', sourceExpression: expression, candidateTargets: resolution.candidates,
        target: resolution.target, status: resolution.status, confidence: resolution.confidence, location, evidence
      });
    }
  }
  const edges = calls.filter(call => call.status === 'resolved' && call.target).map(call => ({ source: call.caller, target: call.target!, confidence: call.confidence ?? 0.75 }));
  return { symbols: symbols.map(symbol => symbol.qualifiedName).sort(), calls: calls.sort((a, b) => a.id.localeCompare(b.id)), edges: [...new Map(edges.map(edge => [`${edge.source}:${edge.target}`, edge])).values()] };
}

function resolveCall(expression: string, caller: RustSymbol | undefined, fileUri: string, symbols: RustSymbol[], index?: RustSymbolIndex): { status: CallResolutionStatus; candidates: string[]; target?: string; confidence: number } {
  if (/\.|\)|\]|\}/.test(expression) && !/^(?:crate|self|super|Self)(?:::|$)/.test(expression)) return { status: 'dynamic', candidates: [], confidence: 0.4 };
  const module = caller?.module ?? index?.modulesByFile.get(fileUri) ?? 'crate';
  const imports = index?.imports.filter(item => item.fileUri === fileUri && item.module === module) ?? [];
  const allSymbols = index?.symbols ?? symbols;
  const candidates = new Set<string>();
  let classifiedExternal = false;
  const addExact = (name: string) => symbols.filter(symbol => symbol.qualifiedName === name).forEach(symbol => candidates.add(symbol.qualifiedName));
  const addSuffix = (suffix: string) => symbols.filter(symbol => symbol.qualifiedName.endsWith(`::${suffix}`) || symbol.qualifiedName === suffix).forEach(symbol => candidates.add(symbol.qualifiedName));

  if (expression.includes('::')) {
    const first = expression.split('::')[0];
    const imported = imports.find(item => !item.glob && item.alias === first);
    if (imported) addExact(`${imported.target}${expression.slice(first.length)}`);
    const normalized = normalizePathExpression(expression, module, caller);
    addExact(normalized);
    const localModule = localModuleTarget(expression.split('::')[0], module, allSymbols);
    if (localModule) addThroughReexports(localModule, expression.split('::').slice(1).join('::'), allSymbols, index, candidates);
    if (!candidates.size && !/^(crate|self|super|Self)$/.test(first) && !allSymbols.some(symbol => symbol.module === `crate::${first}` || symbol.qualifiedName.startsWith(`crate::${first}::`))) return { status: 'external', candidates: [], confidence: 0.8 };
  } else {
    addExact(`${module}::${expression}`);
    for (const imported of imports.filter(item => !item.glob && item.alias === expression)) {
      const local = localImportTarget(imported.target, imported.module, allSymbols); if (local) addExact(local); else classifiedExternal = true;
    }
    for (const imported of imports.filter(item => item.glob)) {
      const local = localImportTarget(imported.target, imported.module, allSymbols);
      if (local) addThroughReexports(local, expression, allSymbols, index, candidates); else classifiedExternal = true;
    }
    if (!candidates.size) {
      const packageMatches = symbols.filter(symbol => symbol.shortName === expression);
      if (packageMatches.length === 1) candidates.add(packageMatches[0].qualifiedName);
      else packageMatches.forEach(symbol => candidates.add(symbol.qualifiedName));
    }
  }
  const list = [...candidates].sort();
  if (list.length === 1) return { status: 'resolved', candidates: list, target: list[0], confidence: expression.includes('::') || list[0].startsWith(`${module}::`) ? 0.95 : 0.8 };
  if (list.length > 1) return { status: 'ambiguous', candidates: list, confidence: 0.3 };
  addSuffix(expression);
  const suffixes = [...candidates].sort();
  if (suffixes.length === 1) return { status: 'resolved', candidates: suffixes, target: suffixes[0], confidence: 0.7 };
  if (suffixes.length > 1) return { status: 'ambiguous', candidates: suffixes, confidence: 0.25 };
  if (classifiedExternal || /^(?:Ok|Err|Some|None|Box|Vec|String|Result|Option|drop|log|msg|require|assert|assert_eq|assert_ne)$/.test(expression)) return { status: 'external', candidates: [], confidence: 0.82 };
  return { status: 'unresolved', candidates: [], confidence: 0.2 };
}

function localModuleTarget(target: string, ownerModule: string, symbols: RustSymbol[]): string | undefined {
  if (target.startsWith('crate::')) return target;
  const ownerRelative = `${ownerModule}::${target}`;
  if (symbols.some(symbol => symbol.kind === 'module' && (symbol.qualifiedName === ownerRelative || symbol.qualifiedName.startsWith(`${ownerRelative}::`)))) return ownerRelative;
  const root = `crate::${target}`;
  return symbols.some(symbol => symbol.kind === 'module' && (symbol.qualifiedName === root || symbol.qualifiedName.startsWith(`${root}::`))) ? root : undefined;
}

function localImportTarget(target: string, ownerModule: string, symbols: RustSymbol[]): string | undefined {
  if (target.startsWith('crate::')) return target;
  return localModuleTarget(target, ownerModule, symbols) ?? (symbols.some(symbol => symbol.qualifiedName === target) ? target : undefined);
}

function addThroughReexports(module: string, tail: string, symbols: RustSymbol[], index: RustSymbolIndex | undefined, output: Set<string>, visited = new Set<string>()): void {
  const key = `${module}:${tail}`; if (visited.has(key)) return; visited.add(key);
  for (const symbol of symbols.filter(item => (item.kind === 'function' || item.kind === 'method') && item.qualifiedName === `${module}::${tail}`)) output.add(symbol.qualifiedName);
  for (const imported of index?.imports.filter(item => item.module === module && item.public) ?? []) {
    const local = localImportTarget(imported.target, module, symbols); if (!local) continue;
    if (imported.glob) addThroughReexports(local, tail, symbols, index, output, visited);
    else if (imported.alias === tail) for (const symbol of symbols.filter(item => (item.kind === 'function' || item.kind === 'method') && item.qualifiedName === local)) output.add(symbol.qualifiedName);
  }
}

function normalizePathExpression(expression: string, module: string, caller?: RustSymbol): string {
  if (expression.startsWith('crate::')) return expression;
  if (expression.startsWith('self::')) return `${module}::${expression.slice(6)}`;
  if (expression.startsWith('Self::') && caller?.kind === 'method') return `${caller.qualifiedName.split('::').slice(0, -1).join('::')}::${expression.slice(6)}`;
  if (expression.startsWith('super::')) {
    let parts = module.split('::'); let remaining = expression;
    while (remaining.startsWith('super::')) { parts = parts.slice(0, -1); remaining = remaining.slice(7); }
    return `${parts.join('::')}::${remaining}`;
  }
  return expression;
}

function enclosingFunction(symbols: RustSymbol[], uri: string, line: number, column: number): RustSymbol | undefined {
  return symbols.filter(symbol => symbol.location.uri === uri && (symbol.kind === 'function' || symbol.kind === 'method') && contains(symbol.location, line, column)).sort((a, b) => (a.location.endLine - a.location.startLine) - (b.location.endLine - b.location.startLine))[0];
}
function enclosingFallback(functions: FunctionMetric[], uri: string, line: number): FunctionMetric | undefined { return functions.filter(fn => fn.location.uri === uri && fn.location.startLine <= line && fn.location.endLine >= line).sort((a, b) => a.lines - b.lines)[0]; }
function contains(location: RustSymbol['location'], line: number, column: number): boolean { if (line < location.startLine || line > location.endLine) return false; if (line === location.startLine && column < location.startColumn) return false; if (line === location.endLine && column > location.endColumn) return false; return true; }
function fallbackSymbols(functions: FunctionMetric[]): RustSymbol[] { return functions.map(fn => ({ id: `symbol:fallback:${fn.qualifiedName ?? fn.name}:${fn.location.uri}:${fn.location.startLine}`, qualifiedName: fn.qualifiedName ?? fn.name, shortName: fn.name, kind: 'function', package: fn.program ?? '', module: (fn.qualifiedName ?? fn.name).split('::').slice(0, -1).join('::'), visibility: fn.visibility ?? (fn.isPublic ? 'pub' : 'private'), location: fn.location, evidence: [{ description: 'function metric symbol', location: fn.location }] })); }
