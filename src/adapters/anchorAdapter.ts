import { InstructionInfo, AccountInfo, AccountConstraint } from '../model/report';
import { RustNode, descendants, field, nodeText } from '../parser/rustAst';

export function enrichAnchor(root: RustNode, uri: string): { instructions: InstructionInfo[]; accounts: AccountInfo[] } {
  const instructions: InstructionInfo[] = [];
  const accounts: AccountInfo[] = [];
  for (const module of descendants(root, 'mod_item')) {
    if (module.previousNamedSibling?.text !== '#[program]' && !module.text.includes('#[program]')) continue;
    for (const fn of descendants(module, 'function_item')) {
      const name = nodeText(field(fn, 'name'));
      const location = loc(uri, fn);
      instructions.push({ name, location, confidence: 0.95, evidence: [{ description: '#[program] module function', location }], functionName: name });
    }
  }
  for (const struct of descendants(root, 'struct_item')) {
    if (struct.previousNamedSibling?.text !== '#[derive(Accounts)]' && !struct.text.includes('derive(Accounts)')) continue;
    for (const fieldNode of descendants(struct, 'field_declaration')) {
      const type = nodeText(field(fieldNode, 'type'));
      const expression = `${fieldNode.previousNamedSibling?.text ?? ''} ${fieldNode.text}`;
      const constraints: AccountConstraint[] = [];
      for (const kind of ['mut', 'signer', 'seeds', 'bump', 'has_one', 'owner', 'address', 'constraint', 'init_if_needed', 'init', 'close', 'realloc', 'token', 'associated_token']) {
        if (expression.includes(kind)) constraints.push({ kind, expression, location: loc(uri, fieldNode) });
      }
      accounts.push({ name: nodeText(field(fieldNode, 'name')), type, signer: constraints.some(c => c.kind === 'signer') || type.includes('Signer'), writable: constraints.some(c => c.kind === 'mut'), unchecked: type.includes('Unchecked'), constraints, location: loc(uri, fieldNode), confidence: 0.95, evidence: [{ description: '#[derive(Accounts)]' }] });
    }
  }
  return { instructions, accounts };
}

function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
