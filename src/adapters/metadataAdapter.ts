import { AccountInfo, FrameworkEvidence, InstructionInfo } from '../model/report';
import { descendants, field, nodeText, RustNode } from '../parser/rustAst';

export function enrichMetadataFrameworks(root: RustNode, uri: string): { evidence: FrameworkEvidence[]; instructions: InstructionInfo[]; accounts: AccountInfo[] } {
  const evidence: FrameworkEvidence[] = [];
  const instructions: InstructionInfo[] = [];
  const accounts: AccountInfo[] = [];
  if (/\b(?:codama|Codama)\b/.test(root.text)) evidence.push({ framework: 'codama-metadata', confidence: 0.75, evidence: [{ description: 'Codama source metadata/macro evidence' }] });
  if (/\bShank(?:Instruction|Account|Type|Builder)\b/.test(root.text)) evidence.push({ framework: 'shank-metadata', confidence: 0.9, evidence: [{ description: 'Shank derive metadata' }] });
  for (const enumeration of descendants(root, 'enum_item')) {
    if (!/ShankInstruction/.test(attributesFor(enumeration))) continue;
    let nextDiscriminator: number | undefined = 0;
    for (const variant of descendants(enumeration, 'enum_variant')) {
      const name = nodeText(field(variant, 'name')); const location = loc(uri, variant); const contextType = `shank:${name}`;
      const explicit = /=\s*([^,}]+)/.exec(variant.text)?.[1]?.trim(); const explicitNumber = explicit && /^\d+$/.test(explicit) ? Number(explicit) : undefined;
      const discriminator = explicit ?? (nextDiscriminator !== undefined ? String(nextDiscriminator) : undefined);
      nextDiscriminator = explicit ? explicitNumber !== undefined ? explicitNumber + 1 : undefined : nextDiscriminator !== undefined ? nextDiscriminator + 1 : undefined;
      instructions.push({ id: `instruction:${uri}:shank:${name}:${location.startLine}`, name, discriminator, arguments: variantArguments(variant), contextType, location, confidence: 0.92, evidence: [{ description: `#[derive(ShankInstruction)] enum variant${explicit ? ' explicit' : ' implicit'} discriminator${discriminator !== undefined ? ` ${discriminator}` : ''}`, location }] });
      let ordinal = 0;
      for (const attribute of attributesFor(variant).matchAll(/#\[account\s*\(([^\]]*)\)\]/g)) {
        const body = attribute[1]; const index = Number(/^\s*(\d+)/.exec(body)?.[1] ?? ordinal); const accountName = /name\s*=\s*"([^"]+)"/.exec(body)?.[1] ?? `account_${index}`;
        const accountLocation = loc(uri, variant);
        accounts.push({ id: `account:${uri}:shank:${name}:${index}`, name: accountName, type: 'AccountInfo', wrapperType: 'AccountInfo', contextType, ordinal: index, index, signer: /\b(?:signer|sign|sig)\b/.test(body), writable: /\b(?:writable|write|writ|mut)\b/.test(body), optional: /\boptional\b/.test(body), raw: true, location: accountLocation, confidence: 0.9, evidence: [{ description: `Shank account metadata ${body.trim()}`, location: accountLocation }] });
        ordinal++;
      }
    }
  }
  return { evidence, instructions, accounts };
}

function variantArguments(variant: RustNode): Array<{ name: string; type?: string }> {
  const named = descendants(variant, 'field_declaration').map(item => ({ name: nodeText(field(item, 'name')), type: nodeText(field(item, 'type')) })); if (named.length) return named;
  const tuple = descendants(variant, 'ordered_field_declaration_list')[0];
  return (tuple?.namedChildren ?? []).filter((item): item is RustNode => item !== null).map((item, index) => {
    const type = item.text.trim();
    const baseName = /(?:^|::)([A-Za-z_][A-Za-z0-9_]*)\s*(?:<.*>)?$/.exec(type)?.[1];
    return { name: baseName ? baseName[0].toLowerCase() + baseName.slice(1) : `arg${index}`, type };
  });
}
function attributesFor(node: RustNode): string { const values: string[] = []; let sibling = node.previousNamedSibling; while (sibling?.type === 'attribute_item') { values.unshift(sibling.text); sibling = sibling.previousNamedSibling; } return values.join('\n'); }
function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
