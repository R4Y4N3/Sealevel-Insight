import { ProgramUnit, RuntimeOperation, StateAccountType, SysvarUse } from '../model/report';
import { descendants, field, nodeText, RustNode } from '../parser/rustAst';
import { anchorDiscriminator, resolveRustDiscriminator } from '../idl/discriminator';
import { splitRustExpressions } from '../utils/text';

const SYSVARS = new Set(['Clock', 'Rent', 'EpochSchedule', 'Instructions', 'SlotHashes', 'StakeHistory', 'LastRestartSlot', 'RecentBlockhashes', 'Rewards']);

export function enrichUnifiedSemantics(root: RustNode, uri: string, program: ProgramUnit): void {
  program.stateTypes ??= [];
  program.sysvars ??= [];
  program.runtimeOperations ??= [];
  program.events ??= [];
  program.errors ??= [];
  extractStates(root, uri, program);
  extractSysvars(root, uri, program.sysvars);
  extractRuntime(root, uri, program.runtimeOperations);
  extractEventsAndErrors(root, uri, program);
}

function extractStates(root: RustNode, uri: string, program: ProgramUnit): void {
  const stateTypes = program.stateTypes ??= [];
  const anchorSource = (/anchor[-_]lang|anchor_lang::|anchor_spl::/.test(root.text) || program.frameworkEvidence.some(item => item.framework === 'anchor')) && !/quasar[-_]lang|quasar-spl|quasar::/.test(root.text);
  for (const struct of descendants(root, 'struct_item')) {
    const attributes = attributesFor(struct);
    const serialization = serializationFor(`${attributes} ${struct.text}`);
    const fields = descendants(struct, 'field_declaration').map(item => {
      const fieldAttributes = attributesFor(item);
      const idlType = /#\[idl_type\s*\(\s*(?:"([^"]+)"|([^\)]+))\s*\)\]/.exec(fieldAttributes);
      return { name: nodeText(field(item, 'name')), type: nodeText(field(item, 'type')), visibility: item.namedChildren.find(child => child?.type === 'visibility_modifier')?.text ?? 'private', idlName: /#\[idl_name\s*\(\s*"([^"]+)"\s*\)\]/.exec(fieldAttributes)?.[1], idlType: (idlType?.[1] ?? idlType?.[2])?.trim(), idlSkip: /#\[skip\s*\]/.test(fieldAttributes) || undefined, padding: /#\[padding\s*\]/.test(fieldAttributes) || undefined };
    });
    const stateModule = /(?:^|\/)state(?:\.rs|\/)/.test(uri) && fields.length > 0;
    const isState = stateModule || /#\[(?:account|zero_copy)\b/.test(attributes) || fields.length > 0 && /\b(?:BorshSerialize|AnchorSerialize|Pod|Zeroable|Pack|ShankAccount|ShankType)\b/.test(attributes);
    if (!isState) continue;
    const name = nodeText(field(struct, 'name'));
    const customDiscriminator = attributeArgument(attributes, 'account', 'discriminator');
    const discriminator = customDiscriminator
      ? resolveRustDiscriminator(customDiscriminator)?.value ?? customDiscriminator
      : anchorSource && /#\[account(?:\s*\]|\s*\()/.test(attributes) ? anchorDiscriminator('account', name) : undefined;
    const dynamicSize = fields.some(item => /\b(?:Vec|String|Box|HashMap|BTreeMap)\s*</.test(item.type) || /\[.*\]/.test(item.type) && !/\[[^;]+;\s*\d+\]/.test(item.type));
    const location = loc(uri, struct);
    const item: StateAccountType = {
      id: `state:${program.name}:${name}:${uri}:${location.startLine}`, name, package: program.name,
      framework: frameworkFor(attributes), fields, visibility: struct.namedChildren.find(child => child?.type === 'visibility_modifier')?.text ?? 'private',
      serialization, zeroCopy: /zero_copy|Pod|Zeroable/.test(`${attributes} ${struct.text}`), discriminator,
      declaredSpace: /\b(?:space|LEN)\s*=\s*([^,\])]+)/.exec(`${attributes} ${struct.text}`)?.[1]?.trim(), dynamicSize,
      pdaIds: [], initializationSites: [], reallocSites: [], closeSites: [], evidence: [{ description: `state/account type with ${serialization.join(', ') || 'framework'} serialization evidence`, location }, ...(discriminator ? [{ description: customDiscriminator ? `custom account discriminator ${customDiscriminator}` : `Anchor default sha256(account:${name}) discriminator`, location }] : [])], location
    };
    if (!dynamicSize) item.staticSize = staticSize(fields.map(entry => entry.type));
    stateTypes.push(item);
  }
  program.stateTypes = [...new Map(stateTypes.map(item => [item.id, item])).values()];
}

function extractSysvars(root: RustNode, uri: string, output: SysvarUse[]): void {
  for (const identifier of descendants(root, 'type_identifier')) {
    if (!SYSVARS.has(identifier.text)) continue;
    const location = loc(uri, identifier);
    output.push({ id: `sysvar:${identifier.text}:${uri}:${location.startLine}:${location.startColumn}`, name: identifier.text, functionName: enclosingFunctionName(identifier), instructionIds: [], location, evidence: [{ description: `Rust sysvar type ${identifier.text}`, location }] });
  }
  for (const call of descendants(root, 'call_expression')) {
    const api = call.childForFieldName('function')?.text ?? '';
    const name = [...SYSVARS].find(sysvar => api === `${sysvar}::get` || api.endsWith(`::${sysvar}::get`));
    if (!name) continue;
    const location = loc(uri, call);
    output.push({ id: `sysvar:${name}:${uri}:${location.startLine}:${location.startColumn}`, name, functionName: enclosingFunctionName(call), instructionIds: [], location, evidence: [{ description: `sysvar get call ${api}`, location }] });
  }
}

function extractRuntime(root: RustNode, uri: string, output: RuntimeOperation[]): void {
  for (const call of descendants(root, 'call_expression')) {
    const api = call.childForFieldName('function')?.text ?? '';
    const kind = runtimeKind(api);
    if (!kind) continue;
    const location = loc(uri, call);
    output.push({ id: `runtime:${kind}:${uri}:${location.startLine}:${location.startColumn}`, kind, api, functionName: enclosingFunctionName(call), instructionIds: [], location, evidence: [{ description: `explicit runtime operation ${api}`, location }] });
  }
  for (const macro of descendants(root, 'macro_invocation')) {
    const api = macro.text.split(/[!(]/)[0].trim();
    if (!/^(?:msg|log|sol_log|sol_log_compute_units)$/.test(api)) continue;
    const location = loc(uri, macro);
    output.push({ id: `runtime:logging:${uri}:${location.startLine}:${location.startColumn}`, kind: 'logging', api, functionName: enclosingFunctionName(macro), instructionIds: [], location, evidence: [{ description: `runtime logging macro ${api}`, location }] });
  }
}

function extractEventsAndErrors(root: RustNode, uri: string, program: ProgramUnit): void {
  const framework = /quasar[-_]lang|quasar-spl|quasar::/.test(root.text) ? 'quasar' : 'anchor';
  for (const struct of descendants(root, 'struct_item')) {
    const attributes = attributesFor(struct);
    if (!/#\[event(?:\s*\]|\s*\()/.test(attributes)) continue;
    const name = nodeText(field(struct, 'name')); const location = loc(uri, struct);
    const customDiscriminator = attributeArgument(attributes, 'event', 'discriminator');
    const discriminator = customDiscriminator ? resolveRustDiscriminator(customDiscriminator)?.value ?? customDiscriminator : framework === 'anchor' ? anchorDiscriminator('event', name) : undefined;
    program.events!.push({ id: `event:${program.name}:${name}`, name, framework, discriminator, location, emissionSites: [], evidence: [{ description: attributes.trim(), location }, ...(discriminator ? [{ description: customDiscriminator ? `${framework} custom event discriminator ${customDiscriminator}` : `Anchor default sha256(event:${name}) discriminator`, location }] : [{ description: `${framework} event discriminator is not explicit in this source file`, location }])] });
  }
  for (const enumeration of descendants(root, 'enum_item')) {
    const attributes = attributesFor(enumeration);
    if (!/#\[error_code\b/.test(attributes)) continue;
    const offsetExpression = attributeArgument(attributes, 'error_code', 'offset');
    const offset = offsetExpression === undefined ? 6000 : /^\d+$/.test(offsetExpression) ? Number(offsetExpression) : undefined;
    let nextCode = 0;
    for (const variant of descendants(enumeration, 'enum_variant')) {
      const name = nodeText(field(variant, 'name')); const location = loc(uri, variant);
      const variantAttributes = attributesFor(variant);
      const explicit = /=\s*(\d+)\b/.exec(variant.text)?.[1]; const localCode = explicit ? Number(explicit) : nextCode; nextCode = localCode + 1;
      program.errors!.push({ id: `error:${program.name}:${name}`, name, code: offset !== undefined ? offset + localCode : undefined, message: /#\[msg\s*\(\s*"([^"]*)"/.exec(variantAttributes)?.[1], framework, location, useSites: [], evidence: [{ description: `#[error_code] enum variant with ${offset !== undefined ? `offset ${offset}` : `unresolved offset ${offsetExpression}`}`, location }] });
    }
  }
  for (const macro of descendants(root, 'macro_invocation')) {
    const text = macro.text; const location = loc(uri, macro);
    if (/^(?:emit|emit_cpi)!/.test(text)) {
      const name = /!\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(text)?.[1];
      const event = program.events!.find(item => item.name === name);
      if (event) event.emissionSites.push(location);
    }
    for (const [prefix, collection] of [['event!', program.events!], ['error!', program.errors!]] as const) {
      if (!text.startsWith(prefix)) continue;
      const name = /!\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(text)?.[1];
      if (!name) continue;
      if (prefix === 'event!') collection.push({ id: `event:${program.name}:${name}`, name, framework: 'steel', location, emissionSites: [], evidence: [{ description: 'Steel event! macro', location }] });
      else {
        const enumeration = descendants(root, 'enum_item').find(item => nodeText(field(item, 'name')) === name);
        if (!enumeration) collection.push({ id: `error:${program.name}:${name}`, name, framework: 'steel', location, useSites: [], evidence: [{ description: 'Steel error! macro with unresolved enum definition', location }] });
        else {
          let nextCode = 0;
          for (const variant of descendants(enumeration, 'enum_variant')) {
            const variantName = nodeText(field(variant, 'name')); const variantLocation = loc(uri, variant); const explicit = /=\s*(\d+)\b/.exec(variant.text)?.[1];
            const code = explicit ? Number(explicit) : nextCode; nextCode = code + 1;
            collection.push({ id: `error:${program.name}:${variantName}`, name: variantName, code, message: /#\[error\s*\(\s*"([^"]*)"/.exec(attributesFor(variant))?.[1], framework: 'steel', location: variantLocation, useSites: [], evidence: [{ description: `Steel error! enum ${name} variant`, location: variantLocation }] });
          }
        }
      }
    }
  }
  program.events = [...new Map(program.events!.map(item => [item.id, item])).values()];
  program.errors = [...new Map(program.errors!.map(item => [item.id, item])).values()];
}

function attributesFor(node: RustNode): string { const attributes: string[] = []; let sibling = node.previousNamedSibling; while (sibling?.type === 'attribute_item') { attributes.unshift(sibling.text); sibling = sibling.previousNamedSibling; } return attributes.join('\n'); }
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
function serializationFor(value: string): string[] { return [...new Set([/Borsh|AnchorSerialize|AnchorDeserialize/.test(value) ? 'borsh' : '', /\bPack\b/.test(value) ? 'pack' : '', /Pod|Zeroable|bytemuck|zero_copy/.test(value) ? 'zero-copy' : '', /serde/.test(value) ? 'serde' : ''].filter(Boolean))]; }
function frameworkFor(value: string): string | undefined { if (/ShankAccount|ShankType/.test(value)) return 'shank'; if (/#\[(?:account|zero_copy)/.test(value)) return 'anchor-or-quasar'; if (/account!/.test(value)) return 'steel'; return undefined; }
function staticSize(types: string[]): number | undefined { let total = 0; for (const type of types) { const size = primitiveSize(type); if (size === undefined) return undefined; total += size; } return total; }
function primitiveSize(type: string): number | undefined { const value = type.trim(); const primitive: Record<string, number> = { bool: 1, u8: 1, i8: 1, u16: 2, i16: 2, u32: 4, i32: 4, f32: 4, u64: 8, i64: 8, f64: 8, u128: 16, i128: 16, Pubkey: 32, Address: 32 }; if (primitive[value] !== undefined) return primitive[value]; const array = /^\[([^;]+);\s*(\d+)\]$/.exec(value); if (array) { const element = primitiveSize(array[1]); return element === undefined ? undefined : element * Number(array[2]); } return undefined; }
function runtimeKind(api: string): string | undefined { const normalized = api.replace(/::<[^>]*>$/, ''); if (/invoke_signed|invoke_with_signers|new_with_signer/.test(normalized)) return 'signed-cpi'; if (/(^|::)invoke$/.test(normalized) || /(?:^|::)cpi::[A-Za-z_][A-Za-z0-9_]*$/.test(normalized)) return 'cpi'; if (/\.(?:realloc|resize)$|^(?:realloc|resize)$/.test(normalized)) return 'realloc'; if (/\.set_inner$/.test(normalized)) return 'state-write'; if (/try_borrow_mut|borrow_mut|set_lamports/.test(normalized)) return 'state-write'; if (/set_return_data|get_return_data/.test(normalized)) return 'return-data'; if (/remaining_compute_units|sol_remaining_compute_units/.test(normalized)) return 'compute-units'; if (/keccak|sha256|hashv?/.test(normalized)) return 'hashing'; if (/curve|is_on_curve|alt_bn128|secp256/.test(normalized)) return 'curve-check'; if (/memcpy|memcmp|memset|memmove/.test(normalized)) return 'memory'; return undefined; }
function enclosingFunctionName(node: RustNode): string | undefined { let parent = node.parent; while (parent) { if (parent.type === 'function_item') return nodeText(field(parent, 'name')); parent = parent.parent; } return undefined; }
function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
