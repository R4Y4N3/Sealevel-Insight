import { InstructionInfo, AccountInfo, AccountConstraint, AccountRelation } from '../model/report';
import { RustNode, descendants, field, nodeText } from '../parser/rustAst';
import { splitRustExpressions } from '../utils/text';
import { anchorDiscriminator, resolveRustDiscriminator } from '../idl/discriminator';

export function enrichAnchor(root: RustNode, uri: string): { instructions: InstructionInfo[]; accounts: AccountInfo[] } {
  const instructions: InstructionInfo[] = [];
  const accounts: AccountInfo[] = [];
  for (const module of descendants(root, 'mod_item')) {
    if (!attributesFor(module).includes('#[program]') && !module.text.includes('#[program]')) continue;
    for (const fn of descendants(module, 'function_item')) {
      const name = nodeText(field(fn, 'name'));
      const location = loc(uri, fn);
      const instructionAttributes = attributesFor(fn);
      const customDiscriminator = attributeArgument(instructionAttributes, 'instruction', 'discriminator');
      const discriminator = customDiscriminator
        ? resolveRustDiscriminator(customDiscriminator)?.value ?? customDiscriminator
        : anchorDiscriminator('global', name);
      const generic = /Context\s*<([^>]*)/.exec(fn.text)?.[1];
      const context = generic?.split(',').map(part => part.trim().replace(/<.*$/, '')).reverse().find(part => /^[A-Z][A-Za-z0-9_]*$/.test(part));
      const argumentsNode = field(fn, 'parameters');
      const args = argumentsNode ? descendants(argumentsNode, 'parameter').filter(parameter => !/Context\s*</.test(parameter.text)).map(parameter => ({ name: parameter.childForFieldName('pattern')?.text ?? parameter.namedChildren[0]?.text ?? 'arg', type: parameter.childForFieldName('type')?.text })) : [];
      instructions.push({ id: `instruction:${uri}:${name}:${location.startLine}`, name, handler: name, discriminator, location, confidence: 0.98, evidence: [{ description: '#[program] module function', location }, { description: customDiscriminator ? `Anchor custom instruction discriminator ${customDiscriminator}` : `Anchor default sha256(global:${name}) discriminator`, location }], functionName: name, contextType: context, arguments: args, returns: instructionReturnType(fn) });
    }
  }
  for (const struct of descendants(root, 'struct_item')) {
    if (!/derive\s*\([^)]*\bAccounts\b/.test(attributesFor(struct)) && !struct.text.includes('derive(Accounts)')) continue;
    const contextType = nodeText(field(struct, 'name'));
    for (const fieldNode of descendants(struct, 'field_declaration')) {
      const type = nodeText(field(fieldNode, 'type'));
      const name = nodeText(field(fieldNode, 'name'));
      const attributes = attributesFor(fieldNode);
      const constraints = parseConstraints(attributes, uri, fieldNode);
      const relations = accountRelations(constraints);
      const normalizedType = type.replace(/^\s*(?:Option\s*<\s*)?/, '').replace(/^\s*&\s*'?[A-Za-z0-9_]*\s*(?:mut\s+)?/, '').trim();
      const wrapperType = /^([A-Za-z_][A-Za-z0-9_:]*)/.exec(normalizedType)?.[1]?.split('::').at(-1);
      const stateType = /^(?:Account|BorshAccount|AccountLoader|InterfaceAccount|Program|Interface|Sysvar)\s*</.test(normalizedType) ? genericArguments(normalizedType).at(-1)?.replace(/>+$/, '').trim() : undefined;
      const lifecycle: NonNullable<AccountInfo['lifecycle']> = [];
      if (has(constraints, 'init') || has(constraints, 'init_if_needed')) lifecycle.push('init', 'create', 'write');
      else if (has(constraints, 'mut')) lifecycle.push('write'); else lifecycle.push('read');
      if (has(constraints, 'realloc')) lifecycle.push('realloc');
      if (has(constraints, 'close')) lifecycle.push('close');
      const location = loc(uri, fieldNode);
      accounts.push({
        id: `account:${uri}:${fieldNode.startPosition.row + 1}:${name}`, name, type, wrapperType, stateType, contextType,
        signer: has(constraints, 'signer') || wrapperType === 'Signer', writable: has(constraints, 'mut') || has(constraints, 'init') || has(constraints, 'init_if_needed') || has(constraints, 'realloc') || has(constraints, 'close'),
        executable: has(constraints, 'executable') || wrapperType === 'Program' || wrapperType === 'Interface', raw: wrapperType === 'AccountInfo', unchecked: wrapperType === 'UncheckedAccount', optional: /^\s*Option\s*</.test(type),
        ownerExpectation: valueOf(constraints, 'owner') ?? (wrapperType === 'SystemAccount' ? 'system-program' : undefined), addressExpectation: valueOf(constraints, 'address') ?? (wrapperType === 'Program' || wrapperType === 'Interface' ? stateType : wrapperType === 'Sysvar' ? `sysvar:${stateType ?? 'unknown'}` : undefined), ownerValidated: !!valueOf(constraints, 'owner') || wrapperType === 'SystemAccount' || !!stateType && ['Account', 'BorshAccount', 'AccountLoader', 'InterfaceAccount'].includes(wrapperType ?? ''), addressValidated: !!valueOf(constraints, 'address') || wrapperType === 'Program' || wrapperType === 'Interface' || wrapperType === 'Sysvar', constraints, relations, lifecycle: [...new Set(lifecycle)],
        serialization: stateType ? ['anchor'] : [], location, confidence: 0.97, evidence: [{ description: '#[derive(Accounts)] field', location: loc(uri, struct) }]
      });
    }
  }
  return { instructions, accounts };
}

function accountRelations(constraints: AccountConstraint[]): AccountRelation[] {
  const mapping: Record<string, AccountRelation['kind']> = {
    has_one: 'has-one', payer: 'payer', close: 'close-destination', 'realloc::payer': 'realloc-payer', 'seeds::program': 'seed-program',
    'token::mint': 'token-mint', 'token::authority': 'token-authority', 'token::token_program': 'token-program',
    'mint::authority': 'mint-authority', 'mint::freeze_authority': 'mint-freeze-authority', 'mint::token_program': 'token-program',
    'associated_token::mint': 'associated-token-mint', 'associated_token::authority': 'associated-token-authority', 'associated_token::token_program': 'associated-token-program'
  };
  const relations: AccountRelation[] = [];
  for (const constraint of constraints) {
    if (!constraint.expression) continue;
    let kind: AccountRelation['kind'] | undefined = mapping[constraint.kind];
    if (!kind && constraint.kind.startsWith('extensions::')) kind = /(?:authority|delegate)$/.test(constraint.kind) ? 'extension-authority' : /program_id$/.test(constraint.kind) ? 'extension-program' : /(?:address|group_address|member_address|metadata_address)$/.test(constraint.kind) ? 'extension-address' : undefined;
    if (kind) relations.push({ kind, target: constraint.expression, constraint: constraint.kind, location: constraint.location });
  }
  return [...new Map(relations.map(item => [`${item.kind}:${item.target}:${item.constraint}`, item])).values()];
}

function parseConstraints(attributes: string, uri: string, node: RustNode): AccountConstraint[] {
  const result: AccountConstraint[] = [];
  for (const body of accountAttributeBodies(attributes)) {
    for (const raw of splitRustExpressions(body)) {
      const key = raw.split('=')[0].trim().replace(/\s*@.*$/, '');
      const normalized = normalizeConstraint(key);
      if (!normalized) continue;
      result.push({ kind: normalized, expression: raw.includes('=') ? raw.slice(raw.indexOf('=') + 1).trim().replace(/\s*@.*$/, '') : undefined, location: loc(uri, node) });
    }
  }
  return [...new Map(result.map(item => [`${item.kind}:${item.expression ?? ''}`, item])).values()];
}

function accountAttributeBodies(value: string): string[] {
  const bodies: string[] = []; let search = 0;
  while (true) {
    const start = value.indexOf('#[account', search); if (start < 0) break;
    const open = value.indexOf('(', start); if (open < 0) break;
    let depth = 1, quote = '', escaped = false, index = open + 1;
    for (; index < value.length && depth > 0; index++) {
      const char = value[index];
      if (quote) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === quote) quote = ''; continue; }
      if (char === '"') quote = char; else if (char === '(') depth++; else if (char === ')') depth--;
    }
    if (depth === 0) bodies.push(value.slice(open + 1, index - 1));
    search = Math.max(index, start + 2);
  }
  return bodies;
}

function normalizeConstraint(key: string): string | undefined {
  const exact = new Set(['mut', 'signer', 'seeds', 'bump', 'has_one', 'owner', 'address', 'constraint', 'init_if_needed', 'init', 'zero', 'close', 'realloc', 'payer', 'space', 'executable', 'dup', 'discriminator']);
  if (exact.has(key)) return key;
  const functionConstraint = /^(has_one|constraints?|token|mint|associated_token|extensions|init)\s*\(/.exec(key)?.[1];
  if (functionConstraint) return functionConstraint === 'constraints' ? 'constraint' : functionConstraint;
  if (/^(?:realloc|seeds|token|mint|associated_token|extensions)(?:::[A-Za-z0-9_]+)+$/.test(key)) return key;
  return undefined;
}
function genericArguments(type: string): string[] { const match = /<([\s\S]*)>/.exec(type); return match ? splitRustExpressions(match[1]) : []; }
function valueOf(items: AccountConstraint[], kind: string): string | undefined { return items.find(item => item.kind === kind)?.expression; }
function has(items: AccountConstraint[], kind: string): boolean { return items.some(item => item.kind === kind); }
function instructionReturnType(fn: RustNode): string | undefined {
  const raw = (nodeText(field(fn, 'return_type')) || fn.children.find(child => child?.type === 'return_type')?.text || '').replace(/^\s*->\s*/, '').trim();
  const result = /(?:^|::)Result\s*<([\s\S]*)>\s*$/.exec(raw);
  const success = result ? splitRustExpressions(result[1])[0]?.trim() : undefined;
  return success;
}
function attributesFor(node: RustNode): string { const values: string[] = []; let sibling = node.previousNamedSibling; while (sibling?.type === 'attribute_item') { values.unshift(sibling.text); sibling = sibling.previousNamedSibling; } return values.join('\n'); }
function attributeArgument(attributes: string, attribute: string, argument: string): string | undefined {
  const marker = `#[${attribute}`; let search = 0;
  while ((search = attributes.indexOf(marker, search)) >= 0) {
    const open = attributes.indexOf('(', search + marker.length); if (open < 0) return undefined;
    let depth = 1, quote = '', escaped = false, index = open + 1;
    for (; index < attributes.length && depth > 0; index++) {
      const char = attributes[index];
      if (quote) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === quote) quote = ''; continue; }
      if (char === '"' || char === "'") quote = char; else if (char === '(') depth++; else if (char === ')') depth--;
    }
    if (depth === 0) for (const item of splitRustExpressions(attributes.slice(open + 1, index - 1))) {
      const match = new RegExp(`^${argument}\\s*=\\s*([\\s\\S]+)$`).exec(item.trim()); if (match) return match[1].trim();
    }
    search = Math.max(index, search + marker.length);
  }
  return undefined;
}
function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
