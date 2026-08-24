import { AccountInfo, InstructionStateAccess, ProgramUnit, StateAccessOperation, StateAccessSite } from '../model/report';
import { descendants, field, nodeText, RustNode } from '../parser/rustAst';
import { splitRustExpressions } from '../utils/text';

interface SymbolicAccount {
  root: string;
  accountName?: string;
  stateType?: string;
  fieldPath?: string;
  aliasPath: string[];
}

interface FunctionFact {
  name: string;
  qualifiedName: string;
  parameters: Array<{ name: string; type: string }>;
  aliases: Map<string, SymbolicAccount>;
  sites: StateAccessSite[];
  calls: Map<string, { args: string[] }>;
}

const INFRASTRUCTURE_FIELDS = new Set(['accounts', 'key', 'owner', 'is_signer', 'is_writable', 'executable', 'rent_epoch', 'address', 'data', 'lamports']);
const ACCESS_METHODS: Record<string, StateAccessOperation> = {
  load: 'deserialize', load_mut: 'deserialize', load_init: 'deserialize',
  try_borrow_data: 'data-read', borrow_data: 'data-read', data: 'data-read', try_borrow: 'data-read', borrow_unchecked: 'data-read', data_ptr: 'data-read', account_ptr: 'data-read',
  try_borrow_mut_data: 'data-write', borrow_mut_data: 'data-write', data_mut: 'data-write', try_borrow_mut: 'data-write', borrow_unchecked_mut: 'data-write', data_mut_ptr: 'data-write', account_mut_ptr: 'data-write',
  try_borrow_lamports: 'lamport-read', lamports: 'lamport-read', get_lamports: 'lamport-read',
  try_borrow_mut_lamports: 'lamport-write', set_lamports: 'lamport-write', add_lamports: 'lamport-write', sub_lamports: 'lamport-write',
  send: 'lamport-write', collect: 'lamport-write',
  realloc: 'realloc', resize: 'realloc', resize_unchecked: 'realloc',
  close: 'close', close_unchecked: 'close', assign: 'owner-change', set_owner: 'owner-change',
  serialize: 'serialize', try_serialize: 'serialize', pack_into_slice: 'serialize',
  deserialize: 'deserialize', try_deserialize: 'deserialize', try_deserialize_unchecked: 'deserialize', try_from_slice: 'deserialize', unpack: 'deserialize', unpack_unchecked: 'deserialize',
  set_inner: 'data-write', copy_from_slice: 'data-write', copy_within: 'data-write', fill: 'data-write', write_all: 'data-write',
  as_account: 'deserialize', as_account_mut: 'data-write', borrow_state: 'deserialize', borrow_mut_state: 'data-write'
};

/**
 * Builds a bounded, evidence-preserving interprocedural account/state dataflow.
 * It resolves local aliases and concrete arguments on statically resolved calls;
 * unresolved dynamic dispatch stays in the existing reachability diagnostics.
 */
export function enrichStateDataflow(files: Array<{ uri: string; root: RustNode }>, program: ProgramUnit): void {
  const accountNames = new Set(program.accounts.map(item => item.name).filter((item): item is string => !!item));
  const stateNames = new Set((program.stateTypes ?? []).map(item => item.name));
  const accountStateNames = new Set(program.accounts.map(item => item.stateType).filter((item): item is string => !!item));
  const facts = new Map<string, FunctionFact>();
  for (const file of files) for (const fn of descendants(file.root, 'function_item')) {
    const metric = program.functions.find(item => item.location.uri === file.uri && item.location.startLine === fn.startPosition.row + 1 && item.name === nodeText(field(fn, 'name')));
    if (!metric?.qualifiedName) continue;
    const fact = analyzeFunction(fn, file.uri, metric.qualifiedName, accountNames, stateNames, accountStateNames, program.accounts);
    facts.set(fact.qualifiedName, fact);
  }
  program.stateAccessSites = [...facts.values()].flatMap(item => item.sites).sort((a, b) => a.id.localeCompare(b.id));
  for (const instruction of program.instructions) {
    const surface = instruction.reachableSurface;
    if (!surface) continue;
    const handler = program.functions.find(item => item.qualifiedName === surface.directHandler)
      ?? program.functions.find(item => item.name === (instruction.handler ?? instruction.functionName));
    if (!handler?.qualifiedName || !facts.has(handler.qualifiedName)) { surface.stateAccesses = []; continue; }
    const accesses: InstructionStateAccess[] = [];
    const queue: Array<{ fact: FunctionFact; bindings: Map<string, SymbolicAccount>; functionPath: string[]; callPath: string[] }> = [{ fact: facts.get(handler.qualifiedName)!, bindings: new Map(), functionPath: [handler.qualifiedName], callPath: [] }];
    const visited = new Set<string>();
    while (queue.length) {
      const current = queue.shift()!;
      const visitKey = `${current.fact.qualifiedName}:${[...current.bindings].map(([key, value]) => `${key}=${value.accountName ?? value.root}:${value.stateType ?? ''}`).sort().join(',')}`;
      if (visited.has(visitKey)) continue;
      visited.add(visitKey);
      for (const site of current.fact.sites) {
        const bound = bindSymbol(site, current.bindings);
        const account = resolveProgramAccount(program, instruction.contextType, surface.accounts, bound.accountName, bound.stateType);
        const resolved = !!account;
        const sourceSiteId = site.id;
        const access: InstructionStateAccess = {
          ...site,
          id: `instruction-access:${instruction.id ?? instruction.name}:${sourceSiteId}:${account?.id ?? bound.accountName ?? site.accountParameter ?? 'unresolved'}`,
          sourceSiteId, instructionId: instruction.id ?? instruction.name, accountId: account?.id,
          accountName: account?.name ?? bound.accountName, stateType: bound.stateType ?? account?.stateType ?? site.stateType,
          accountExpression: bound.accountExpression, aliasPath: bound.aliasPath, direct: current.functionPath.length === 1,
          resolved, functionPath: current.functionPath, callPath: current.callPath,
          evidence: [...site.evidence, { description: resolved ? `resolved through ${bound.aliasPath.join(' -> ') || bound.accountExpression} to instruction account ${account!.name ?? account!.type}` : `account binding remains unresolved after ${bound.aliasPath.join(' -> ') || bound.accountExpression}`, location: site.location }]
        };
        accesses.push(access);
        if (account) applyAccessToAccount(account, access);
      }
      for (const call of program.callGraph?.calls.filter(item => item.caller === current.fact.qualifiedName && item.status === 'resolved' && item.target && facts.has(item.target)) ?? []) {
        const callee = facts.get(call.target!)!;
        const callFact = current.fact.calls.get(locationKey(call.location.uri, call.location.startLine, call.location.startColumn));
        if (!callFact) continue;
        const nextBindings = new Map<string, SymbolicAccount>();
        callee.parameters.forEach((parameter, index) => {
          const symbolic = resolveExpression(callFact.args[index] ?? '', current.fact.aliases, accountNames, stateNames, program.accounts);
          if (!symbolic) return;
          const inherited = current.bindings.get(symbolic.root);
          nextBindings.set(parameter.name, inherited ? { ...inherited, aliasPath: [...inherited.aliasPath, `${current.fact.name} argument ${index + 1}`, `${callee.name}.${parameter.name}`] } : { ...symbolic, aliasPath: [...symbolic.aliasPath, `${current.fact.name} argument ${index + 1}`, `${callee.name}.${parameter.name}`] });
        });
        queue.push({ fact: callee, bindings: nextBindings, functionPath: [...current.functionPath, callee.qualifiedName], callPath: [...current.callPath, call.id] });
      }
    }
    surface.stateAccesses = [...new Map(accesses.map(item => [item.id, item])).values()].sort((a, b) => a.id.localeCompare(b.id));
  }
}

function analyzeFunction(fn: RustNode, uri: string, qualifiedName: string, accountNames: Set<string>, stateNames: Set<string>, accountStateNames: Set<string>, accounts: AccountInfo[]): FunctionFact {
  const name = nodeText(field(fn, 'name'));
  const parameters = descendants(fn, 'parameter').map(parameter => {
    const parameterName = (nodeText(field(parameter, 'pattern')) || parameter.namedChildren[0]?.text || '').replace(/^(?:ref\s+)?(?:mut\s+)?/, '').trim();
    return { name: parameterName, type: nodeText(field(parameter, 'type')) || parameter.text.split(':').slice(1).join(':').trim() };
  }).filter(item => /^[A-Za-z_][A-Za-z0-9_]*$/.test(item.name));
  const aliases = new Map<string, SymbolicAccount>();
  for (const parameter of parameters) {
    const stateType = stateTypeFrom(parameter.type, stateNames);
    if (/Account|Ctx|Context|Signer|Program|Sysvar/.test(parameter.type) || stateType && accountStateNames.has(stateType)) aliases.set(parameter.name, { root: parameter.name, stateType, aliasPath: [parameter.name] });
  }
  // Let bindings are source ordered so chains such as account -> data -> state
  // retain their original account provenance.
  for (const declaration of descendants(fn, 'let_declaration').sort((a, b) => a.startIndex - b.startIndex)) {
    const pattern = (nodeText(field(declaration, 'pattern')) || /^\s*let\s+(?:mut\s+)?([^:=;]+)/.exec(declaration.text)?.[1] || '').replace(/^(?:ref\s+)?(?:mut\s+)?/, '').trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(pattern)) continue;
    const value = nodeText(field(declaration, 'value')) || declaration.text.split('=').slice(1).join('=').replace(/;\s*$/, '').trim();
    const freshValue = /^\s*(?:[A-Za-z_][A-Za-z0-9_]*::)*[A-Za-z_][A-Za-z0-9_]*\s*\{/.test(value);
    const symbolic = freshValue || !provenanceBearingExpression(value, aliases, accountNames) ? undefined : resolveExpression(value, aliases, accountNames, stateNames, accounts);
    if (symbolic) aliases.set(pattern, accountNames.has(pattern)
      ? { ...symbolic, root: pattern, accountName: pattern, aliasPath: [...symbolic.aliasPath, pattern] }
      : { ...symbolic, aliasPath: [...symbolic.aliasPath, pattern] });
  }
  const sites: StateAccessSite[] = [];
  const addSite = (node: RustNode, operation: StateAccessOperation, symbolic: SymbolicAccount, expression: string, api?: string, fieldPath?: string, confidence = 0.9) => {
    const location = loc(uri, node);
    const site: StateAccessSite = {
      id: `state-access:${operation}:${uri}:${location.startLine}:${location.startColumn}`,
      operation, functionName: name, qualifiedFunction: qualifiedName, accountExpression: symbolic.root,
      accountParameter: symbolic.root, stateType: symbolic.stateType, fieldPath: fieldPath ?? symbolic.fieldPath,
      api, expression, aliasPath: symbolic.aliasPath, location, confidence,
      evidence: [{ description: `${operation} through ${api ?? 'field access'} on ${symbolic.aliasPath.join(' -> ') || symbolic.root}${fieldPath ? ` field ${fieldPath}` : ''}`, location }]
    };
    sites.push(site);
  };
  const calls = new Map<string, { args: string[] }>();
  for (const call of descendants(fn, 'call_expression')) {
    const api = nodeText(field(call, 'function'));
    calls.set(locationKey(uri, call.startPosition.row + 1, call.startPosition.column), { args: callArguments(call) });
    const method = api.split(/\.|::/).at(-1)?.replace(/::<.*$/, '') ?? '';
    const operation = ACCESS_METHODS[method]
      ?? (/\blamports\s*\.\s*(?:try_)?borrow_mut$/.test(api) ? 'lamport-write' : undefined)
      ?? (/\blamports\s*\.\s*(?:try_)?borrow$/.test(api) ? 'lamport-read' : undefined)
      ?? (/\bdata\s*\.\s*(?:try_)?borrow_mut$/.test(api) ? 'data-write' : undefined)
      ?? (/\bdata\s*\.\s*(?:try_)?borrow$/.test(api) ? 'data-read' : undefined);
    if (!operation) continue;
    const receiver = api.includes('.') ? api.slice(0, api.lastIndexOf('.')) : callArguments(call).find(Boolean) ?? '';
    const argumentsList = callArguments(call);
    const serializationTarget = operation === 'serialize' ? [...argumentsList].reverse().map(argument => resolveExpression(argument, aliases, accountNames, stateNames, accounts)).find((item): item is SymbolicAccount => !!item) : undefined;
    const symbolic = serializationTarget ?? resolveExpression(receiver || call.text, aliases, accountNames, stateNames, accounts)
      ?? resolveExpression(argumentsList.join(' '), aliases, accountNames, stateNames, accounts);
    if (symbolic) addSite(call, operation, symbolic, call.text, api, undefined, operation === 'close' || operation === 'realloc' ? 0.97 : 0.92);
  }
  for (const expression of descendants(fn, 'field_expression')) {
    const symbolic = resolveExpression(expression.text, aliases, accountNames, stateNames, accounts);
    if (!symbolic?.fieldPath || INFRASTRUCTURE_FIELDS.has(symbolic.fieldPath.split('.')[0])) continue;
    // Only state fields are promoted. Account metadata fields remain covered by
    // the account validation/access model.
    if (!symbolic.stateType && !symbolic.accountName) continue;
    const operation = fieldWriteKind(expression) ? 'data-write' : 'data-read';
    addSite(expression, operation, symbolic, expression.text, undefined, symbolic.fieldPath, symbolic.stateType ? 0.96 : 0.86);
  }
  return { name, qualifiedName, parameters, aliases, sites: [...new Map(sites.map(item => [item.id, item])).values()], calls };
}

function provenanceBearingExpression(value: string, aliases: Map<string, SymbolicAccount>, accountNames: Set<string>): boolean {
  const text = value.trim().replace(/^&\s*(?:mut\s+)?/, '').replace(/^\*+/, '').replace(/^\(+/, '').trim();
  if (/^[A-Za-z_][A-Za-z0-9_]*\s*\.\s*accounts\s*\./.test(text) || /^next_account_info\b/.test(text)) return true;
  const leading = /^([A-Za-z_][A-Za-z0-9_]*)\b/.exec(text)?.[1];
  if (leading && (aliases.has(leading) || accountNames.has(leading))) return true;
  if (!/(?:try_borrow|borrow_(?:mut_)?data|borrow_(?:mut_)?state|load(?:_mut|_init)?|deserialize|try_from_slice|from_bytes(?:_mut)?|try_from_bytes(?:_mut)?|unpack(?:_unchecked)?|as_account(?:_mut)?|Account(?:::[A-Za-z_][A-Za-z0-9_]*)?\s*::\s*try_from)\b/.test(text)) return false;
  return [...text.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)].some(match => aliases.has(match[0]) || accountNames.has(match[0]));
}

function resolveExpression(value: string, aliases: Map<string, SymbolicAccount>, accountNames: Set<string>, stateNames: Set<string>, accounts: AccountInfo[]): SymbolicAccount | undefined {
  let text = value.trim().replace(/;$/, '').replace(/^&\s*(?:mut\s+)?/, '').replace(/^\*+/, '').replace(/\?+$/, '').trim();
  while (text.startsWith('(') && text.endsWith(')')) text = text.slice(1, -1).trim();
  const context = /\b[A-Za-z_][A-Za-z0-9_]*\s*\.\s*accounts\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)([\s\S]*)/.exec(text);
  if (context) {
    const accountName = context[1]; const account = accounts.find(item => item.name === accountName);
    const tail = cleanFieldTail(context[2]);
    return { root: `ctx.accounts.${accountName}`, accountName, stateType: account?.stateType, fieldPath: tail, aliasPath: [`ctx.accounts.${accountName}`] };
  }
  const identifiers = [...text.matchAll(/\b[A-Za-z_][A-Za-z0-9_]*\b/g)].map(item => item[0]);
  for (const identifier of identifiers) {
    const alias = aliases.get(identifier);
    if (!alias) continue;
    const suffix = text.slice((text.indexOf(identifier) + identifier.length));
    const fieldPath = suffix.trim().startsWith('.') ? cleanFieldTail(suffix) : alias.fieldPath;
    const explicitState = stateTypeFrom(text, stateNames);
    return { ...alias, stateType: explicitState ?? alias.stateType, fieldPath, aliasPath: [...alias.aliasPath, ...(identifier === alias.root ? [] : [identifier])] };
  }
  const direct = identifiers.find(item => accountNames.has(item));
  if (direct) {
    const account = accounts.find(item => item.name === direct);
    const suffix = text.slice(text.indexOf(direct) + direct.length);
    return { root: direct, accountName: direct, stateType: account?.stateType, fieldPath: cleanFieldTail(suffix), aliasPath: [direct] };
  }
  return undefined;
}

function bindSymbol(site: StateAccessSite, bindings: Map<string, SymbolicAccount>): { accountExpression: string; accountName?: string; stateType?: string; aliasPath: string[] } {
  const binding = site.accountParameter ? bindings.get(site.accountParameter) : undefined;
  if (binding) return { accountExpression: binding.root, accountName: binding.accountName, stateType: binding.stateType ?? site.stateType, aliasPath: [...binding.aliasPath, ...site.aliasPath] };
  const context = /ctx\.accounts\.([A-Za-z_][A-Za-z0-9_]*)/.exec(site.accountExpression);
  return { accountExpression: site.accountExpression, accountName: context?.[1] ?? (/^[A-Za-z_][A-Za-z0-9_]*$/.test(site.accountExpression) ? site.accountExpression : undefined), stateType: site.stateType, aliasPath: site.aliasPath };
}

function resolveProgramAccount(program: ProgramUnit, contextType: string | undefined, reachableAccountIds: string[], accountName?: string, stateType?: string): AccountInfo | undefined {
  const reachable = program.accounts.filter(item => item.id && reachableAccountIds.includes(item.id));
  if (accountName) {
    const contextual = reachable.find(item => item.name === accountName && (!contextType || item.contextType === contextType));
    if (contextual) return contextual;
    const named = reachable.filter(item => item.name === accountName);
    if (named.length === 1) return named[0];
  }
  if (stateType) {
    const typed = reachable.filter(item => item.stateType === stateType);
    if (typed.length === 1) return typed[0];
  }
  return undefined;
}

function applyAccessToAccount(account: AccountInfo, access: InstructionStateAccess): void {
  const dataRead = access.operation === 'data-read' || access.operation === 'deserialize';
  const dataWrite = access.operation === 'data-write' || access.operation === 'serialize' || access.operation === 'realloc' || access.operation === 'close';
  const lamportRead = access.operation === 'lamport-read'; const lamportWrite = access.operation === 'lamport-write' || access.operation === 'close';
  account.dataAccess = unique([...(account.dataAccess ?? []), ...(dataRead ? ['read' as const] : []), ...(dataWrite ? ['write' as const] : [])]);
  account.lamportAccess = unique([...(account.lamportAccess ?? []), ...(lamportRead ? ['read' as const] : []), ...(lamportWrite ? ['write' as const] : [])]);
  account.lifecycle = unique([...(account.lifecycle ?? []), ...(dataRead ? ['read' as const] : []), ...(dataWrite ? ['write' as const] : []), ...(access.operation === 'realloc' ? ['realloc' as const] : []), ...(access.operation === 'close' ? ['close' as const] : []), ...(lamportWrite ? ['lamport-transfer' as const] : [])]);
  account.writable ||= dataWrite || lamportWrite || access.operation === 'owner-change';
  account.evidence = [...new Map([...account.evidence, { description: `${access.operation} at ${access.functionName}${access.fieldPath ? ` field ${access.fieldPath}` : ''}`, location: access.location }].map(item => [`${item.description}:${item.location?.uri}:${item.location?.startLine}:${item.location?.startColumn}`, item])).values()];
}

function fieldWriteKind(node: RustNode): boolean {
  let current: RustNode | null = node;
  for (let depth = 0; current?.parent && depth < 4; depth++, current = current.parent) {
    const parent = current.parent;
    if (/assignment/.test(parent.type)) {
      const left = parent.childForFieldName('left');
      if (!left || node.startIndex >= left.startIndex && node.endIndex <= left.endIndex) return true;
    }
    if (parent.type === 'reference_expression' && /^&\s*mut\b/.test(parent.text)) return true;
    if (parent.type.endsWith('statement') || parent.type === 'block') break;
  }
  return false;
}

function cleanFieldTail(value: string): string | undefined {
  const fields = [...value.matchAll(/^\s*\.\s*([A-Za-z_][A-Za-z0-9_]*)|\.\s*([A-Za-z_][A-Za-z0-9_]*)/g)].map(item => item[1] ?? item[2]).filter(item => item && !ACCESS_METHODS[item] && !['as_ref', 'as_mut', 'deref', 'deref_mut', 'clone', 'unwrap', 'expect', 'to_account_info', 'iter', 'iter_mut', 'next', 'len', 'borrow', 'borrow_mut', 'try_borrow', 'try_borrow_mut'].includes(item));
  const meaningful = fields.filter(item => !INFRASTRUCTURE_FIELDS.has(item));
  return meaningful.length ? meaningful.join('.') : undefined;
}

function stateTypeFrom(value: string, stateNames: Set<string>): string | undefined {
  return [...stateNames].find(name => new RegExp(`\\b${escapeRegex(name)}\\b`).test(value));
}

function callArguments(node: RustNode): string[] {
  const args = node.childForFieldName('arguments') ?? node.namedChildren.find(child => child?.type === 'arguments');
  if (!args) return [];
  const text = args.text.trim();
  return text.startsWith('(') && text.endsWith(')') ? splitRustExpressions(text.slice(1, -1)).map(item => item.trim()) : [];
}

function locationKey(uri: string, line: number, column: number): string { return `${uri}:${line}:${column}`; }
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function unique<T>(items: T[]): T[] { return [...new Set(items)]; }
function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
