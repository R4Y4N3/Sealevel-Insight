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
    indexChildren(file.root, file, moduleName, undefined, symbols, imports);
  }
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

interface ImplContext { type: string; trait?: string; }

function indexChildren(node: RustNode, file: IndexedRustFile, moduleName: string, impl: ImplContext | undefined, symbols: RustSymbol[], imports: ImportBinding[]): void {
  for (const child of node.namedChildren.filter((item): item is RustNode => !!item)) {
    if (child.type === 'mod_item') {
      const name = nodeText(field(child, 'name'));
      if (!name) continue;
      const qualifiedName = `${moduleName}::${name}`;
      symbols.push(symbol(file, child, name, qualifiedName, 'module'));
      const body = field(child, 'body');
      if (body) indexChildren(body, file, qualifiedName, undefined, symbols, imports);
      continue;
    }
    if (child.type === 'impl_item') {
      const type = nodeText(field(child, 'type')) || implTypeFromText(child.text); const trait = nodeText(field(child, 'trait')) || undefined;
      indexChildren(child, file, moduleName, type ? { type, trait } : undefined, symbols, imports);
      continue;
    }
    if (child.type === 'trait_item') {
      const name = nodeText(field(child, 'name'));
      if (name) symbols.push(symbol(file, child, name, `${moduleName}::${name}`, 'trait'));
      // Trait declarations describe a dispatch contract, not directly callable free
      // functions. Concrete impl methods are indexed separately with their receiver.
      continue;
    }
    if (child.type === 'use_declaration') { imports.push(...parseUse(child, file.uri, moduleName)); continue; }
    const descriptor = symbolDescriptor(child.type, impl?.type);
    if (descriptor) {
      const name = nodeText(field(child, 'name'));
      if (name) {
        const qualifiedName = `${moduleName}::${impl && descriptor.kind === 'method' ? `${cleanType(impl.type)}::` : ''}${name}`;
        symbols.push(symbol(file, child, name, qualifiedName, descriptor.kind, impl));
      }
    }
    if (!['function_item', 'closure_expression'].includes(child.type)) indexChildren(child, file, moduleName, impl, symbols, imports);
  }
}

function symbolDescriptor(type: string, implType?: string): { kind: RustSymbol['kind'] } | undefined {
  if (type === 'function_item') return { kind: implType ? 'method' : 'function' };
  if (type === 'struct_item') return { kind: 'struct' };
  if (type === 'enum_item') return { kind: 'enum' };
  if (type === 'const_item') return { kind: 'constant' };
  if (type === 'static_item') return { kind: 'static' };
  if (type === 'type_item') return { kind: 'type-alias' };
  return undefined;
}

function symbol(file: IndexedRustFile, node: RustNode, shortName: string, qualifiedName: string, kind: RustSymbol['kind'], impl?: ImplContext): RustSymbol {
  const location = { uri: file.uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column };
  const visibility = node.namedChildren.find(child => child?.type === 'visibility_modifier')?.text ?? 'private';
  return { id: `symbol:${file.packageName}:${qualifiedName}:${location.uri}:${location.startLine}:${location.startColumn}`, qualifiedName, shortName, kind, package: file.packageName, module: qualifiedName.split('::').slice(0, kind === 'method' ? -2 : -1).join('::') || 'crate', visibility, location, implType: impl?.type, traitName: impl?.trait, evidence: [{ description: `Rust AST ${kind}${impl?.trait ? ` in impl ${impl.trait} for ${impl.type}` : impl?.type ? ` in impl ${impl.type}` : ''}`, location }] };
}

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
