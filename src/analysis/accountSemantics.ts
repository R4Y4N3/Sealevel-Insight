import { AccountInfo, ProgramUnit } from '../model/report';
import { descendants, field, nodeText, RustNode } from '../parser/rustAst';
import { splitRustExpressions } from '../utils/text';

export function enrichNativeAccountSemantics(root: RustNode, uri: string, program: ProgramUnit): void {
  extractNativeDispatch(root, uri, program);
  for (const fn of descendants(root, 'function_item')) {
    const functionName = nodeText(field(fn, 'name'));
    if (!/AccountInfo|AccountView|accounts|next_account_info/.test(fn.text)) continue;
    const accounts = extractBindings(fn, uri, functionName);
    program.accounts.push(...accounts);
    const instruction = program.instructions.find(item => item.functionName === functionName || item.handler === functionName || item.name === functionName);
    if (instruction) {
      program.relationships ??= [];
      for (const account of accounts) program.relationships.push({ instructionId: instruction.id ?? instruction.name, accountId: account.id!, relationship: account.signer ? 'signer' : account.writable ? 'writes' : account.unchecked || account.raw ? 'unchecked' : 'reads' });
    }
  }
}

function extractNativeDispatch(root: RustNode, uri: string, program: ProgramUnit): void {
  for (const fn of descendants(root, 'function_item')) {
    const functionName = nodeText(field(fn, 'name'));
    if (!/process|entrypoint|dispatch|instruction/.test(functionName) && !/instruction_data|data\s*\[\s*0\s*\]/.test(fn.text)) continue;
    for (const match of descendants(fn, 'match_expression')) {
      if (!/instruction|data|discriminator|unpack|deserialize|try_from/.test(match.text)) continue;
      for (const arm of descendants(match, 'match_arm')) {
        const pattern = nodeText(field(arm, 'pattern')) || arm.namedChildren[0]?.text || '';
        if (!pattern || pattern === '_' || pattern.includes('|')) continue;
        const name = instructionName(pattern);
        const call = descendants(arm, 'call_expression').map(item => item.childForFieldName('function')?.text ?? '').find(item => /^[A-Za-z_][A-Za-z0-9_]*$/.test(item));
        const location = loc(uri, arm);
        program.instructions.push({ id: `instruction:${uri}:dispatch:${name}:${location.startLine}`, name, handler: call, functionName: call, discriminator: /^\d+$/.test(pattern.trim()) ? pattern.trim() : undefined, location, confidence: call ? 0.88 : 0.72, evidence: [{ description: `native instruction dispatch match arm ${pattern}`, location }] });
      }
    }
  }
  program.instructions = [...new Map(program.instructions.map(item => [item.id ?? `${item.name}:${item.location.uri}:${item.location.startLine}`, item])).values()];
}

function extractBindings(fn: RustNode, uri: string, functionName: string): AccountInfo[] {
  const accounts: AccountInfo[] = [];
  for (const declaration of descendants(fn, 'let_declaration')) {
    const text = declaration.text;
    const next = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*next_account_info\b/.exec(text);
    if (next) accounts.push(account(next[1], undefined, declaration, uri, functionName, text, 'next_account_info acquisition'));
    const indexed = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*&?(?:mut\s+)?[A-Za-z_][A-Za-z0-9_]*\s*\[\s*(\d+)\s*\]/.exec(text);
    if (indexed) accounts.push(account(indexed[1], Number(indexed[2]), declaration, uri, functionName, fn.text, 'account slice index acquisition'));
    const get = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=.*?\.get(?:_mut)?\s*\(\s*(\d+)\s*\)/.exec(text);
    if (get) accounts.push(account(get[1], Number(get[2]), declaration, uri, functionName, fn.text, 'account slice get acquisition'));
    const end = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=.*?\.(first|last)(?:_mut)?\s*\(/.exec(text);
    if (end) accounts.push(account(end[1], end[2] === 'first' ? 0 : undefined, declaration, uri, functionName, fn.text, `account slice ${end[2]} acquisition`));
    const destructure = /^\s*let\s*\[([^\]]+)\]\s*=\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
    if (destructure) {
      let ordinal = 0;
      for (const binding of splitRustExpressions(destructure[1])) {
        const name = binding.replace(/^(?:ref\s+)?(?:mut\s+)?/, '').trim();
        if (name === '..' || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
        accounts.push(account(name, ordinal++, declaration, uri, functionName, fn.text, `account slice destructuring from ${destructure[2]}`));
      }
    }
  }
  return [...new Map(accounts.map(item => [item.id, item])).values()];
}

function account(name: string, index: number | undefined, node: RustNode, uri: string, functionName: string, functionText: string, description: string): AccountInfo {
  const escaped = escapeRegex(name);
  const signer = new RegExp(`\\b${escaped}\\s*\\.\\s*is_signer(?:\\s*\\(\\s*\\))?`).test(functionText);
  const writable = new RegExp(`\\b${escaped}\\s*\\.\\s*is_writable(?:\\s*\\(\\s*\\))?`).test(functionText);
  const executable = new RegExp(`\\b${escaped}\\s*\\.\\s*(?:executable|is_executable\\s*\\(\\s*\\))`).test(functionText);
  const ownerExpectation = new RegExp(`(?:${escaped}\\.owner\\(\\)|${escaped}\\.owner)\\s*(?:==|!=)\\s*([^;&|,){}]+)`).exec(functionText)?.[1]?.trim();
  const addressExpectation = new RegExp(`(?:${escaped}\\.key\\(\\)|${escaped}\\.key|${escaped}\\.address\\(\\))\\s*(?:==|!=)\\s*([^;&|,){}]+)`).exec(functionText)?.[1]?.trim();
  const member = `\\b${escaped}\\s*\\.\\s*`;
  const dataRead = new RegExp(`${member}(?:try_borrow_data|borrow_state|data\\s*\\.\\s*borrow)`).test(functionText);
  const dataWrite = new RegExp(`${member}(?:try_borrow_mut_data|borrow_mut_state|data\\s*\\.\\s*borrow_mut)`).test(functionText);
  const lamportRead = new RegExp(`${member}(?:lamports\\s*\\(|try_borrow_lamports)`).test(functionText);
  const lamportWrite = new RegExp(`${member}(?:try_borrow_mut_lamports|set_lamports)`).test(functionText);
  const realloc = new RegExp(`${member}(?:realloc|resize|UnsafeResize)`).test(functionText);
  const close = new RegExp(`${member}(?:close|set_lamports\\s*\\(\\s*0)`).test(functionText);
  const location = loc(uri, node);
  return {
    id: `account:${uri}:${functionName}:${name}:${location.startLine}`, name, type: /AccountView/.test(functionText) ? 'AccountView' : 'AccountInfo', wrapperType: /AccountView/.test(functionText) ? 'AccountView' : 'AccountInfo',
    ordinal: index, index, signer, writable, executable, raw: true, ownerExpectation, addressExpectation,
    dataAccess: [...(dataRead ? ['read' as const] : []), ...(dataWrite ? ['write' as const] : [])], lamportAccess: [...(lamportRead ? ['read' as const] : []), ...(lamportWrite ? ['write' as const] : [])],
    lifecycle: [...(dataWrite || writable ? ['write' as const] : ['read' as const]), ...(realloc ? ['realloc' as const] : []), ...(close ? ['close' as const] : []), ...(lamportWrite ? ['lamport-transfer' as const] : [])],
    serialization: [/borsh|try_from_slice|deserialize/i.test(functionText) ? 'borsh' : '', /Pack::unpack|unpack_from_slice/.test(functionText) ? 'pack' : '', /bytemuck|Pod|try_from_bytes/.test(functionText) ? 'zero-copy' : ''].filter(Boolean),
    location, confidence: 0.88, evidence: [{ description, location }, ...(signer ? [{ description: `actual signer validation for ${name}`, location }] : []), ...(writable ? [{ description: `actual writable validation for ${name}`, location }] : []), ...(ownerExpectation ? [{ description: `owner validation against ${ownerExpectation}`, location }] : []), ...(addressExpectation ? [{ description: `address validation against ${addressExpectation}`, location }] : [])]
  };
}

function instructionName(pattern: string): string { const trimmed = pattern.trim().replace(/\([^)]*\)|\{[^}]*\}/g, ''); if (/^\d+$/.test(trimmed)) return `discriminator_${trimmed}`; return trimmed.split('::').at(-1)?.replace(/[^A-Za-z0-9_]/g, '') || 'unknown'; }
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
