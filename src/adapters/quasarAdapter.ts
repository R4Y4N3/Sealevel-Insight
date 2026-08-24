import { AccountConstraint, AccountInfo, AccountRelation, FrameworkEvidence, InstructionInfo } from '../model/report';
import { RustNode, descendants, field, nodeText } from '../parser/rustAst';
import { splitRustExpressions } from '../utils/text';
import { resolveRustDiscriminator } from '../idl/discriminator';

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
      const contextType = /\bCtx(?:WithRemaining)?\s*<\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(fn.text)?.[1];
      const attributes = attributesFor(fn);
      const discriminatorExpression = attributeArgument(attributes, 'instruction', 'discriminator');
      const discriminator = resolveRustDiscriminator(discriminatorExpression)?.value;
      const parameters = field(fn, 'parameters');
      const arguments_ = parameters ? descendants(parameters, 'parameter').filter(parameter => !/\bCtx(?:WithRemaining)?\s*</.test(parameter.text)).map(parameter => ({ name: parameter.childForFieldName('pattern')?.text ?? parameter.namedChildren[0]?.text ?? 'arg', type: parameter.childForFieldName('type')?.text })) : [];
      const withRemaining = /\bCtxWithRemaining\s*</.test(fn.text);
      const parsedRemaining = /remaining_accounts\s*\(\s*\)\s*\.\s*parse\s*::\s*<\s*([^,>]+)\s*,\s*(\d+)\s*>/.exec(fn.text);
      const remainingAccounts = withRemaining ? { kind: 'append' as const, name: 'remainingAccounts', min: 0, max: null, item: { clientType: 'accountMeta', signer: 'input' as const, writable: 'input' as const }, policy: { position: 'afterDeclaredAccounts' as const, order: 'preserveInput' as const }, onChainType: parsedRemaining?.[1]?.trim(), onChainMax: parsedRemaining ? Number(parsedRemaining[2]) : undefined, evidence: [{ description: parsedRemaining ? `CtxWithRemaining parsed as Remaining<${parsedRemaining[1].trim()}, ${parsedRemaining[2]}>` : 'CtxWithRemaining accepts an input-preserving trailing account list', location: loc(uri, fn) }] } : undefined;
      if (name) instructions.push({ id: `instruction:${uri}:quasar:${name}:${fn.startPosition.row + 1}`, name, handler: name, functionName: name, contextType, discriminator, arguments: arguments_, returns: instructionReturnType(fn), remainingAccounts, location: loc(uri, fn), confidence: discriminator ? 0.97 : 0.9, evidence: [{ description: 'Quasar #[program] handler', location: loc(uri, fn) }, ...(discriminatorExpression ? [{ description: `Quasar instruction discriminator ${discriminatorExpression}`, location: loc(uri, fn) }] : []), ...(remainingAccounts?.evidence ?? [])] });
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
      const relations = accountRelations(constraints);
      const optional = /^\s*Option\s*</.test(type);
      const optionalInner = optional ? type.replace(/^\s*Option\s*<\s*/, '').replace(/>\s*$/, '') : type;
      const mutableReference = /^\s*&\s*'?[A-Za-z0-9_]*\s+mut\b/.test(optionalInner);
      const normalizedType = optionalInner.replace(/^\s*&\s*'?[A-Za-z0-9_]*\s*(?:mut\s+)?/, '').trim();
      const wrapperType = /^([A-Za-z_][A-Za-z0-9_:]*)/.exec(normalizedType)?.[1]?.split('::').at(-1);
      const stateType = /^(?:Account|AccountLoader|InterfaceAccount|Program|Interface|Sysvar)\s*</.test(normalizedType) ? /<\s*([^>,]+)/.exec(normalizedType)?.[1]?.trim() : undefined;
      const address = constraints.find(item => item.kind === 'address')?.expression;
      const seedDefinition = stateType ? seedDefinitions.get(stateType) : undefined;
      if (address && seedDefinition) {
        const argumentsText = new RegExp(`\\b${escapeRegex(stateType!)}::seeds\\s*\\((.*)\\)`).exec(address)?.[1];
        const argumentsList = argumentsText ? splitRustExpressions(argumentsText) : [];
        const seeds = [...seedDefinition.constants, ...seedDefinition.parameters.map((_, index) => argumentsList[index]).filter((item): item is string => !!item)];
        if (seeds.length) constraints.push({ kind: 'seeds', expression: `[${seeds.join(', ')}]`, location: loc(uri, fieldNode) });
      }
      const initializing = constraints.some(item => item.kind === 'init' || item.kind === 'init(idempotent)' || item.kind === 'init_if_needed');
      const closing = constraints.some(item => item.kind === 'close');
      const writable = mutableReference || constraints.some(item => item.kind === 'mut' || item.kind === 'realloc') || initializing || closing;
      const lifecycle: NonNullable<AccountInfo['lifecycle']> = initializing ? ['init', 'create', 'write'] : writable ? ['write'] : ['read'];
      if (constraints.some(item => item.kind === 'realloc')) lifecycle.push('realloc');
      if (closing) lifecycle.push('close');
      const programWrapper = wrapperType === 'Program' || wrapperType === 'Interface';
      accounts.push({ id: `account:${uri}:quasar:${fieldNode.startPosition.row + 1}:${name}`, name, type, wrapperType, stateType, contextType: nodeText(field(struct, 'name')), signer: wrapperType === 'Signer' || constraints.some(item => item.kind === 'signer'), writable, executable: programWrapper, unchecked: wrapperType === 'UncheckedAccount', raw: wrapperType === 'AccountView', optional, addressExpectation: constraints.find(item => item.kind === 'address')?.expression ?? (programWrapper || wrapperType === 'Sysvar' ? stateType : undefined), ownerExpectation: wrapperType === 'SystemAccount' ? 'SystemProgram' : undefined, ownerValidated: ['Account', 'InterfaceAccount', 'SystemAccount'].includes(wrapperType ?? ''), addressValidated: programWrapper || wrapperType === 'Sysvar' || constraints.some(item => item.kind === 'address'), constraints, relations, lifecycle: [...new Set(lifecycle)], location: loc(uri, fieldNode), confidence: 0.93, evidence: [{ description: 'Quasar derive(Accounts) field and account constraints', location: loc(uri, fieldNode) }] });
    }
  }
  return { instructions, accounts };
}

function parseConstraints(attributes: string, uri: string, node: RustNode): AccountConstraint[] {
  const body = /#\[account\s*\(([\s\S]*?)\)\]/.exec(attributes)?.[1]; if (!body) return [];
  return splitRustExpressions(body).map(raw => {
    const value = raw.trim(); const equals = topLevelEquals(value);
    if (equals >= 0) return { kind: value.slice(0, equals).trim(), expression: value.slice(equals + 1).trim(), location: loc(uri, node) };
    if (/^init\s*\(\s*idempotent\s*\)$/.test(value)) return { kind: 'init(idempotent)', location: loc(uri, node) };
    const call = /^([A-Za-z_][A-Za-z0-9_:]*)\s*\(([\s\S]*)\)$/.exec(value);
    return { kind: call?.[1] === 'constraints' ? 'constraint' : call?.[1] ?? value, expression: call?.[2]?.trim() || undefined, location: loc(uri, node) };
  });
}

function accountRelations(constraints: AccountConstraint[]): AccountRelation[] {
  const mapping: Record<string, AccountRelation['kind']> = {
    has_one: 'has-one', payer: 'payer', close: 'close-destination', 'realloc::payer': 'realloc-payer', 'seeds::program': 'seed-program',
    'token::mint': 'token-mint', 'token::authority': 'token-authority', 'token::token_program': 'token-program',
    'mint::authority': 'mint-authority', 'mint::freeze_authority': 'mint-freeze-authority', 'mint::token_program': 'token-program',
    'associated_token::mint': 'associated-token-mint', 'associated_token::authority': 'associated-token-authority', 'associated_token::token_program': 'associated-token-program'
  };
  return [...new Map(constraints.flatMap(constraint => {
    const kind = mapping[constraint.kind]; if (!kind || !constraint.expression) return [];
    const target = constraint.kind === 'close' ? (/\bdest\s*=\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(constraint.expression)?.[1] ?? constraint.expression) : constraint.expression;
    return [{ kind, target, constraint: constraint.kind, location: constraint.location }];
  }).map(item => [`${item.kind}:${item.target}:${item.constraint}`, item])).values()];
}

function topLevelEquals(value: string): number { let depth = 0; let quote = ''; let escaped = false; for (let index = 0; index < value.length; index++) { const char = value[index]; if (quote) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === quote) quote = ''; continue; } if (char === '"' || char === "'") quote = char; else if ('([{'.includes(char)) depth++; else if (')]}'.includes(char)) depth--; else if (char === '=' && depth === 0) return index; } return -1; }

function instructionReturnType(fn: RustNode): string | undefined {
  const raw = (nodeText(field(fn, 'return_type')) || fn.children.find(child => child?.type === 'return_type')?.text || '').replace(/^\s*->\s*/, '').trim();
  const result = /(?:^|::)Result\s*<([\s\S]*)>\s*$/.exec(raw);
  const success = result ? splitRustExpressions(result[1])[0]?.trim() : undefined;
  return success;
}

function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
function attributesFor(node: RustNode): string { const items: string[] = []; let sibling = node.previousNamedSibling; while (sibling?.type === 'attribute_item') { items.unshift(sibling.text); sibling = sibling.previousNamedSibling; } return items.join('\n'); }
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
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
