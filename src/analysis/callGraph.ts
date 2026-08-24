import { CallDispatchKind, CallGraph, CallResolutionStatus, CallSite, Evidence, FunctionMetric, RustSymbol } from '../model/report';
import { descendants, field, RustNode } from '../parser/rustAst';
import { RustSymbolIndex } from './symbolIndex';

const concreteKinds = new Set<RustSymbol['kind']>(['function', 'method', 'associated-function', 'closure']);
const associatedKinds = new Set<RustSymbol['kind']>(['method', 'associated-function']);

export function buildCallGraph(files: Array<{ uri: string; root: RustNode }>, functions: FunctionMetric[], index?: RustSymbolIndex): CallGraph {
  const allSymbols = index?.symbols ?? fallbackSymbols(functions);
  const symbols = allSymbols.filter(symbol => concreteKinds.has(symbol.kind));
  const calls: CallSite[] = [];
  for (const file of files) {
    for (const call of descendants(file.root, 'call_expression')) {
      const rawExpression = call.childForFieldName('function')?.text ?? '';
      if (!rawExpression) continue;
      const expression = stripTurbofish(rawExpression);
      const callerSymbol = enclosingFunction(symbols, file.uri, call.startPosition.row + 1, call.startPosition.column);
      const caller = callerSymbol?.qualifiedName ?? enclosingFallback(functions, file.uri, call.startPosition.row + 1)?.qualifiedName ?? '<unknown>';
      const resolution = resolveCall(expression, call, callerSymbol, file.uri, symbols, index);
      const location = locationFor(file.uri, call);
      const macroOrigins = callerSymbol?.macroOrigins;
      const evidence: Evidence[] = [
        { description: `${resolution.status} Rust call ${rawExpression}: ${resolution.reason}`, location },
        ...(resolution.transforms ?? []).map(description => ({ description: `Dispatch transform: ${description}`, location })),
        ...(macroOrigins?.length ? [{ description: `Enclosing item has macro origin: ${macroOrigins.join(', ')}`, location }] : [])
      ];
      calls.push({
        id: `call:${file.uri}:${location.startLine}:${location.startColumn}`, caller, callee: resolution.target ?? rawExpression,
        resolved: resolution.status === 'resolved', sourceExpression: rawExpression, candidateTargets: resolution.candidates,
        target: resolution.target, status: resolution.status, confidence: resolution.confidence, resolutionReason: resolution.reason,
        receiverType: resolution.receiverType, dispatchKind: resolution.dispatchKind, indirect: resolution.indirect,
        resolutionTransforms: resolution.transforms, macroOrigins, location, evidence
      });
    }
    calls.push(...localMacroCalls(file, symbols));
  }
  const uniqueCalls = [...new Map(calls.map(call => [call.id, call])).values()].sort((a, b) => a.id.localeCompare(b.id));
  const edges = uniqueCalls.filter(call => call.status === 'resolved' && call.target).map(call => ({ source: call.caller, target: call.target!, confidence: call.confidence ?? 0.75 }));
  const uniqueEdges = [...new Map(edges.map(edge => [`${edge.source}:${edge.target}`, edge])).values()].sort((a, b) => `${a.source}:${a.target}`.localeCompare(`${b.source}:${b.target}`));
  const graph: CallGraph = { symbols: symbols.map(symbol => symbol.qualifiedName).sort(), calls: uniqueCalls, edges: uniqueEdges, cycles: [] };
  graph.cycles = callCycles(graph);
  return graph;
}

interface CallResolution { status: CallResolutionStatus; candidates: string[]; target?: string; confidence: number; reason: string; receiverType?: string; dispatchKind: CallDispatchKind; indirect?: boolean; transforms?: string[]; }

function resolveCall(expression: string, call: RustNode, caller: RustSymbol | undefined, fileUri: string, symbols: RustSymbol[], index?: RustSymbolIndex): CallResolution {
  const method = /^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(expression);
  if (method) return resolveMethodCall(method[1], method[2], call, caller, symbols, index);
  const qualified = resolveQualifiedDispatch(expression, call, caller, symbols, index);
  if (qualified) return qualified;
  if (/\.|\)|\]|\}/.test(expression) && !/^(?:crate|self|super|Self)(?:::|$)/.test(expression)) return unresolved('dynamic', 'call target depends on a non-trivial runtime receiver expression', 'unknown', 0.35);
  const binding = resolveCallableBinding(expression, call, caller, fileUri, symbols, index);
  if (binding) return binding;
  return resolveLexicalPath(expression, caller, fileUri, symbols, index);
}

function resolveQualifiedDispatch(expression: string, call: RustNode, caller: RustSymbol | undefined, symbols: RustSymbol[], index?: RustSymbolIndex): CallResolution | undefined {
  const ufcs = /^<\s*(.+?)\s+as\s+(.+?)\s*>\s*::\s*([A-Za-z_][A-Za-z0-9_]*)$/.exec(expression);
  if (ufcs) {
    const module = caller?.module ?? 'crate'; const transformed = receiverTypes(ufcs[1], module, index);
    const trait = cleanPathType(ufcs[2]);
    const matches = symbols.filter(symbol => associatedKinds.has(symbol.kind) && symbol.shortName === ufcs[3] && transformed.types.includes(cleanPathType(symbol.implType ?? '')) && cleanPathType(symbol.traitName ?? '') === trait);
    return select(matches, `fully qualified path fixes trait ${ufcs[2]} and receiver ${ufcs[1]}`, 'ufcs', transformed.transforms, ufcs[1], 0.99);
  }
  const path = /^(.*?)::([A-Za-z_][A-Za-z0-9_]*)$/.exec(expression); if (!path) return undefined;
  const prefix = path[1]; const member = path[2]; const module = caller?.module ?? 'crate';
  if (prefix === 'Self' && caller?.implType) {
    const transformed = receiverTypes(caller.implType, module, index);
    const typeMatches = symbols.filter(symbol => associatedKinds.has(symbol.kind) && symbol.shortName === member && transformed.types.includes(cleanPathType(symbol.implType ?? '')));
    const traitMatches = caller.traitName ? typeMatches.filter(symbol => cleanPathType(symbol.traitName ?? '') === cleanPathType(caller.traitName!)) : [];
    const matches = traitMatches.length ? traitMatches : typeMatches.filter(symbol => !symbol.traitName);
    return select(matches, `Self is the enclosing impl type ${caller.implType}${caller.traitName ? ` under trait ${caller.traitName}` : ''}`, matches.some(item => item.kind === 'associated-function') ? 'associated-function' : matches.some(item => item.traitName) ? 'trait-method' : 'inherent-method', transformed.transforms, caller.implType, 0.98);
  }
  const trait = findTrait(prefix, module, index);
  if (trait) {
    const contract = index?.symbols.find(symbol => symbol.kind === 'trait-method' && symbol.shortName === member && cleanPathType(symbol.traitName ?? '') === cleanPathType(trait.shortName));
    const receiver = contract?.hasSelfReceiver ? firstArgumentReceiver(call) : undefined; const receiverType = receiver ? inferBindingType(receiver, call) : undefined;
    const transformed = receiverType ? receiverTypes(receiverType, module, index) : { types: [], transforms: [] };
    const implementations = symbols.filter(symbol => associatedKinds.has(symbol.kind) && symbol.shortName === member && cleanPathType(symbol.traitName ?? '') === cleanPathType(trait.shortName) && (!receiverType || transformed.types.includes(cleanPathType(symbol.implType ?? ''))));
    if (receiverType) return select(implementations, `trait-qualified call ${prefix}::${member} has explicit receiver evidence ${receiverType}`, 'trait-method', transformed.transforms, receiverType, 0.94);
    const contracts = index?.symbols.filter(symbol => symbol.kind === 'trait-method' && symbol.shortName === member && cleanPathType(symbol.traitName ?? '') === cleanPathType(trait.shortName)).map(symbol => symbol.qualifiedName) ?? [];
    const candidates = [...new Set([...contracts, ...implementations.map(labelFor)])].sort();
    return { status: 'dynamic', candidates, confidence: 0.62, reason: `trait-qualified call ${prefix}::${member} identifies the trait contract, but its concrete receiver type requires type inference`, dispatchKind: 'trait-method', indirect: true };
  }
  const localType = findType(prefix, module, index);
  if (!localType) return undefined;
  const transformed = receiverTypes(prefix, module, index);
  const matches = symbols.filter(symbol => associatedKinds.has(symbol.kind) && symbol.shortName === member && transformed.types.includes(cleanPathType(symbol.implType ?? '')));
  const inherent = matches.filter(symbol => !symbol.traitName);
  const selected = inherent.length ? inherent : matches;
  const kind: CallDispatchKind = selected.some(item => item.kind === 'associated-function') ? 'associated-function' : selected.some(item => item.traitName) ? 'trait-method' : 'inherent-method';
  return select(selected, `${prefix} resolves to indexed type ${localType.qualifiedName}`, kind, transformed.transforms, prefix, inherent.length ? 0.97 : 0.88);
}

function resolveMethodCall(receiver: string, method: string, call: RustNode, caller: RustSymbol | undefined, symbols: RustSymbol[], index?: RustSymbolIndex): CallResolution {
  const receiverType = receiver === 'self' ? caller?.implType : inferBindingType(receiver, call);
  if (!receiverType) return unresolved('dynamic', `receiver type for ${receiver} could not be inferred from an explicit parameter, binding, or constructor`, 'unknown', 0.35);
  const module = caller?.module ?? 'crate';
  const dynamicReceiver = receiverType.trim().replace(/^&\s*(?:'\w+\s*)?(?:mut\s+)?/, '');
  if (/^(?:dyn|impl)\s+/.test(dynamicReceiver)) {
    const traits = inlineTraitBounds(dynamicReceiver); const contracts = traitContracts(traits, method, index);
    return { status: 'dynamic', candidates: contracts, confidence: 0.7, reason: `${dynamicReceiver.startsWith('dyn') ? 'trait object' : 'impl Trait parameter'} exposes ${traits.join(' + ')}, but the concrete call body is runtime/monomorphization dependent`, receiverType, dispatchKind: dynamicReceiver.startsWith('dyn') ? 'trait-object' : 'generic-bound', indirect: true };
  }
  const genericTraits = caller?.genericBounds?.filter(item => cleanPathType(item.typeParameter) === cleanPathType(receiverType)).map(item => item.trait) ?? [];
  if (genericTraits.length) {
    const contracts = traitContracts(genericTraits, method, index);
    if (contracts.length === 1) return { status: 'dynamic', candidates: contracts, confidence: 0.76, reason: `generic receiver ${receiverType} is constrained by ${genericTraits.join(' + ')}, but the concrete implementation depends on monomorphization`, receiverType, dispatchKind: 'generic-bound', indirect: true };
    if (contracts.length > 1) return { status: 'ambiguous', candidates: contracts, confidence: 0.42, reason: `multiple generic trait bounds on ${receiverType} provide ${method}`, receiverType, dispatchKind: 'generic-bound', indirect: true };
    return unresolved('dynamic', `generic receiver ${receiverType} has trait bounds ${genericTraits.join(' + ')}, but no matching indexed trait contract provides ${method}`, 'generic-bound', 0.4, receiverType);
  }
  const transformed = receiverTypes(receiverType, module, index);
  for (const candidate of transformed.types) {
    const matches = symbols.filter(symbol => symbol.kind === 'method' && symbol.shortName === method && cleanPathType(symbol.implType ?? '') === candidate);
    const inherent = matches.filter(symbol => !symbol.traitName);
    if (inherent.length) return select(inherent, `receiver type ${receiverType} selects an indexed inherent method at candidate ${candidate}`, 'inherent-method', transformed.transforms, receiverType, 0.95);
    if (matches.length) return select(matches, `receiver type ${receiverType} selects indexed trait implementation candidate ${candidate}`, 'trait-method', transformed.transforms, receiverType, 0.87);
  }
  return { status: 'unresolved', candidates: [], confidence: 0.25, reason: `receiver type ${receiverType} is known, but no indexed implementation provides ${method}`, receiverType, dispatchKind: 'unknown', transforms: transformed.transforms };
}

function resolveCallableBinding(expression: string, call: RustNode, caller: RustSymbol | undefined, fileUri: string, symbols: RustSymbol[], index?: RustSymbolIndex): CallResolution | undefined {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(expression)) return undefined;
  const owner = enclosingNode(call, 'function_item'); if (!owner) return undefined;
  const declarations = descendants(owner, 'let_declaration').filter(node => node.startIndex < call.startIndex && bindingName(field(node, 'pattern')?.text ?? '') === expression).sort((a, b) => b.startIndex - a.startIndex);
  const declaration = declarations[0];
  if (declaration) {
    const value = field(declaration, 'value'); const explicitType = field(declaration, 'type')?.text;
    const assignments = descendants(owner, 'assignment_expression').filter(node => node.startIndex > declaration.startIndex && node.startIndex < call.startIndex && bindingName(field(node, 'left')?.text ?? node.namedChildren[0]?.text ?? '') === expression);
    if (assignments.length) {
      const candidates = [value, ...assignments.map(node => field(node, 'right') ?? node.namedChildren.at(-1))].flatMap(node => node ? callableValueTarget(node, caller, fileUri, symbols, index) : []).map(item => item.target).filter((item): item is string => !!item);
      return { status: 'dynamic', candidates: [...new Set(candidates)].sort(), confidence: 0.55, reason: `callable binding ${expression} is reassigned before this call, so runtime identity is not fixed`, receiverType: explicitType, dispatchKind: 'function-pointer', indirect: true };
    }
    if (value?.type === 'closure_expression') {
      const closure = symbols.find(symbol => symbol.kind === 'closure' && symbol.location.uri === fileUri && symbol.location.startLine === value.startPosition.row + 1 && symbol.location.startColumn === value.startPosition.column);
      if (closure) return { status: 'resolved', candidates: [closure.qualifiedName], target: closure.qualifiedName, confidence: 0.98, reason: `local binding ${expression} has one closure-expression initializer`, receiverType: explicitType, dispatchKind: 'closure', indirect: true };
    }
    if (value) {
      const targets = callableValueTarget(value, caller, fileUri, symbols, index);
      if (targets.length === 1) return { ...targets[0], reason: `local callable binding ${expression} has one function-item initializer ${value.text}`, receiverType: explicitType, dispatchKind: explicitType?.includes('fn(') ? 'function-pointer' : 'function-item', indirect: true };
      if (targets.length > 1) return { status: 'ambiguous', candidates: targets.flatMap(item => item.candidates), confidence: 0.4, reason: `callable binding ${expression} initializer has multiple possible function items`, receiverType: explicitType, dispatchKind: 'function-item', indirect: true };
    }
    if (explicitType && callableTypeResolved(explicitType, caller?.module ?? 'crate', index)) return unresolved('dynamic', `callable binding ${expression} has type ${explicitType}, but its runtime identity is not statically evidenced`, 'function-pointer', 0.52, explicitType, true);
  }
  for (const parameter of descendants(owner, 'parameter')) {
    if (bindingName(field(parameter, 'pattern')?.text ?? parameter.namedChildren[0]?.text ?? '') !== expression) continue;
    const type = field(parameter, 'type')?.text ?? '';
    if (callableTypeResolved(type, caller?.module ?? 'crate', index)) return unresolved('dynamic', `parameter ${expression} has callable type ${type}; its runtime identity is supplied by the caller`, type.includes('dyn') ? 'trait-object' : type.includes('Fn') ? 'generic-bound' : 'function-pointer', 0.58, type, true);
  }
  return undefined;
}

function callableValueTarget(value: RustNode, caller: RustSymbol | undefined, fileUri: string, symbols: RustSymbol[], index?: RustSymbolIndex): CallResolution[] {
  if (!['identifier', 'scoped_identifier', 'generic_function'].includes(value.type)) return [];
  const resolved = resolveLexicalPath(stripTurbofish(value.text), caller, fileUri, symbols, index);
  return resolved.status === 'resolved' ? [resolved] : [];
}

function resolveLexicalPath(expression: string, caller: RustSymbol | undefined, fileUri: string, symbols: RustSymbol[], index?: RustSymbolIndex): CallResolution {
  const module = caller?.module ?? index?.modulesByFile.get(fileUri) ?? 'crate';
  const imports = index?.imports.filter(item => item.fileUri === fileUri && item.module === module) ?? [];
  const allSymbols = index?.symbols ?? symbols; const candidates = new Set<string>(); let classifiedExternal = false;
  const addExact = (name: string) => symbols.filter(symbol => symbol.qualifiedName === name).forEach(symbol => candidates.add(symbol.qualifiedName));
  const addSuffix = (suffix: string) => symbols.filter(symbol => symbol.qualifiedName.endsWith(`::${suffix}`) || symbol.qualifiedName === suffix).forEach(symbol => candidates.add(symbol.qualifiedName));
  if (expression.includes('::')) {
    const first = expression.split('::')[0]; const imported = imports.find(item => !item.glob && item.alias === first);
    if (imported) addExact(`${imported.target}${expression.slice(first.length)}`);
    addExact(normalizePathExpression(expression, module, caller));
    const localModule = localModuleTarget(first, module, allSymbols); if (localModule) addThroughReexports(localModule, expression.split('::').slice(1).join('::'), allSymbols, index, candidates);
    if (!candidates.size && !/^(crate|self|super|Self)$/.test(first) && !allSymbols.some(symbol => symbol.module === `crate::${first}` || symbol.qualifiedName.startsWith(`crate::${first}::`))) return unresolved('external', `path prefix ${first} is not an indexed local module or type`, 'direct', 0.8);
  } else {
    addExact(`${module}::${expression}`);
    for (const imported of imports.filter(item => !item.glob && item.alias === expression)) { const local = localImportTarget(imported.target, imported.module, allSymbols); if (local) addExact(local); else classifiedExternal = true; }
    for (const imported of imports.filter(item => item.glob)) { const local = localImportTarget(imported.target, imported.module, allSymbols); if (local) addThroughReexports(local, expression, allSymbols, index, candidates); else classifiedExternal = true; }
    if (!candidates.size) { const packageMatches = symbols.filter(symbol => symbol.kind === 'function' && symbol.shortName === expression); if (packageMatches.length === 1) candidates.add(packageMatches[0].qualifiedName); else packageMatches.forEach(symbol => candidates.add(symbol.qualifiedName)); }
  }
  const list = [...candidates].sort();
  if (list.length === 1) return { status: 'resolved', candidates: list, target: list[0], confidence: expression.includes('::') || list[0].startsWith(`${module}::`) ? 0.95 : 0.8, reason: 'one indexed function matches the lexical path and imports', dispatchKind: 'direct' };
  if (list.length > 1) return { status: 'ambiguous', candidates: list, confidence: 0.3, reason: 'multiple indexed functions match the lexical path', dispatchKind: 'direct' };
  addSuffix(expression); const suffixes = [...candidates].sort();
  if (suffixes.length === 1) return { status: 'resolved', candidates: suffixes, target: suffixes[0], confidence: 0.7, reason: 'one indexed function matches the package-wide suffix', dispatchKind: 'direct' };
  if (suffixes.length > 1) return { status: 'ambiguous', candidates: suffixes, confidence: 0.25, reason: 'multiple indexed functions match the package-wide suffix', dispatchKind: 'direct' };
  if (classifiedExternal || /^(?:Ok|Err|Some|None|Box|Vec|String|Result|Option|drop|log|msg|require|assert|assert_eq|assert_ne)$/.test(expression)) return unresolved('external', 'import or well-known constructor/macro wrapper classifies this as external', 'direct', 0.82);
  return unresolved('unresolved', 'no indexed function or classified external import matches this call', 'unknown', 0.2);
}

function select(matches: RustSymbol[], reason: string, dispatchKind: CallDispatchKind, transforms: string[] = [], receiverType?: string, confidence = 0.94): CallResolution {
  const labels = matches.map(labelFor).sort();
  if (matches.length === 1) return { status: 'resolved', candidates: labels, target: matches[0].qualifiedName, confidence, reason: `${reason}; one concrete body matches`, receiverType, dispatchKind, transforms };
  if (matches.length > 1) return { status: 'ambiguous', candidates: labels, confidence: 0.3, reason: `${reason}; ${dispatchKind === 'trait-method' ? 'multiple indexed inherent/trait candidates' : 'multiple concrete bodies'} match`, receiverType, dispatchKind, transforms };
  return { status: 'unresolved', candidates: [], confidence: 0.25, reason: `${reason}, but no indexed concrete body matches`, receiverType, dispatchKind, transforms };
}

function receiverTypes(value: string, module: string, index?: RustSymbolIndex): { types: string[]; transforms: string[] } {
  const types: string[] = []; const transforms: string[] = []; const visited = new Set<string>(); let current = value.trim();
  for (let step = 0; step < 8 && current && !visited.has(current); step++) {
    visited.add(current);
    const borrowed = /^&\s*(?:'\w+\s*)?(?:mut\s+)?(.+)$/.exec(current); if (borrowed) { transforms.push(`autoderef reference ${current} -> ${borrowed[1]}`); current = borrowed[1].trim(); continue; }
    const alias = findType(current, module, index); if (alias?.kind === 'type-alias' && alias.aliasTarget) { transforms.push(`type alias ${current} -> ${alias.aliasTarget}`); current = alias.aliasTarget; continue; }
    const generic = /^([A-Za-z_][A-Za-z0-9_:]*)\s*<([\s\S]+)>$/.exec(current);
    const normalized = cleanPathType(generic?.[1] ?? current); if (!types.includes(normalized)) types.push(normalized);
    if (generic && /^(?:Box|Rc|Arc|Pin)$/.test(cleanPathType(generic[1]))) { const inner = firstTypeArgument(generic[2]); transforms.push(`supported deref wrapper ${generic[1]}<...> -> ${inner}`); current = inner; continue; }
    break;
  }
  return { types, transforms };
}

function inferBindingType(receiver: string, call: RustNode): string | undefined {
  const owner = enclosingNode(call, 'function_item'); if (!owner) return undefined;
  for (const parameter of descendants(owner, 'parameter')) { const pattern = field(parameter, 'pattern')?.text ?? parameter.namedChildren[0]?.text; if (bindingName(pattern ?? '') === receiver) return field(parameter, 'type')?.text; }
  const declarations = descendants(owner, 'let_declaration').filter(node => node.startIndex < call.startIndex).sort((a, b) => b.startIndex - a.startIndex);
  for (const declaration of declarations) {
    if (bindingName(field(declaration, 'pattern')?.text ?? '') !== receiver) continue;
    const explicit = field(declaration, 'type')?.text; if (explicit) return explicit;
    const value = field(declaration, 'value')?.text ?? '';
    return /^(?:&\s*(?:mut\s+)?)?([A-Z][A-Za-z0-9_:]*(?:<[^>]+>)?)\s*(?:::|\{|\()/.exec(value)?.[1];
  }
  return undefined;
}

function inlineTraitBounds(type: string): string[] { return type.replace(/^\s*(?:dyn|impl)\s+/, '').split('+').map(item => item.trim()).filter(item => item && !item.startsWith("'")); }
function traitContracts(traits: string[], method: string, index?: RustSymbolIndex): string[] { const names = new Set(traits.map(cleanPathType)); return (index?.symbols ?? []).filter(symbol => symbol.kind === 'trait-method' && symbol.shortName === method && names.has(cleanPathType(symbol.traitName ?? ''))).map(symbol => symbol.qualifiedName).sort(); }
function findTrait(value: string, module: string, index?: RustSymbolIndex): RustSymbol | undefined { const clean = value.replace(/^crate::/, ''); const matches = index?.symbols.filter(symbol => symbol.kind === 'trait' && (symbol.qualifiedName === value || symbol.qualifiedName === `${module}::${value}` || symbol.qualifiedName === `crate::${clean}` || symbol.shortName === cleanPathType(value))) ?? []; return matches.length === 1 ? matches[0] : undefined; }
function findType(value: string, module: string, index?: RustSymbolIndex): RustSymbol | undefined { const base = value.trim().replace(/^&\s*(?:mut\s+)?/, '').replace(/<.*$/, ''); const clean = cleanPathType(base); const matches = index?.symbols.filter(symbol => ['struct', 'enum', 'type-alias'].includes(symbol.kind) && (symbol.qualifiedName === base || symbol.qualifiedName === `${module}::${base}` || symbol.qualifiedName === `crate::${base.replace(/^crate::/, '')}` || symbol.shortName === clean)) ?? []; return matches.length === 1 ? matches[0] : undefined; }
function firstArgumentReceiver(call: RustNode): string | undefined { const first = field(call, 'arguments')?.namedChildren.find((item): item is RustNode => !!item)?.text ?? ''; return /^&\s*(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)$/.exec(first)?.[1] ?? (/^[A-Za-z_][A-Za-z0-9_]*$/.test(first) ? first : undefined); }
function callableType(value: string): boolean { return /(?:^|[^A-Za-z])(?:unsafe\s+)?(?:extern\s+"[^"]+"\s+)?fn\s*\(|\b(?:dyn\s+|impl\s+)?Fn(?:Mut|Once)?\s*[<(]/.test(value); }
function callableTypeResolved(value: string, module: string, index?: RustSymbolIndex): boolean { if (callableType(value)) return true; const alias = findType(value, module, index); return alias?.kind === 'type-alias' && !!alias.aliasTarget && callableType(alias.aliasTarget); }
function bindingName(value: string): string { return value.replace(/^(?:mut|ref)\s+/, '').trim(); }
function labelFor(symbol: RustSymbol): string { return symbol.traitName ? `${symbol.qualifiedName} as ${symbol.traitName}` : symbol.qualifiedName; }
function cleanPathType(value: string): string { return value.trim().replace(/^&\s*(?:'\w+\s*)?(?:mut\s+)?/, '').replace(/<.*$/, '').split('::').at(-1) ?? ''; }
function firstTypeArgument(value: string): string { let depth = 0; for (let index = 0; index < value.length; index++) { if ('<([{'.includes(value[index])) depth++; else if ('>)]}'.includes(value[index])) depth--; else if (value[index] === ',' && depth === 0) return value.slice(0, index).trim(); } return value.trim(); }
function stripTurbofish(value: string): string { return value.replace(/::<[^<>]*(?:<[^<>]*>[^<>]*)*>/g, ''); }
function unresolved(status: CallResolutionStatus, reason: string, dispatchKind: CallDispatchKind, confidence: number, receiverType?: string, indirect?: boolean): CallResolution { return { status, candidates: [], confidence, reason, receiverType, dispatchKind, indirect }; }

function localMacroCalls(file: { uri: string; root: RustNode }, symbols: RustSymbol[]): CallSite[] {
  const local = new Set(descendants(file.root, 'macro_definition').map(node => field(node, 'name')?.text).filter((item): item is string => !!item)); if (!local.size) return [];
  return descendants(file.root, 'macro_invocation').flatMap(node => {
    const name = field(node, 'macro')?.text ?? ''; if (!local.has(name)) return [];
    const caller = enclosingFunction(symbols, file.uri, node.startPosition.row + 1, node.startPosition.column); if (!caller) return [];
    const location = locationFor(file.uri, node); const reason = `local macro ${name}! may introduce calls, but Sealevel Insight does not expand macro token trees`;
    return [{ id: `call:macro:${file.uri}:${location.startLine}:${location.startColumn}`, caller: caller.qualifiedName, callee: `${name}!`, resolved: false, sourceExpression: `${name}!`, candidateTargets: [], status: 'dynamic' as const, confidence: 0.55, resolutionReason: reason, dispatchKind: 'macro-origin' as const, indirect: true, macroOrigins: [name], location, evidence: [{ description: reason, location }] }];
  });
}

function callCycles(graph: Pick<CallGraph, 'calls' | 'edges'>): CallGraph['cycles'] {
  const adjacency = new Map<string, string[]>(); const nodes = new Set<string>();
  for (const edge of graph.edges) { nodes.add(edge.source); nodes.add(edge.target); adjacency.set(edge.source, [...(adjacency.get(edge.source) ?? []), edge.target]); }
  let next = 0; const indexes = new Map<string, number>(); const low = new Map<string, number>(); const stack: string[] = []; const onStack = new Set<string>(); const components: string[][] = [];
  const visit = (node: string): void => { indexes.set(node, next); low.set(node, next++); stack.push(node); onStack.add(node); for (const target of adjacency.get(node) ?? []) { if (!indexes.has(target)) { visit(target); low.set(node, Math.min(low.get(node)!, low.get(target)!)); } else if (onStack.has(target)) low.set(node, Math.min(low.get(node)!, indexes.get(target)!)); } if (low.get(node) === indexes.get(node)) { const component: string[] = []; let value: string; do { value = stack.pop()!; onStack.delete(value); component.push(value); } while (value !== node); components.push(component.sort()); } };
  for (const node of [...nodes].sort()) if (!indexes.has(node)) visit(node);
  return components.filter(component => component.length > 1 || graph.edges.some(edge => edge.source === component[0] && edge.target === component[0])).map(component => {
    const members = new Set(component); const calls = graph.calls.filter(call => call.status === 'resolved' && !!call.target && members.has(call.caller) && members.has(call.target)); const kind = component.length === 1 ? 'self-recursion' as const : 'mutual-recursion' as const;
    return { id: `cycle:${kind}:${component.join('|')}`, kind, functions: component, callIds: calls.map(call => call.id).sort(), evidence: calls.map(call => ({ description: `${kind} edge ${call.caller} -> ${call.target}`, location: call.location })) };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

function localModuleTarget(target: string, ownerModule: string, symbols: RustSymbol[]): string | undefined { if (target.startsWith('crate::')) return target; const ownerRelative = `${ownerModule}::${target}`; if (symbols.some(symbol => symbol.kind === 'module' && (symbol.qualifiedName === ownerRelative || symbol.qualifiedName.startsWith(`${ownerRelative}::`)))) return ownerRelative; const root = `crate::${target}`; return symbols.some(symbol => symbol.kind === 'module' && (symbol.qualifiedName === root || symbol.qualifiedName.startsWith(`${root}::`))) ? root : undefined; }
function localImportTarget(target: string, ownerModule: string, symbols: RustSymbol[]): string | undefined { if (target.startsWith('crate::')) return target; return localModuleTarget(target, ownerModule, symbols) ?? (symbols.some(symbol => symbol.qualifiedName === target) ? target : undefined); }
function addThroughReexports(module: string, tail: string, symbols: RustSymbol[], index: RustSymbolIndex | undefined, output: Set<string>, visited = new Set<string>()): void { const key = `${module}:${tail}`; if (visited.has(key)) return; visited.add(key); for (const symbol of symbols.filter(item => concreteKinds.has(item.kind) && item.qualifiedName === `${module}::${tail}`)) output.add(symbol.qualifiedName); for (const imported of index?.imports.filter(item => item.module === module && item.public) ?? []) { const local = localImportTarget(imported.target, module, symbols); if (!local) continue; if (imported.glob) addThroughReexports(local, tail, symbols, index, output, visited); else if (imported.alias === tail) for (const symbol of symbols.filter(item => concreteKinds.has(item.kind) && item.qualifiedName === local)) output.add(symbol.qualifiedName); } }
function normalizePathExpression(expression: string, module: string, caller?: RustSymbol): string { if (expression.startsWith('crate::')) return expression; if (expression.startsWith('self::')) return `${module}::${expression.slice(6)}`; if (expression.startsWith('Self::') && caller?.implType) return `${caller.qualifiedName.split('::').slice(0, -1).join('::')}::${expression.slice(6)}`; if (expression.startsWith('super::')) { let parts = module.split('::'); let remaining = expression; while (remaining.startsWith('super::')) { parts = parts.slice(0, -1); remaining = remaining.slice(7); } return `${parts.join('::')}::${remaining}`; } return expression; }
function enclosingFunction(symbols: RustSymbol[], uri: string, line: number, column: number): RustSymbol | undefined { return symbols.filter(symbol => symbol.location.uri === uri && concreteKinds.has(symbol.kind) && contains(symbol.location, line, column)).sort((a, b) => span(a.location) - span(b.location))[0]; }
function enclosingNode(node: RustNode, type: string): RustNode | undefined { let current: RustNode | null = node; while (current && current.type !== type) current = current.parent; return current ?? undefined; }
function enclosingFallback(functions: FunctionMetric[], uri: string, line: number): FunctionMetric | undefined { return functions.filter(fn => fn.location.uri === uri && fn.location.startLine <= line && fn.location.endLine >= line).sort((a, b) => a.lines - b.lines)[0]; }
function contains(location: RustSymbol['location'], line: number, column: number): boolean { if (line < location.startLine || line > location.endLine) return false; if (line === location.startLine && column < location.startColumn) return false; if (line === location.endLine && column > location.endColumn) return false; return true; }
function span(location: RustSymbol['location']): number { return (location.endLine - location.startLine) * 10000 + location.endColumn - location.startColumn; }
function locationFor(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
function fallbackSymbols(functions: FunctionMetric[]): RustSymbol[] { return functions.map(fn => ({ id: `symbol:fallback:${fn.qualifiedName ?? fn.name}:${fn.location.uri}:${fn.location.startLine}`, qualifiedName: fn.qualifiedName ?? fn.name, shortName: fn.name, kind: 'function', package: fn.program ?? '', module: (fn.qualifiedName ?? fn.name).split('::').slice(0, -1).join('::'), visibility: fn.visibility ?? (fn.isPublic ? 'pub' : 'private'), location: fn.location, evidence: [{ description: 'function metric symbol', location: fn.location }] })); }
