import { AccountInfo, FrameworkEvidence, InstructionInfo } from '../model/report';
import { RustNode, descendants } from '../parser/rustAst';
import { splitRustExpressions } from '../utils/text';

export function enrichSteel(source: string): FrameworkEvidence[] {
  const evidence = ['steel', 'account!', 'instruction!', 'entrypoint!', 'process_instruction'].filter(pattern => source.includes(pattern));
  return evidence.length && /steel|account!|instruction!/.test(source) ? [{ framework: 'steel', confidence: 0.8, evidence: evidence.map(description => ({ description })) }] : [];
}

export function enrichSteelSemantics(root: RustNode, uri: string): { instructions: InstructionInfo[]; accounts: AccountInfo[] } {
  const instructions: InstructionInfo[] = [];
  const accounts: AccountInfo[] = [];
  for (const macro of descendants(root, 'macro_invocation')) {
    if (/^instruction!/.test(macro.text)) {
      const parts = macroArguments(macro.text);
      const name = parts[1] ?? parts[0];
      const discriminator = parts[0] && name ? enumDiscriminator(root, parts[0], name) : undefined;
      const arguments_ = name ? structArguments(root, name) : [];
      if (name) instructions.push({ id: `instruction:${uri}:steel:${name}:${macro.startPosition.row + 1}`, name, contextType: parts[0], discriminator, arguments: arguments_, location: loc(uri, macro), confidence: 0.92, evidence: [{ description: `Steel instruction! metadata${parts[0] ? ` for ${parts[0]}` : ''}`, location: loc(uri, macro) }] });
    }
    if (/^account!/.test(macro.text)) {
      const parts = macroArguments(macro.text);
      const name = parts[1] ?? parts[0];
      const discriminator = parts[0] && name ? enumDiscriminator(root, parts[0], name) : undefined;
      if (name) accounts.push({ id: `account:${uri}:steel:${name}:${macro.startPosition.row + 1}`, name, type: name, wrapperType: 'SteelAccount', stateType: name, serialization: ['zero-copy'], constraints: discriminator ? [{ kind: 'discriminator', expression: discriminator, location: loc(uri, macro) }] : [], location: loc(uri, macro), confidence: 0.92, evidence: [{ description: `Steel account! metadata${parts[0] ? ` for ${parts[0]}` : ''}`, location: loc(uri, macro) }] });
    }
  }
  return { instructions, accounts };
}

function macroArguments(text: string): string[] { const open = text.indexOf('('); const close = text.lastIndexOf(')'); return open >= 0 && close > open ? splitRustExpressions(text.slice(open + 1, close)).map(item => item.trim()).filter(Boolean) : []; }
function enumDiscriminator(root: RustNode, enumName: string, variantName: string): string | undefined {
  const enumeration = descendants(root, 'enum_item').find(item => item.childForFieldName('name')?.text === enumName);
  const variant = enumeration && descendants(enumeration, 'enum_variant').find(item => item.childForFieldName('name')?.text === variantName);
  return variant ? /=\s*([^,}]+)/.exec(variant.text)?.[1]?.trim() : undefined;
}
function structArguments(root: RustNode, name: string): Array<{ name: string; type?: string }> {
  const struct = descendants(root, 'struct_item').find(item => item.childForFieldName('name')?.text === name);
  return struct ? descendants(struct, 'field_declaration').map(item => ({ name: item.childForFieldName('name')?.text ?? 'field', type: item.childForFieldName('type')?.text })) : [];
}

function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
