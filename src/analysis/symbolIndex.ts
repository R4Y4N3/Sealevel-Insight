import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Evidence, RustSymbol } from '../model/report';
import { field, nodeText, RustNode } from '../parser/rustAst';

export interface IndexedRustFile { uri: string; root: RustNode; packageName: string; packageRoot?: string; }
export interface ImportBinding { fileUri: string; module: string; alias: string; target: string; glob: boolean; public: boolean; evidence: Evidence[]; }
export interface RustSymbolIndex { symbols: RustSymbol[]; imports: ImportBinding[]; modulesByFile: Map<string, string>; }

export function buildRustSymbolIndex(files: IndexedRustFile[]): RustSymbolIndex {
  const symbols: RustSymbol[] = [];
  const imports: ImportBinding[] = [];
  const modulesByFile = new Map<string, string>();
  for (const file of files) modulesByFile.set(file.uri, moduleForFile(file.uri, file.packageRoot));
  for (const file of files) applyDeclaredModulePaths(file, files, modulesByFile);
  for (const file of files) {
    const moduleName = modulesByFile.get(file.uri) ?? 'crate';
    indexChildren(file.root, file, moduleName, undefined, symbols, imports, []);
  }
  for (const file of files) indexClosures(file, symbols);
  return {
    symbols: [...new Map(symbols.map(symbol => [symbol.id, symbol])).values()].sort((a, b) => a.id.localeCompare(b.id)),
    imports: imports.sort((a, b) => `${a.fileUri}:${a.alias}:${a.target}`.localeCompare(`${b.fileUri}:${b.alias}:${b.target}`)),
    modulesByFile
  };
}

function applyDeclaredModulePaths(file: IndexedRustFile, files: IndexedRustFile[], modules: Map<string, string>): void {
  const parentModule = modules.get(file.uri) ?? 'crate';
  const filePath = uriPath(file.uri); if (!filePath) return;
  for (const node of file.root.namedChildren.filter((item): item is RustNode => !!item && item.type === 'mod_item')) {
    if (field(node, 'body')) continue;
    const name = nodeText(field(node, 'name')); if (!name) continue;
    const attributes: string[] = []; let sibling = node.previousNamedSibling;
    while (sibling?.type === 'attribute_item') { attributes.unshift(sibling.text); sibling = sibling.previousNamedSibling; }
    const declared = /#\[path\s*=\s*"([^"]+)"\]/.exec(attributes.join('\n'))?.[1];
    const candidates = declared ? [path.resolve(path.dirname(filePath), declared)] : [path.resolve(path.dirname(filePath), `${name}.rs`), path.resolve(path.dirname(filePath), name, 'mod.rs')];
    const target = files.find(item => { const resolved = uriPath(item.uri); return !!resolved && candidates.includes(path.resolve(resolved)); });
    if (target) modules.set(target.uri, `${parentModule}::${name}`);
  }
}

interface ImplContext { type: string; trait?: string; macroOrigins?: string[]; }

function indexChildren(node: RustNode, file: IndexedRustFile, moduleName: string, impl: ImplContext | undefined, symbols: RustSymbol[], imports: ImportBinding[], inheritedOrigins: string[]): void {
  for (const child of node.namedChildren.filter((item): item is RustNode => !!item)) {
    if (child.type === 'mod_item') {
      const name = nodeText(field(child, 'name'));
      if (!name) continue;
      const qualifiedName = `${moduleName}::${name}`;
      const origins = [...new Set([...inheritedOrigins, ...macroOrigins(child)])];
      symbols.push(symbol(file, child, name, qualifiedName, 'module', undefined, inheritedOrigins));
      const body = field(child, 'body');
      if (body) indexChildren(body, file, qualifiedName, undefined, symbols, imports, origins);
      continue;
    }
    if (child.type === 'impl_item') {
      const type = nodeText(field(child, 'type')) || implTypeFromText(child.text); const trait = nodeText(field(child, 'trait')) || undefined;
      const origins = [...new Set([...inheritedOrigins, ...macroOrigins(child)])];
      indexChildren(child, file, moduleName, type ? { type, trait, macroOrigins: origins } : undefined, symbols, imports, origins);
      continue;
    }
    if (child.type === 'trait_item') {
      const name = nodeText(field(child, 'name'));
      if (name) {
        const origins = [...new Set([...inheritedOrigins, ...macroOrigins(child)])];
        symbols.push(symbol(file, child, name, `${moduleName}::${name}`, 'trait', undefined, inheritedOrigins));
        const members = field(child, 'body')?.namedChildren.filter((item): item is RustNode => !!item && (item.type === 'function_signature_item' || item.type === 'function_item')) ?? [];
        for (const member of members) {
          const memberName = nodeText(field(member, 'name')); if (!memberName) continue;
          symbols.push(symbol(file, member, memberName, `${moduleName}::${name}::${memberName}`, 'trait-method', { type: 'Self', trait: name, macroOrigins: origins }, origins));
        }
      }
      // Trait declarations are dispatch contracts, not concrete function bodies.
      continue;
    }
    if (child.type === 'use_declaration') { imports.push(...parseUse(child, file.uri, moduleName)); continue; }
    const descriptor = symbolDescriptor(child, impl?.type);
    if (descriptor) {
      const name = nodeText(field(child, 'name'));
      if (name) {
        const associated = descriptor.kind === 'method' || descriptor.kind === 'associated-function';
        const qualifiedName = `${moduleName}::${impl && associated ? `${cleanType(impl.type)}::` : ''}${name}`;
        symbols.push(symbol(file, child, name, qualifiedName, descriptor.kind, impl, inheritedOrigins));
      }
    }
    if (!['function_item', 'closure_expression'].includes(child.type)) indexChildren(child, file, moduleName, impl, symbols, imports, inheritedOrigins);
  }
}

function symbolDescriptor(node: RustNode, implType?: string): { kind: RustSymbol['kind'] } | undefined {
  const type = node.type;
  if (type === 'function_item') return { kind: implType ? hasSelfReceiver(node) ? 'method' : 'associated-function' : 'function' };
  if (type === 'struct_item') return { kind: 'struct' };
  if (type === 'enum_item') return { kind: 'enum' };
  if (type === 'const_item') return { kind: 'constant' };
  if (type === 'static_item') return { kind: 'static' };
  if (type === 'type_item') return { kind: 'type-alias' };
  return undefined;
}

function symbol(file: IndexedRustFile, node: RustNode, shortName: string, qualifiedName: string, kind: RustSymbol['kind'], impl?: ImplContext, inheritedOrigins: string[] = []): RustSymbol {
  const location = { uri: file.uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
  const visibility = node.namedChildren.find(child => child?.type === 'visibility_modifier')?.text ?? 'private';
  const associated = kind === 'method' || kind === 'associated-function' || kind === 'trait-method';
  const origins = [...new Set([...inheritedOrigins, ...(impl?.macroOrigins ?? []), ...macroOrigins(node)])].sort();
  const result: RustSymbol = { id: `symbol:${file.packageName}:${qualifiedName}:${location.uri}:${location.startLine}:${location.startColumn}`, qualifiedName, shortName, kind, package: file.packageName, module: qualifiedName.split('::').slice(0, associated ? -2 : -1).join('::') || 'crate', visibility, location, implType: impl?.type, traitName: impl?.trait, hasSelfReceiver: kind === 'method' || kind === 'trait-method' ? hasSelfReceiver(node) : kind === 'associated-function' ? false : undefined, genericBounds: parseGenericBounds(node), macroOrigins: origins.length ? origins : undefined, evidence: [{ description: `Rust AST ${kind}${impl?.trait ? ` in impl ${impl.trait} for ${impl.type}` : impl?.type ? ` in impl ${impl.type}` : ''}`, location }] };
  if (kind === 'type-alias') result.aliasTarget = nodeText(field(node, 'type')) || /\=\s*([^;]+);?\s*$/.exec(node.text)?.[1]?.trim();
  if (origins.length) result.evidence.push({ description: `Item carries macro-origin attribute(s): ${origins.join(', ')}`, location });
  return result;
}

function indexClosures(file: IndexedRustFile, symbols: RustSymbol[]): void {
  for (const closure of descendantsOf(file.root, 'closure_expression')) {
    const line = closure.startPosition.row + 1; const column = closure.startPosition.column;
    const owner = symbols.filter(item => item.location.uri === file.uri && callableKind(item.kind) && contains(item.location, line, column)).sort((a, b) => span(a) - span(b))[0];
    if (!owner) continue;
    const location = { uri: file.uri, startLine: line, startColumn: column, endLine: closure.endPosition.row + 1, endColumn: closure.endPosition.column };
    const qualifiedName = `${owner.qualifiedName}::{{closure@${line}:${column}}}`;
    symbols.push({ id: `symbol:${file.packageName}:${qualifiedName}:${file.uri}:${line}:${column}`, qualifiedName, shortName: `{closure@${line}:${column}}`, kind: 'closure', package: file.packageName, module: owner.module, visibility: 'private', location, macroOrigins: owner.macroOrigins, evidence: [{ description: `Rust closure expression owned by ${owner.qualifiedName}`, location }] });
  }
}

function hasSelfReceiver(node: RustNode): boolean { return !!field(node, 'parameters')?.namedChildren.some(child => child?.type === 'self_parameter'); }
function parseGenericBounds(node: RustNode): Array<{ typeParameter: string; trait: string }> | undefined {
  const values: Array<{ typeParameter: string; trait: string }> = [];
  const params = field(node, 'type_parameters');
  for (const parameter of params?.namedChildren.filter((item): item is RustNode => !!item && item.type === 'type_parameter') ?? []) {
    const name = nodeText(field(parameter, 'name')); const bounds = nodeText(field(parameter, 'bounds'));
    for (const trait of traitBounds(bounds)) if (name) values.push({ typeParameter: name, trait });
  }
  const where = node.namedChildren.find(child => child?.type === 'where_clause');
  for (const predicate of where?.namedChildren.filter((item): item is RustNode => !!item && item.type === 'where_predicate') ?? []) {
    const name = nodeText(field(predicate, 'left')); const bounds = nodeText(field(predicate, 'bounds'));
    for (const trait of traitBounds(bounds)) if (name) values.push({ typeParameter: name, trait });
  }
  return values.length ? [...new Map(values.map(item => [`${item.typeParameter}:${item.trait}`, item])).values()].sort((a, b) => `${a.typeParameter}:${a.trait}`.localeCompare(`${b.typeParameter}:${b.trait}`)) : undefined;
}
function traitBounds(value: string): string[] { return splitTopLevelPlus(value).map(item => item.trim().replace(/^:\s*/, '').replace(/^\?/, '').replace(/^for\s*<[^>]+>\s*/, '')).filter(item => !!item && !item.startsWith("'") && item !== 'Sized'); }
function splitTopLevelPlus(value: string): string[] { const result: string[] = []; let depth = 0; let start = 0; for (let index = 0; index < value.length; index++) { if ('<([{'.includes(value[index])) depth++; else if ('>)]}'.includes(value[index])) depth--; else if (value[index] === '+' && depth === 0) { result.push(value.slice(start, index)); start = index + 1; } } result.push(value.slice(start)); return result; }
function macroOrigins(node: RustNode): string[] { const result: string[] = []; let previous = node.previousNamedSibling; while (previous?.type === 'attribute_item') { const name = /^#\[\s*([A-Za-z_][A-Za-z0-9_:]*)/.exec(previous.text)?.[1]; if (name && !/^(?:cfg|cfg_attr|allow|warn|deny|forbid|doc|inline|cold|must_use|deprecated|repr)$/.test(name)) result.unshift(name); previous = previous.previousNamedSibling; } return result; }
function descendantsOf(node: RustNode, type: string): RustNode[] { return node.descendantsOfType(type).filter((item): item is RustNode => !!item); }
function callableKind(kind: RustSymbol['kind']): boolean { return kind === 'function' || kind === 'method' || kind === 'associated-function' || kind === 'closure'; }
function contains(location: RustSymbol['location'], line: number, column: number): boolean { return line > location.startLine && line < location.endLine || line === location.startLine && column >= location.startColumn && (line < location.endLine || column <= location.endColumn) || line === location.endLine && column <= location.endColumn && line > location.startLine; }
function span(symbol: RustSymbol): number { return (symbol.location.endLine - symbol.location.startLine) * 10000 + symbol.location.endColumn - symbol.location.startColumn; }

function parseUse(node: RustNode, fileUri: string, module: string): ImportBinding[] {
  const publicUse = /^pub(?:\([^)]*\))?\s+use\b/.test(node.text.trim());
  const expression = node.text.replace(/^\s*(?:pub(?:\([^)]*\))?\s+)?use\s+/, '').replace(/;\s*$/, '').trim();
  const expanded = expandUse(expression);
  const location = { uri: fileUri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
  return expanded.map(item => ({ fileUri, module, alias: item.alias, target: normalizeImportTarget(item.target, module), glob: item.glob, public: publicUse, evidence: [{ description: `${publicUse ? 'public re-export' : 'use import'} ${expression}`, location }] }));
}

function expandUse(expression: string): Array<{ alias: string; target: string; glob: boolean }> {
  const open = expression.indexOf('{');
  if (open >= 0 && expression.endsWith('}')) {
    const prefix = expression.slice(0, open).replace(/::$/, ''); const body = expression.slice(open + 1, -1);
    return splitTopLevel(body).flatMap(part => expandUse(prefix ? `${prefix}::${part.trim()}` : part.trim()));
  }
  if (expression.endsWith('::*')) return [{ alias: '*', target: expression.slice(0, -3), glob: true }];
  const alias = /^(.*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/.exec(expression);
  const target = (alias?.[1] ?? expression).replace(/::self$/, '');
  return [{ alias: alias?.[2] ?? target.split('::').at(-1) ?? target, target, glob: false }];
}

function normalizeImportTarget(target: string, module: string): string {
  if (target.startsWith('crate::')) return target;
  if (target.startsWith('self::')) return `${module}::${target.slice(6)}`;
  if (target === 'self') return module;
  if (target.startsWith('super::')) {
    let current = module.split('::');
    let rest = target;
    while (rest.startsWith('super::')) { current = current.slice(0, -1); rest = rest.slice(7); }
    return `${current.join('::')}::${rest}`;
  }
  return target;
}

function moduleForFile(uri: string, packageRoot?: string): string {
  let file = uri;
  try { if (uri.startsWith('file:')) file = fileURLToPath(uri); } catch { /* retain URI text for conservative fallback */ }
  if (!packageRoot) return 'crate';
  const relative = path.relative(packageRoot, file).split(path.sep).join('/');
  const sourceRelative = relative.startsWith('src/') ? relative.slice(4) : relative;
  if (/^(lib|main)\.rs$/.test(sourceRelative)) return 'crate';
  const withoutExtension = sourceRelative.replace(/\.rs$/, '').replace(/\/mod$/, '');
  return `crate::${withoutExtension.split('/').filter(Boolean).join('::')}`;
}
function uriPath(uri: string): string | undefined { try { return uri.startsWith('file:') ? fileURLToPath(uri) : path.isAbsolute(uri) ? uri : undefined; } catch { return undefined; } }

function splitTopLevel(value: string): string[] { const items: string[] = []; let depth = 0; let start = 0; for (let index = 0; index < value.length; index++) { if (value[index] === '{') depth++; else if (value[index] === '}') depth--; else if (value[index] === ',' && depth === 0) { items.push(value.slice(start, index)); start = index + 1; } } items.push(value.slice(start)); return items.filter(item => item.trim()); }
function implTypeFromText(value: string): string { return /^\s*impl(?:<[^>]*>)?\s+(?:[^\s]+\s+for\s+)?([^\s{]+)/.exec(value)?.[1] ?? ''; }
function cleanType(value: string): string { return value.replace(/^.*::/, '').replace(/<.*$/, '').replace(/^&(?:mut\s+)?/, ''); }
