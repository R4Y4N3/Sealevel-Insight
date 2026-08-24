import { AccountConstraint, AccountInfo, ProgramUnit } from '../model/report';
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
    if (!/process|entrypoint|dispatch|instruction/.test(functionName)) continue;
    for (const match of descendants(fn, 'match_expression')) {
        if (!/instruction|data|discriminator|unpack|deserialize|try_from/.test(match.text)) continue;
      for (const arm of descendants(match, 'match_arm')) {
        const pattern = nodeText(field(arm, 'pattern')) || arm.namedChildren[0]?.text || '';
        if (!pattern || pattern === '_' || pattern.includes('|')) continue;
        const name = instructionName(pattern);
        const callExpression = descendants(arm, 'call_expression').map(item => item.childForFieldName('function')?.text ?? '').find(item => /^(?:(?:crate|self|super|[A-Za-z_][A-Za-z0-9_]*)::)*[a-z_][A-Za-z0-9_]*$/.test(item) && !/^(?:Some|Ok|Err)$/.test(item));
        const call = callExpression?.split('::').at(-1);
        const location = loc(uri, arm);
        program.instructions.push({ id: `instruction:${uri}:dispatch:${name}:${location.startLine}`, name, handler: call, functionName: call, discriminator: /^\d+$/.test(pattern.trim()) ? pattern.trim() : undefined, location, confidence: call ? 0.88 : 0.72, evidence: [{ description: `native instruction dispatch match arm ${pattern}`, location }] });
      }
    }
    for (const conditional of descendants(fn, 'if_expression')) {
      if (!/try_from_slice|deserialize|unpack/.test(conditional.text) || !(/^if\s+let\s+Ok\b/.test(conditional.text) || /\.is_ok\s*\(\s*\)/.test(conditional.text))) continue;
      const handler = descendants(conditional, 'call_expression').map(item => item.childForFieldName('function')?.text ?? '').map(item => item.split('::').at(-1) ?? '').find(item => /^[a-z_][A-Za-z0-9_]*$/.test(item) && !/^(?:try_from_slice|deserialize|unpack)$/.test(item));
      if (!handler) continue; const location = loc(uri, conditional);
      program.instructions.push({ id: `instruction:${uri}:dispatch:${handler}:${location.startLine}`, name: handler, handler, functionName: handler, location, confidence: 0.86, evidence: [{ description: 'native instruction dispatch through conditional deserialization', location }] });
    }
  }
  program.instructions = [...new Map(program.instructions.map(item => [item.id ?? `${item.name}:${item.location.uri}:${item.location.startLine}`, item])).values()];
}

function extractBindings(fn: RustNode, uri: string, functionName: string): AccountInfo[] {
  const accounts: AccountInfo[] = [];
  let nextOrdinal = 0;
  const accountSlices = new Set(descendants(fn, 'parameter').filter(parameter => /\[\s*(?:AccountInfo|AccountView)(?:\s*<[^>]*>)?\s*\]/.test(parameter.text)).map(parameter => parameter.childForFieldName('pattern')?.text ?? parameter.namedChildren[0]?.text ?? '').filter(Boolean));
  for (const declaration of descendants(fn, 'let_declaration')) {
    const text = declaration.text;
    const next = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*next_account_info\b/.exec(text);
    if (next) accounts.push(account(next[1], nextOrdinal++, declaration, uri, functionName, fn.text, 'next_account_info acquisition'));
    const indexed = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*&?(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*(\d+)\s*\]/.exec(text);
    if (indexed && accountSlices.has(indexed[2])) accounts.push(account(indexed[1], Number(indexed[3]), declaration, uri, functionName, fn.text, 'account slice index acquisition'));
    const get = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*).*?\.get(?:_mut)?\s*\(\s*(\d+)\s*\)/.exec(text);
    if (get && accountSlices.has(get[2])) accounts.push(account(get[1], Number(get[3]), declaration, uri, functionName, fn.text, 'account slice get acquisition'));
    const end = /^\s*let\s+(?:mut\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*).*?\.(first|last)(?:_mut)?\s*\(/.exec(text);
    if (end && accountSlices.has(end[2])) accounts.push(account(end[1], end[3] === 'first' ? 0 : undefined, declaration, uri, functionName, fn.text, `account slice ${end[3]} acquisition`));
    const destructure = /^\s*let\s*\[([^\]]+)\]\s*=\s*([A-Za-z_][A-Za-z0-9_]*)/.exec(text);
    if (destructure && accountSlices.has(destructure[2])) {
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
  const steelChain = [...functionText.matchAll(new RegExp(`\\b${escaped}\\b[\\s\\S]*?(?:;|$)`, 'g'))].map(match => match[0]).join('\n');
  const steelOwner = /\.\s*has_owner\s*\(\s*([^,)]+)/.exec(steelChain);
  const steelAddress = /\.\s*has_address\s*\(\s*([^,)]+)/.exec(steelChain);
  const steelType = /\.\s*is_type\s*::\s*<\s*([^>]+)>\s*\(\s*([^,)]+)/.exec(steelChain);
  const steelSysvar = /\.\s*is_sysvar\s*\(\s*([^,)]+)/.exec(steelChain);
  const steelSeeds = /\.\s*has_seeds\s*\(\s*(&?\s*\[[\s\S]*?\])\s*,\s*([^\)]+)/.exec(steelChain);
  const steelEmpty = /\.\s*is_empty\s*\(/.test(steelChain);
  const signerCheck = new RegExp(`\\b${escaped}\\s*\\.\\s*is_signer(?:\\s*\\(\\s*\\))?`).test(functionText);
  const nativeCreateFrom = new RegExp(`(?:create_account|transfer)\\s*\\(\\s*&?\\*?${escaped}\\.key\\b`).test(functionText);
  const nativeCreateTo = new RegExp(`create_account\\s*\\(\\s*[^,]+,\\s*&?\\*?${escaped}\\.key\\b`).test(functionText);
  const cpiFromSigner = new RegExp(`\\bfrom\\s*:\\s*${escaped}\\b`).test(functionText) || nativeCreateFrom;
  const accountMetaSigner = new RegExp(`AccountMeta::new\\s*\\(\\s*\\*?${escaped}(?:\\.key|\\.address\\(\\))?\\s*,\\s*true\\s*\\)`).test(functionText);
  const signer = signerCheck || cpiFromSigner || accountMetaSigner;
  const writableCheck = new RegExp(`\\b${escaped}\\s*\\.\\s*is_writable(?:\\s*\\(\\s*\\))?`).test(functionText);
  const executable = new RegExp(`\\b${escaped}\\s*\\.\\s*(?:executable|is_executable\\s*\\(\\s*\\))`).test(functionText);
  const steelAccount = new RegExp(`\\b${escaped}\\s*\\.\\s*as_account(_mut)?\\s*::\\s*<\\s*([^>]+)>\\s*\\(\\s*([^,)]+)`).exec(functionText);
  const steelProgram = new RegExp(`\\b${escaped}\\s*\\.\\s*is_program\\s*\\(\\s*([^,)]+)`).exec(functionText);
  const steelToken = new RegExp(`\\b${escaped}\\s*\\.\\s*as_(mint|token_account)\\s*\\(`).exec(functionText);
  const ownerExpectation = new RegExp(`\\b${escaped}\\s*\\.\\s*owner(?:\\s*\\(\\s*\\))?\\s*(?:==|!=)\\s*([^;{}]+)`).exec(functionText)?.[1]?.trim() ?? new RegExp(`\\b${escaped}\\s*\\.\\s*owned_by\\s*\\(\\s*([^)]*(?:\\([^)]*\\)[^)]*)?)\\)`).exec(functionText)?.[1]?.trim() ?? steelAccount?.[3]?.trim() ?? (steelToken ? 'spl-token-or-token-2022' : undefined);
  const addressExpectation = new RegExp(`\\b${escaped}\\s*\\.\\s*(?:key|address)(?:\\s*\\(\\s*\\))?\\s*(?:==|!=)\\s*([^;{}]+)`).exec(functionText)?.[1]?.trim() ?? steelProgram?.[1]?.trim();
  const member = `\\b${escaped}\\s*\\.\\s*`;
  const dataRead = new RegExp(`${member}(?:try_borrow(?:_data)?|borrow_unchecked|data_ptr|account_ptr|borrow_state|data\\s*\\.\\s*borrow|as_account(?:\\s*::|\\s*<)|as_mint|as_token_account)`).test(functionText);
  const dataWrite = new RegExp(`${member}(?:try_borrow_mut(?:_data)?|borrow_unchecked_mut|data_mut_ptr|account_mut_ptr|borrow_mut_state|data\\s*\\.\\s*borrow_mut|as_account_mut)`).test(functionText) || steelAccount?.[1] === '_mut';
  const lamportRead = new RegExp(`${member}(?:lamports\\s*\\(|try_borrow_lamports)`).test(functionText);
  const lamportWrite = new RegExp(`${member}(?:try_borrow_mut_lamports|set_lamports)`).test(functionText);
  const realloc = new RegExp(`${member}(?:realloc|resize|UnsafeResize)`).test(functionText);
  const close = new RegExp(`${member}(?:close(?:_unchecked)?|set_lamports\\s*\\(\\s*0)`).test(functionText);
  const cpiWritable = nativeCreateFrom || nativeCreateTo || new RegExp(`\\b(?:from|to)\\s*:\\s*${escaped}\\b`).test(functionText) || new RegExp(`(?:AccountMeta::new|InstructionAccount::writable)\\s*\\(\\s*\\*?${escaped}(?:\\.key|\\.address\\(\\))?`).test(functionText);
  const ownerChange = new RegExp(`${member}(?:assign|set_owner)\\s*\\(`).test(functionText);
  const writable = writableCheck || dataWrite || lamportWrite || realloc || close || ownerChange || cpiWritable;
  const location = loc(uri, node);
  const steelCreateTarget = new RegExp(`\\b(?:create_program_account|create_program_account_with_bump|allocate_account|allocate_account_with_bump)\\s*(?:::\\s*<[^>]+>)?\\s*\\(\\s*&?${escaped}\\b`).test(functionText);
  const steelCreatePayer = new RegExp(`\\b(?:create_program_account|create_program_account_with_bump|allocate_account|allocate_account_with_bump)\\s*(?:::\\s*<[^>]+>)?\\s*\\(\\s*[^,]+,\\s*[^,]+,\\s*&?${escaped}\\b`).test(functionText);
  const steelLamportWrite = new RegExp(`\\b${escaped}\\s*\\.\\s*(?:send|collect)\\s*\\(`).test(functionText) || new RegExp(`\\.(?:send|collect|close)\\s*\\([^,]*,?\\s*&?${escaped}\\b`).test(functionText);
  const effectiveWritable = writable || /\.\s*is_writable\s*\(/.test(steelChain) || steelCreateTarget || steelCreatePayer || steelLamportWrite;
  const effectiveSigner = signer || /\.\s*is_signer\s*\(/.test(steelChain) || steelCreatePayer;
  const effectiveExecutable = executable || !!steelProgram || /\.\s*(?:is_executable|is_program)\s*\(/.test(steelChain);
  const effectiveOwnerExpectation = ownerExpectation ?? steelOwner?.[1]?.trim() ?? steelType?.[2]?.trim() ?? (steelSysvar ? 'solana_program::sysvar::ID' : undefined);
  const effectiveAddressExpectation = addressExpectation ?? steelAddress?.[1]?.trim() ?? steelSysvar?.[1]?.trim();
  const constraints: AccountConstraint[] = [
    ...(steelEmpty ? [{ kind: 'uninitialized', location }] : []), ...(steelOwner ? [{ kind: 'owner', expression: steelOwner[1].trim(), location }] : []),
    ...(steelAddress ? [{ kind: 'address', expression: steelAddress[1].trim(), location }] : []), ...(steelType ? [{ kind: 'type', expression: steelType[1].trim(), location }] : []),
    ...(steelProgram ? [{ kind: 'program', expression: steelProgram[1].trim(), location }] : []), ...(steelSysvar ? [{ kind: 'sysvar', expression: steelSysvar[1].trim(), location }] : []),
    ...(steelSeeds ? [{ kind: 'seeds', expression: steelSeeds[1].trim(), location }] : [])
  ];
  return {
    id: `account:${uri}:${functionName}:${name}:${location.startLine}`, name, type: /AccountView/.test(functionText) ? 'AccountView' : 'AccountInfo', wrapperType: /AccountView/.test(functionText) ? 'AccountView' : 'AccountInfo', stateType: steelAccount?.[2]?.trim() ?? steelType?.[1]?.trim() ?? (steelToken?.[1] === 'mint' ? 'Mint' : steelToken ? 'TokenAccount' : undefined),
    ordinal: index, index, signer: effectiveSigner, writable: effectiveWritable, executable: effectiveExecutable, raw: true, ownerExpectation: effectiveOwnerExpectation, addressExpectation: effectiveAddressExpectation, ownerValidated: !!effectiveOwnerExpectation, addressValidated: !!effectiveAddressExpectation,
    dataAccess: [...(dataRead ? ['read' as const] : []), ...(dataWrite ? ['write' as const] : [])], lamportAccess: [...(lamportRead ? ['read' as const] : []), ...(lamportWrite || steelLamportWrite ? ['write' as const] : [])],
    lifecycle: [...(steelCreateTarget ? ['init' as const, 'create' as const] : []), ...(dataWrite || effectiveWritable ? ['write' as const] : ['read' as const]), ...(realloc ? ['realloc' as const] : []), ...(close ? ['close' as const] : []), ...(lamportWrite || steelLamportWrite ? ['lamport-transfer' as const] : [])], constraints,
    serialization: [/borsh|try_from_slice|deserialize/i.test(functionText) ? 'borsh' : '', /Pack::unpack|unpack_from_slice/.test(functionText) ? 'pack' : '', /bytemuck|Pod|try_from_bytes/.test(functionText) ? 'zero-copy' : ''].filter(Boolean),
    location, confidence: 0.88, evidence: [{ description, location }, ...(signerCheck ? [{ description: `actual signer validation for ${name}`, location }] : []), ...(!signerCheck && signer ? [{ description: `CPI signer requirement for ${name}`, location }] : []), ...(writableCheck ? [{ description: `actual writable validation for ${name}`, location }] : []), ...(!writableCheck && writable ? [{ description: `evidence-backed writable access for ${name}`, location }] : []), ...(steelAccount ? [{ description: `Steel typed account validation as ${steelAccount[2].trim()}`, location }] : []), ...(steelToken ? [{ description: `Steel ${steelToken[1]} validation`, location }] : []), ...(ownerExpectation ? [{ description: `owner validation against ${ownerExpectation}`, location }] : []), ...(addressExpectation ? [{ description: `address validation against ${addressExpectation}`, location }] : [])]
  };
}

function instructionName(pattern: string): string { const numeric = /(?:^|[({,]\s*)(\d+)\s*(?:[,)}]|$)/.exec(pattern)?.[1]; if (numeric !== undefined) return `discriminator_${numeric}`; const constant = /\bIX_([A-Z][A-Z0-9_]*)\b/.exec(pattern)?.[1]; if (constant) return constant.toLowerCase(); const trimmed = pattern.trim().replace(/\([^)]*\)|\{[^}]*\}/g, ''); return trimmed.split('::').at(-1)?.replace(/[^A-Za-z0-9_]/g, '') || 'unknown'; }
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function loc(uri: string, node: RustNode) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
