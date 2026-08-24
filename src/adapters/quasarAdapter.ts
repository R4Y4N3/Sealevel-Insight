import { AccountConstraint, AccountInfo, FrameworkEvidence, InstructionInfo } from '../model/report';
import { RustNode, descendants, field, nodeText } from '../parser/rustAst';
import { splitRustExpressions } from '../utils/text';

export function enrichQuasar(source: string): FrameworkEvidence[] {
  const evidence = ['quasar-lang', 'quasar_lang', 'quasar-spl', 'Quasar.toml', 'quasar::', 'derive(Accounts)'].filter(pattern => source.includes(pattern));
  return evidence.length && /quasar[-_]lang|quasar-spl|quasar::/.test(source) ? [{ framework: 'quasar', confidence: 0.78, evidence: evidence.map(description => ({ description })) }] : [];
}

export function enrichQuasarSemantics(root: RustNode, uri: string): { instructions: InstructionInfo[]; accounts: AccountInfo[] } {
  const accounts: AccountInfo[] = [];
  const instructions: InstructionInfo[] = [];
  if (!/quasar[-_:]|quasar_lang/i.test(root.text)) return { instructions, accounts };
  for (const module of descendants(root, 'mod_item')) {
    if (!attributesFor(module).includes('#[program]')) continue;
    for (const fn of descendants(module, 'function_item')) {
      const name = nodeText(field(fn, 'name'));
      const contextType = /\bCtx\s*<\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(fn.text)?.[1];
      if (name) instructions.push({ id: `instruction:${uri}:quasar:${name}:${fn.startPosition.row + 1}`, name, handler: name, functionName: name, contextType, location: loc(uri, fn), confidence: 0.94, evidence: [{ description: 'Quasar #[program] handler', location: loc(uri, fn) }] });
    }
  }
  const seedDefinitions = new Map<string, { constants: string[]; parameters: string[] }>();
  for (const struct of descendants(root, 'struct_item')) {
    const body = /#\[seeds\s*\(([\s\S]*?)\)\]/.exec(attributesFor(struct))?.[1];
    if (!body) continue;
    const parts = splitRustExpressions(body); const constants: string[] = []; const parameters: string[] = [];
    for (const part of parts) { const parameter = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/.exec(part)?.[1]; if (parameter) parameters.push(parameter); else constants.push(part.trim()); }
    seedDefinitions.set(nodeText(field(struct, 'name')), { constants, parameters });
  }
  for (const struct of descendants(root, 'struct_item')) {
    const attrs = attributesFor(struct);
    if (!/derive\s*\(\s*Accounts|AccountView|zero_copy/i.test(`${attrs}\n${struct.text}`)) continue;
    for (const fieldNode of descendants(struct, 'field_declaration')) {
      const name = nodeText(field(fieldNode, 'name'));
      const type = nodeText(field(fieldNode, 'type'));
      const fieldAttributes = attributesFor(fieldNode);
      const constraints = parseConstraints(fieldAttributes, uri, fieldNode);
      const wrapperType = /^([A-Za-z_][A-Za-z0-9_:]*)/.exec(type)?.[1]?.split('::').at(-1);
      const stateType = /^(?:Account|AccountLoader|InterfaceAccount)\s*</.test(type) ? /<\s*([^>,]+)/.exec(type)?.[1]?.trim() : undefined;
      const address = constraints.find(item => item.kind === 'address')?.expression;
      const seedDefinition = stateType ? seedDefinitions.get(stateType) : undefined;
      if (address && seedDefinition) {
        const argumentsText = new RegExp(`\\b${escapeRegex(stateType!)}::seeds\\s*\\((.*)\\)`).exec(address)?.[1];
        const argumentsList = argumentsText ? splitRustExpressions(argumentsText) : [];
        const seeds = [...seedDefinition.constants, ...seedDefinition.parameters.map((_, index) => argumentsList[index]).filter((item): item is string => !!item)];
        if (seeds.length) constraints.push({ kind: 'seeds', expression: `[${seeds.join(', ')}]`, location: loc(uri, fieldNode) });
      }
      const writable = constraints.some(item => item.kind === 'mut' || item.kind === 'init' || item.kind === 'realloc');
      const lifecycle: NonNullable<AccountInfo['lifecycle']> = constraints.some(item => item.kind === 'init') ? ['init', 'create', 'write'] : writable ? ['write'] : ['read'];
      if (constraints.some(item => item.kind === 'realloc')) lifecycle.push('realloc');
      accounts.push({ id: `account:${uri}:quasar:${fieldNode.startPosition.row + 1}:${name}`, name, type, wrapperType, stateType, contextType: nodeText(field(struct, 'name')), signer: wrapperType === 'Signer' || constraints.some(item => item.kind === 'signer'), writable, executable: wrapperType === 'Program', unchecked: wrapperType === 'UncheckedAccount', raw: wrapperType === 'AccountView', addressExpectation: constraints.find(item => item.kind === 'address')?.expression ?? (wrapperType === 'Program' ? stateType : undefined), ownerValidated: wrapperType === 'Account', addressValidated: wrapperType === 'Program' || constraints.some(item => item.kind === 'address'), constraints, lifecycle: [...new Set(lifecycle)], location: loc(uri, fieldNode), confidence: 0.93, evidence: [{ description: 'Quasar derive(Accounts) field and account constraints', location: loc(uri, fieldNode) }] });
    }
  }
  return { instructions, accounts };
}

function parseConstraints(attributes: string, uri: string, node: RustNode): AccountConstraint[] {
  const body = /#\[account\s*\(([\s\S]*?)\)\]/.exec(attributes)?.[1]; if (!body) return [];
  return splitRustExpressions(body).map(raw => { const equals = raw.indexOf('='); const kind = (equals < 0 ? raw : raw.slice(0, equals)).trim(); return { kind, expression: equals < 0 ? undefined : raw.slice(equals + 1).trim(), location: loc(uri, node) }; });
}

function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
function attributesFor(node: RustNode): string { const items: string[] = []; let sibling = node.previousNamedSibling; while (sibling?.type === 'attribute_item') { items.unshift(sibling.text); sibling = sibling.previousNamedSibling; } return items.join('\n'); }
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
