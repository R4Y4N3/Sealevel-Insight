import { AccountInfo, FrameworkEvidence, InstructionInfo } from '../model/report';
import { RustNode, descendants, field, nodeText } from '../parser/rustAst';

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
      if (name) instructions.push({ id: `instruction:${uri}:quasar:${name}:${fn.startPosition.row + 1}`, name, handler: name, functionName: name, location: loc(uri, fn), confidence: 0.9, evidence: [{ description: 'Quasar #[program] handler', location: loc(uri, fn) }] });
    }
  }
  for (const struct of descendants(root, 'struct_item')) {
    const attrs = attributesFor(struct);
    if (!/derive\s*\(\s*Accounts|AccountView|zero_copy/i.test(`${attrs}\n${struct.text}`)) continue;
    for (const fieldNode of descendants(struct, 'field_declaration')) {
      const name = nodeText(field(fieldNode, 'name'));
      const type = nodeText(field(fieldNode, 'type'));
      accounts.push({ id: `account:${uri}:quasar:${fieldNode.startPosition.row + 1}:${name}`, name, type, signer: /signer/i.test(fieldNode.text), writable: /mut|writable/i.test(fieldNode.text), location: loc(uri, fieldNode), confidence: 0.7, evidence: [{ description: 'Quasar account view/Accounts syntax', location: loc(uri, fieldNode) }] });
    }
  }
  return { instructions, accounts };
}

function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
function attributesFor(node: RustNode): string { const items: string[] = []; let sibling = node.previousNamedSibling; while (sibling?.type === 'attribute_item') { items.unshift(sibling.text); sibling = sibling.previousNamedSibling; } return items.join('\n'); }
