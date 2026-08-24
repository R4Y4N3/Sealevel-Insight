import { Node } from 'web-tree-sitter';

export type RustNode = Node;

export function descendants(node: RustNode, type: string | string[]): RustNode[] {
  return node.descendantsOfType(type).filter((child): child is RustNode => child !== null);
}

export function nodeText(node: RustNode | undefined): string {
  return node?.text ?? '';
}

export function field(node: RustNode, name: string): RustNode | undefined {
  return node.childForFieldName(name) ?? undefined;
}
