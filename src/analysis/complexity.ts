import { RustNode } from '../parser/rustAst';

export function sourceComplexity(functionNode: RustNode): number {
  const decisions = functionNode.descendantsOfType('if_expression').length
    + functionNode.descendantsOfType('for_expression').length
    + functionNode.descendantsOfType('while_expression').length
    + functionNode.descendantsOfType('loop_expression').length
    + functionNode.descendantsOfType('match_arm').length;
  const booleanOperators = functionNode.descendantsOfType('binary_expression')
    .filter((node: RustNode | null): node is RustNode => node !== null && (node.text.includes('&&') || node.text.includes('||'))).length;
  return 1 + decisions + booleanOperators;
}
