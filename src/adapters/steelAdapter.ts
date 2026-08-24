import { AccountInfo, FrameworkEvidence, InstructionInfo } from '../model/report';
import { RustNode, descendants } from '../parser/rustAst';

export function enrichSteel(source: string): FrameworkEvidence[] {
  const evidence = ['steel', 'account!', 'instruction!', 'entrypoint!', 'process_instruction'].filter(pattern => source.includes(pattern));
  return evidence.length && /steel|account!|instruction!/.test(source) ? [{ framework: 'steel', confidence: 0.8, evidence: evidence.map(description => ({ description })) }] : [];
}

export function enrichSteelSemantics(root: RustNode, uri: string): { instructions: InstructionInfo[]; accounts: AccountInfo[] } {
  const instructions: InstructionInfo[] = [];
  const accounts: AccountInfo[] = [];
  for (const macro of descendants(root, 'macro_invocation')) {
    if (/^instruction!/.test(macro.text)) {
      const parts = macro.text.replace(/^instruction!\s*\(|\)\s*;?$/g, '').split(',').map(item => item.trim());
      const name = parts[1] ?? parts[0];
      if (name) instructions.push({ id: `instruction:${uri}:steel:${name}:${macro.startPosition.row + 1}`, name, location: loc(uri, macro), confidence: 0.88, evidence: [{ description: `Steel instruction! metadata${parts[0] ? ` for ${parts[0]}` : ''}`, location: loc(uri, macro) }] });
    }
    if (/^account!/.test(macro.text)) {
      const parts = macro.text.replace(/^account!\s*\(|\)\s*;?$/g, '').split(',').map(item => item.trim());
      const name = parts[1] ?? parts[0];
      if (name) accounts.push({ id: `account:${uri}:steel:${name}:${macro.startPosition.row + 1}`, name, type: name, wrapperType: 'SteelAccount', stateType: name, serialization: ['zero-copy'], location: loc(uri, macro), confidence: 0.88, evidence: [{ description: `Steel account! metadata${parts[0] ? ` for ${parts[0]}` : ''}`, location: loc(uri, macro) }] });
    }
  }
  return { instructions, accounts };
}

function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
