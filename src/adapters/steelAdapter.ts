import { AccountInfo, FrameworkEvidence, InstructionInfo } from '../model/report';
import { RustNode, descendants, field, nodeText } from '../parser/rustAst';

export function enrichSteel(source: string): FrameworkEvidence[] {
  const evidence = ['steel', 'account!', 'instruction!', 'entrypoint!', 'process_instruction'].filter(pattern => source.includes(pattern));
  return evidence.length && /steel|account!|instruction!/.test(source) ? [{ framework: 'steel', confidence: 0.8, evidence: evidence.map(description => ({ description })) }] : [];
}

export function enrichSteelSemantics(root: RustNode, uri: string): { instructions: InstructionInfo[]; accounts: AccountInfo[] } {
  const instructions: InstructionInfo[] = [];
  for (const macro of descendants(root, 'macro_invocation')) {
    if (!/^instruction!/.test(macro.text)) continue;
    const name = macro.text.replace(/^instruction!\s*\(|\).*$/g, '').trim().split(/[,{\s]/)[0];
    if (name) instructions.push({ id: `instruction:${uri}:steel:${name}:${macro.startPosition.row + 1}`, name, handler: name, location: loc(uri, macro), confidence: 0.82, evidence: [{ description: 'Steel instruction! macro', location: loc(uri, macro) }] });
  }
  return { instructions, accounts: [] };
}

function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }