import { Node } from 'web-tree-sitter';
import { AccountInfo, CallSite, CpiOperationCategory, CpiSite, Evidence, FileMetric, ProgramUnit } from '../model/report';
import { parseSolidity } from '../parser/solidityParser';
import { createSourceProgram, offsetLocation, simpleCallGraph, stableId, textFileMetric } from './frontendCommon';

export interface SourceFrontendInput { uri: string; source: string; packageName?: string; manifestUri?: string; packageEvidence?: Evidence[]; }
export interface FrontendResult { programs: ProgramUnit[]; file: FileMetric; diagnostics: string[]; }

const solanaEvidence = /(?:import\s+["']solana["']|@program_id\s*\(|@(payer|seed|bump|space|account|mutableAccount|signer|mutableSigner)\b|\btx\.accounts\b|\bAccountMeta\b|\bSplToken\b)/;
const SOLANG_SPL_TOKEN_CPIS: Record<string, { operation: string; category: CpiOperationCategory }> = {
  mint_to: { operation: 'mint_to', category: 'token-mint' },
  transfer: { operation: 'transfer', category: 'token-transfer' },
  burn: { operation: 'burn', category: 'token-burn' },
  approve: { operation: 'approve', category: 'authority-change' },
  revoke: { operation: 'revoke', category: 'authority-change' },
  remove_mint_authority: { operation: 'set_authority', category: 'authority-change' }
};
const SOLANG_SPL_TOKEN_READ_HELPERS = new Set(['total_supply', 'get_balance', 'get_account_info', 'get_token_account_data', 'get_mint_account_data']);

export async function analyzeSolang(input: SourceFrontendInput, wasmPath: string | undefined, runtimeWasmPath?: string): Promise<FrontendResult> {
  if (!wasmPath) return { programs: [], file: textFileMetric(input.uri, input.source, 'solang-solidity', { parseError: 'Solidity parser was not configured.' }), diagnostics: [`${input.uri}: Solidity parser was not configured.`] };
  const parsed = await parseSolidity(input.uri, input.source, wasmPath, runtimeWasmPath);
  const contracts = nonNull(parsed.tree?.rootNode.descendantsOfType('contract_declaration') ?? []);
  const file = textFileMetric(input.uri, input.source, 'solang-solidity', {
    functions: nonNull(parsed.tree?.rootNode.descendantsOfType(['function_definition', 'constructor_definition']) ?? []).length,
    structs: parsed.tree?.rootNode.descendantsOfType('struct_declaration').length ?? 0,
    enums: parsed.tree?.rootNode.descendantsOfType('enum_declaration').length ?? 0,
    functionCalls: parsed.tree?.rootNode.descendantsOfType('call_expression').length ?? 0,
    parseError: parsed.error
  });
  if (!solanaEvidence.test(stripSolidityComments(input.source))) return { programs: [], file, diagnostics: [`${input.uri}: Solidity source has no Solang/Solana evidence; metrics recorded without creating a Solana program.`] };
  if (!parsed.tree) return { programs: [], file, diagnostics: [`${input.uri}: ${parsed.error ?? 'Solidity parsing failed.'}`] };
  if (!contracts.length) return { programs: [], file, diagnostics: [`${input.uri}: Solang/Solana evidence was detected, but no structurally parsed contract declaration was found.`] };
  const programs = contracts.map((contract, index) => contractProgram(input, contract, file, contracts.length > 1 ? index : undefined));
  return { programs, file, diagnostics: parsed.error ? [`${input.uri}: ${parsed.error}`] : [] };
}

function contractProgram(input: SourceFrontendInput, contract: Node, metric: FileMetric, duplicateIndex?: number): ProgramUnit {
  const nameNode = contract.childForFieldName('name'); const contractName = nameNode?.text ?? `contract-${(duplicateIndex ?? 0) + 1}`;
  const program = createSourceProgram(duplicateIndex === undefined ? contractName : `${input.packageName ?? 'solang'}:${contractName}`, 'solang-solidity', input.manifestUri, 'solana-program', input.packageEvidence);
  program.sourceFiles!.push(metric);
  const contractLoc = nodeLocation(input.uri, contract);
  program.frameworkEvidence.push({ framework: 'solang', confidence: 0.98, location: contractLoc, evidence: [{ description: 'Solang-specific Solana annotations or APIs detected', location: contractLoc }] });
  const contractAnnotations = annotationsBefore(input.source, contract.startIndex);
  const programId = annotationValues(contractAnnotations, 'program_id')[0]?.replace(/^['"]|['"]$/g, '');
  if (programId) program.identity = { programId, sources: [{ description: 'Solang @program_id annotation', location: contractLoc }], conflicts: [] };
  const functions = nonNull(contract.descendantsOfType(['function_definition', 'constructor_definition'])).filter(node => nearestContract(node)?.startIndex === contract.startIndex);
  const calls: CallSite[] = [];
  for (const node of functions) {
    const constructor = node.type === 'constructor_definition'; const name = constructor ? 'new' : node.childForFieldName('name')?.text ?? 'anonymous';
    const location = nodeLocation(input.uri, node); const text = node.text; const children = nonNull(node.namedChildren); const visibility = children.find(child => child.type === 'visibility')?.text ?? /\b(external|public|internal|private)\b/.exec(text)?.[1] ?? (constructor ? 'public' : 'internal');
    const parameterNodes = children.filter(child => child.type === 'parameter'); const astParameters = parameterNodes.map((parameter, index) => ({ name: parameter.childForFieldName('name')?.text ?? `argument${index + 1}`, type: parameter.childForFieldName('type')?.text ?? parameter.namedChildren[0]?.text })); const parsedParameters = parseSolangParameters(text); const parameterItems = parsedParameters.parameters.length || parsedParameters.signatureFound ? parsedParameters.parameters : astParameters; const parameters = parameterItems.length; const returnType = node.childForFieldName('return_type')?.text ?? /\breturns\s*\(([^)]*)\)/.exec(text)?.[1]?.trim();
    const qualifiedName = `${contractName}::${name}`;
    const complexity = 1 + node.descendantsOfType(['if_statement', 'for_statement', 'while_statement', 'do_while_statement', 'try_statement', 'conditional_expression']).length;
    const lines = location.endLine - location.startLine + 1;
    program.functions.push({ name, qualifiedName, location, lines, codeLines: lines, complexity, parameters, returnType, isPublic: constructor || visibility === 'public' || visibility === 'external', visibility, isUnsafe: false, program: program.name });
    const annotations = annotationsBefore(input.source, node.startIndex);
    const contextType = `${contractName}::${name}`;
    const accounts = parseAccounts(input, annotations, contextType, program.accounts.length);
    const pdaSeeds = constructor ? [...new Set([...annotationValues(annotations, 'seed'), ...parsedParameters.seedParameters])] : annotationValues(annotations, 'seed');
    const pdaBump = annotationValues(annotations, 'bump')[0] ?? (constructor ? parsedParameters.bumpParameter : undefined);
    if (constructor && annotationValues(annotations, 'payer').length) addConstructorAccountsAndCpi(program, input, annotations, contextType, name, location, accounts, pdaSeeds);
    program.accounts.push(...accounts); program.securitySurface.signerSignals += accounts.filter(account => account.signer).length; program.securitySurface.writableSignals += accounts.filter(account => account.writable).length;
    if (constructor || visibility === 'public' || visibility === 'external') {
      const selector = annotationValues(annotations, 'selector')[0];
      program.instructions.push({ id: stableId('instruction', input.uri, location.startLine, name), name, functionName: name, handler: qualifiedName, contextType, discriminator: selector, arguments: parameterItems, returns: returnType, location, confidence: 0.96, evidence: [{ description: constructor ? 'Solang constructor is externally reachable' : `Solang ${visibility} function is externally reachable`, location }] });
    }
    addPdaEvidence(program, input, pdaSeeds, pdaBump, name, location, accounts);
    const bodyCalls = nonNull(node.descendantsOfType('call_expression'));
    for (const call of bodyCalls) analyzeCall(program, input, qualifiedName, name, call, calls);
  }
  const names = new Set(program.functions.map(fn => fn.qualifiedName!));
  for (const call of calls) if (call.status === 'unresolved' && names.has(`${contractName}::${call.callee}`)) { call.status = 'resolved'; call.resolved = true; call.target = `${contractName}::${call.callee}`; call.candidateTargets = [call.target]; call.confidence = 0.95; call.resolutionReason = 'direct call to a function in the same Solang contract'; }
  program.callGraph = simpleCallGraph(program.functions.map(fn => fn.qualifiedName!), calls);
  const stateVariables = nonNull(contract.descendantsOfType('state_variable_declaration')).filter(node => nearestContract(node)?.startIndex === contract.startIndex);
  if (stateVariables.length) {
    const fields = stateVariables.map(node => ({ name: node.childForFieldName('name')?.text ?? /([A-Za-z_]\w*)\s*(?:=|;)/.exec(node.text)?.[1] ?? 'field', type: node.childForFieldName('type')?.text ?? node.namedChildren[0]?.text ?? 'unknown', visibility: /\b(public|private|internal)\b/.exec(node.text)?.[1] }));
    const constructorNode = functions.find(node => node.type === 'constructor_definition'); const constructorAnnotations = constructorNode ? annotationsBefore(input.source, constructorNode.startIndex) : '';
    const stateId = stableId('state', input.uri, contractLoc.startLine, contractName);
    program.stateTypes = [{ id: stateId, name: contractName, package: program.name, framework: 'solang', fields, visibility: 'contract', serialization: ['Solang storage layout'], zeroCopy: false, declaredSpace: annotationValues(constructorAnnotations, 'space')[0], dynamicSize: fields.some(item => /\b(mapping|string|bytes)\b|\[\s*\]/.test(item.type)), pdaIds: program.securitySurface.pdaSites.map(item => item.id!).filter(Boolean), initializationSites: program.instructions.filter(item => item.name === 'new').map(item => item.id!).filter(Boolean), reallocSites: [], closeSites: [], evidence: [{ description: 'Solang contract storage variables', location: contractLoc }], location: contractLoc }];
    for (const fn of program.functions) { const owner = functions.find(node => node.startPosition.row + 1 === fn.location.startLine); if (owner && fields.some(item => new RegExp(`\\b${escapeRegex(item.name)}\\b`).test(owner.text))) fn.stateAccess = [contractName]; }
  }
  program.events = nonNull(contract.descendantsOfType('event_definition')).map(node => { const name = node.childForFieldName('name')?.text ?? /event\s+(\w+)/.exec(node.text)?.[1] ?? 'event'; const location = nodeLocation(input.uri, node); return { id: stableId('event', input.uri, location.startLine, name), name, framework: 'solang', location, emissionSites: nonNull(contract.descendantsOfType('emit_statement')).filter(emit => emit.text.includes(name)).map(emit => nodeLocation(input.uri, emit)), evidence: [{ description: 'Solidity event declaration', location }] }; });
  return program;
}

function analyzeCall(program: ProgramUnit, input: SourceFrontendInput, caller: string, functionName: string, node: Node, calls: CallSite[]): void {
  const location = nodeLocation(input.uri, node); const expression = node.childForFieldName('function')?.text ?? node.namedChildren[0]?.text ?? node.text; const plain = /^([A-Za-z_]\w*)/.exec(expression)?.[1] ?? expression;
  if (/^(require|assert|revert|keccak256|sha256|ripemd160|ecrecover)$/.test(plain)) return;
  const member = /([A-Za-z_]\w*)\.([A-Za-z_]\w*)/.exec(expression); const spl = member?.[1] === 'SplToken';
  const splCpi = spl && member ? SOLANG_SPL_TOKEN_CPIS[member[2]] : undefined;
  if (member && (splCpi || !spl && /\{\s*(?:accounts|program_id|seeds)\s*:/.test(expression))) {
    const operation = splCpi?.operation ?? member[2]; const args = callArguments(node.text); const category = splCpi?.category ?? cpiCategory(operation); const signed = /\bseeds\s*:/.test(expression);
    const cpi: CpiSite = { id: stableId('cpi', input.uri, location.startLine, operation), location, functionName, target: splCpi ? 'spl-token' : member[1], targetKind: splCpi ? 'spl-token' : 'custom', operation, operationCategory: category, invocationApi: splCpi ? `Solang SplToken.${member[2]}` : 'Solang external call', instructionExpression: node.text, accountArguments: args, pdaSigned: signed, evidence: [{ description: splCpi ? `Documented Solang SplToken.${member[2]} CPI` : `Solang cross-contract ${member[1]}.${operation} CPI`, location }], confidence: 0.93 };
    program.securitySurface.cpiSites.push(cpi);
    if (signed) program.securitySurface.pdaSites.push({ id: stableId('pda', input.uri, location.startLine, operation), seeds: annotationStructValues(expression, 'seeds'), location, enclosingFunction: functionName, derivationApi: 'Solang CPI seeds call option', usedAsSigner: true, relatedCpiIds: [cpi.id!], evidence: [{ description: 'Solang CPI provides PDA signer seeds', location }], confidence: 0.9 });
    return;
  }
  if (spl && member && SOLANG_SPL_TOKEN_READ_HELPERS.has(member[2])) {
    calls.push({ id: stableId('call', input.uri, location.startLine, expression), caller, callee: `SplToken.${member[2]}`, resolved: false, sourceExpression: expression, status: 'external', confidence: 0.98, resolutionReason: 'documented Solang SplToken helper reads source-visible account data and does not perform a CPI', location, evidence: [{ description: `Documented read-only Solang SplToken.${member[2]} helper`, location }] });
    program.runtimeOperations ??= [];
    program.runtimeOperations.push({ id: stableId('runtime', input.uri, location.startLine, `SplToken.${member[2]}`), kind: member[2] === 'get_account_info' ? 'account-iteration' : 'data-read', api: `SplToken.${member[2]}`, functionName, instructionIds: [], location, evidence: [{ description: 'Solang SPL helper reads transaction account metadata/data without invoking the Token Program', location }] });
    return;
  }
  if (spl && member) {
    calls.push({ id: stableId('call', input.uri, location.startLine, expression), caller, callee: `SplToken.${member[2]}`, resolved: false, sourceExpression: expression, status: 'unresolved', confidence: 0.5, resolutionReason: `SplToken.${member[2]} is not part of the modeled official Solang SPL-token ABI`, location, evidence: [{ description: 'Unmodeled Solang SplToken helper; CPI behavior is not guessed', location }] });
    return;
  }
  const status = /\.|\[|\(/.test(expression) && !/^\w+$/.test(expression) ? 'dynamic' : 'unresolved';
  calls.push({ id: stableId('call', input.uri, location.startLine, expression), caller, callee: plain, resolved: false, sourceExpression: expression, status, confidence: status === 'dynamic' ? 0.35 : 0.7, resolutionReason: status === 'dynamic' ? 'receiver or callable is dynamic' : `no same-contract target named ${plain} was found yet`, location, evidence: [{ description: 'Solang call expression', location }] });
}

function parseAccounts(input: SourceFrontendInput, annotations: string, contextType: string, startOrdinal: number): AccountInfo[] {
  const result = new Map<string, AccountInfo>(); const kinds = ['account', 'mutableAccount', 'signer', 'mutableSigner', 'payer'];
  for (const kind of kinds) for (const value of annotationValues(annotations, kind)) {
    const name = value.split(',')[0].trim().replace(/^['"]|['"]$/g, ''); if (!/^[A-Za-z_]\w*$/.test(name)) continue;
    const location = offsetLocation(input.uri, input.source, Math.max(0, input.source.indexOf(`@${kind}`, Math.max(0, input.source.length - annotations.length - 1))), Math.max(0, input.source.indexOf(`@${kind}`, Math.max(0, input.source.length - annotations.length - 1))) + kind.length + 1);
    const current = result.get(name) ?? { id: `account:${contextType}:${name}`, name, type: 'AccountMeta', ordinal: startOrdinal + result.size, contextType, location, evidence: [], confidence: 0.95 };
    if (kind === 'mutableAccount' || kind === 'mutableSigner' || kind === 'payer') current.writable = true;
    if (kind === 'signer' || kind === 'mutableSigner' || kind === 'payer') current.signer = true;
    current.evidence.push({ description: `Solang @${kind} account annotation`, location }); result.set(name, current);
  }
  return [...result.values()];
}

function addPdaEvidence(program: ProgramUnit, input: SourceFrontendInput, seeds: string[], bump: string | undefined, fn: string, location: ReturnType<typeof nodeLocation>, accounts: AccountInfo[]): void {
  if (!seeds.length) return;
  const related = accounts.find(account => account.name === 'dataAccount') ?? accounts[0];
  const relatedCpis = program.securitySurface.cpiSites.filter(cpi => cpi.functionName === fn && cpi.pdaSigned).map(cpi => cpi.id!).filter(Boolean);
  const id = stableId('pda', input.uri, location.startLine, fn); program.securitySurface.pdaSites.push({ id, seeds, bump, location, enclosingFunction: fn, relatedAccountId: related?.id, derivationApi: 'Solang @seed/@bump annotations', usedAsSigner: relatedCpis.length > 0, relatedCpiIds: relatedCpis, evidence: [{ description: 'Solang PDA constructor annotations', location }], confidence: 0.94 }); if (related) related.pdaId = id;
  for (const cpi of program.securitySurface.cpiSites.filter(item => relatedCpis.includes(item.id!))) cpi.signerPdaIds = [...new Set([...(cpi.signerPdaIds ?? []), id])];
}

function addConstructorAccountsAndCpi(program: ProgramUnit, input: SourceFrontendInput, annotations: string, contextType: string, fn: string, location: ReturnType<typeof nodeLocation>, accounts: AccountInfo[], seeds: string[]): void {
  if (!accounts.some(account => account.name === 'dataAccount')) accounts.push({ id: `account:${contextType}:dataAccount`, name: 'dataAccount', type: 'SolangDataAccount', writable: true, ordinal: accounts.length, contextType, lifecycle: ['init', 'create', 'write'], location, confidence: 0.94, evidence: [{ description: 'Solang constructor implicit data account allocated using @payer', location }] });
  if (!accounts.some(account => account.name === 'systemProgram')) accounts.push({ id: `account:${contextType}:systemProgram`, name: 'systemProgram', type: 'SystemProgram', executable: true, addressExpectation: '11111111111111111111111111111111', ordinal: accounts.length, contextType, location, confidence: 0.94, evidence: [{ description: 'Solang constructor account allocation uses the System Program', location }] });
  const cpiId = stableId('cpi', input.uri, location.startLine, 'constructor-allocation');
  program.securitySurface.cpiSites.push({ id: cpiId, location, functionName: fn, target: 'system-program', targetKind: 'system-program', operation: 'create-account', operationCategory: 'account-creation', invocationApi: 'Solang constructor allocation', instructionExpression: `@payer(${annotationValues(annotations, 'payer')[0]})${annotationValues(annotations, 'space')[0] ? ` @space(${annotationValues(annotations, 'space')[0]})` : ''}`, accountArguments: ['dataAccount', annotationValues(annotations, 'payer')[0], 'systemProgram'], pdaSigned: seeds.length > 0, evidence: [{ description: 'Solang compiler-generated constructor account allocation evidenced by @payer', location }], confidence: 0.92 });
}

function nodeLocation(uri: string, node: Node) { return { uri, startLine: node.startPosition.row + 1, startColumn: node.startPosition.column, endLine: node.endPosition.row + 1, endColumn: node.endPosition.column }; }
function nearestContract(node: Node): Node | undefined { let parent = node.parent; while (parent && parent.type !== 'contract_declaration') parent = parent.parent; return parent ?? undefined; }
function annotationsBefore(source: string, offset: number): string { const prefix = source.slice(0, offset); const lines = prefix.split(/\r?\n/); const selected: string[] = []; for (let i = lines.length - 1; i >= 0; i--) { const line = lines[i].trim(); if (!line || line.startsWith('//')) { if (!selected.length) continue; break; } if (line.startsWith('@') || (selected.length && !/[;{}]/.test(line))) selected.unshift(line); else break; } return selected.join('\n'); }
function parseSolangParameters(text: string): { parameters: Array<{ name: string; type?: string }>; seedParameters: string[]; bumpParameter?: string; signatureFound: boolean } {
  const keyword = /\b(?:constructor|function\s+[A-Za-z_]\w*)\s*\(/.exec(text); if (!keyword) return { parameters: [], seedParameters: [], signatureFound: false };
  const open = text.indexOf('(', keyword.index); const close = matchingDelimiter(text, open, '(', ')'); if (close < 0) return { parameters: [], seedParameters: [], signatureFound: false };
  const parameters: Array<{ name: string; type?: string }> = []; const seedParameters: string[] = []; let bumpParameter: string | undefined;
  for (const [index, raw] of splitTopLevel(text.slice(open + 1, close)).entries()) {
    const hasSeed = /@seed\b/.test(raw); const hasBump = /@bump\b/.test(raw);
    const clean = raw.replace(/@[A-Za-z_]\w*(?:\s*\([^)]*\))?/g, ' ').replace(/\s+/g, ' ').trim(); if (!clean) continue;
    const nameMatch = /([A-Za-z_]\w*)\s*$/.exec(clean); const name = nameMatch?.[1] ?? `argument${index + 1}`;
    const prefix = nameMatch ? clean.slice(0, nameMatch.index).trim() : clean; const type = prefix.replace(/\b(?:memory|calldata|storage)\b/g, '').replace(/\s+/g, ' ').trim() || undefined;
    parameters.push({ name, type }); if (hasSeed) seedParameters.push(name); if (hasBump) bumpParameter = name;
  }
  return { parameters, seedParameters, bumpParameter, signatureFound: true };
}
function annotationValues(text: string, name: string): string[] { const values: string[] = []; const regex = new RegExp(`@${name}\\s*\\(([^)]*)\\)`, 'g'); for (const match of text.matchAll(regex)) values.push(match[1].trim()); return values; }
function annotationStructValues(text: string, name: string): string[] { const match = new RegExp(`${name}\\s*:\\s*\\[([^\\]]*)\\]`).exec(text); return match ? match[1].split(',').map(item => item.trim()).filter(Boolean) : []; }
function callArguments(text: string): string[] { const start = text.lastIndexOf('('); const end = text.lastIndexOf(')'); if (start < 0 || end <= start) return []; return splitTopLevel(text.slice(start + 1, end)); }
function splitTopLevel(text: string): string[] { const values: string[] = []; let depth = 0; let start = 0; for (let i = 0; i < text.length; i++) { if ('([{'.includes(text[i])) depth++; else if (')]}'.includes(text[i])) depth--; else if (text[i] === ',' && depth === 0) { values.push(text.slice(start, i).trim()); start = i + 1; } } const last = text.slice(start).trim(); if (last) values.push(last); return values; }
function matchingDelimiter(text: string, start: number, open: string, close: string): number { let depth = 0; let quote = ''; for (let index = start; index < text.length; index++) { const char = text[index]; if (quote) { if (char === '\\') index++; else if (char === quote) quote = ''; continue; } if (char === '"' || char === "'") { quote = char; continue; } if (char === open) depth++; else if (char === close && --depth === 0) return index; } return -1; }
function cpiCategory(operation: string): CpiOperationCategory { if (/^transfer/.test(operation)) return 'token-transfer'; if (/^mint_to/.test(operation)) return 'token-mint'; if (/^burn/.test(operation)) return 'token-burn'; if (operation === 'close_account') return 'account-close'; if (/^(set_authority|approve|revoke)/.test(operation)) return 'authority-change'; if (operation === 'freeze_account') return 'freeze'; if (operation === 'thaw_account') return 'thaw'; if (/^initialize/.test(operation)) return 'initialization'; return 'other'; }
function nonNull(nodes: Array<Node | null>): Node[] { return nodes.filter((node): node is Node => node !== null); }
function escapeRegex(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function stripSolidityComments(source: string): string { let result = ''; let quote = ''; let block = false; for (let i = 0; i < source.length; i++) { const char = source[i], next = source[i + 1]; if (block) { if (char === '*' && next === '/') { block = false; result += '  '; i++; } else result += char === '\n' ? '\n' : ' '; continue; } if (quote) { result += char; if (char === '\\') { result += next ?? ''; i++; } else if (char === quote) quote = ''; continue; } if (char === '"' || char === "'") { quote = char; result += char; continue; } if (char === '/' && next === '*') { block = true; result += '  '; i++; continue; } if (char === '/' && next === '/') { while (i < source.length && source[i] !== '\n') { result += ' '; i++; } result += '\n'; continue; } result += char; } return result; }
