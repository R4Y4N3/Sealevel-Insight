import { CallSite, ProgramUnit, RuntimeOperation } from '../model/report';
import { createSourceProgram, offsetLocation, simpleCallGraph, stableId, textFileMetric } from './frontendCommon';
import { FrontendResult, SourceFrontendInput } from './solangFrontend';

interface AssemblyLine { number: number; start: number; code: string; label?: string; opcode?: string; operands: string; }
/** Complete mnemonic set from Anza's versioned sBPF bytecode specification. */
const SBF_OPCODES = new Set([
  'lddw', 'ldxb', 'ldxh', 'ldxw', 'ldxdw', 'stb', 'sth', 'stw', 'stdw', 'stxb', 'stxh', 'stxw', 'stxdw',
  'add32', 'add64', 'sub32', 'sub64', 'mul32', 'mul64', 'div32', 'div64', 'mod32', 'mod64',
  'or32', 'or64', 'and32', 'and64', 'xor32', 'xor64', 'lsh32', 'lsh64', 'rsh32', 'rsh64',
  'arsh32', 'arsh64', 'neg32', 'neg64', 'mov32', 'mov64', 'le', 'be',
  'uhmul64', 'udiv32', 'udiv64', 'urem32', 'urem64', 'lmul32', 'lmul64', 'shmul64',
  'sdiv32', 'sdiv64', 'srem32', 'srem64', 'hor64',
  'ja', 'jeq', 'jgt', 'jge', 'jset', 'jne', 'jsgt', 'jsge', 'jlt', 'jle', 'jslt', 'jsle',
  'jeq32', 'jgt32', 'jge32', 'jset32', 'jne32', 'jsgt32', 'jsge32', 'jlt32', 'jle32', 'jslt32', 'jsle32',
  'call', 'callx', 'syscall', 'exit'
]);

export function analyzeSbfAssembly(input: SourceFrontendInput): FrontendResult {
  const lines = parseLines(input.source);
  const hasRegisters = lines.some(line => /\br(?:10|[0-9])\b/i.test(`${line.opcode ?? ''} ${line.operands}`));
  const hasIsa = lines.some(line => !!line.opcode);
  const hasNamedSolanaSyscall = lines.some(line => /\bsol_[a-z0-9_]+\b/i.test(line.operands));
  const hasEntrypoint = lines.some(line => line.label === 'entrypoint' || /\.g(?:lobl|lobal)\s+entrypoint\b/.test(line.code) || /\.text\.entrypoint\b/.test(line.code));
  const hasExplicitSbpfExtension = /\.sbpf(?:[?#]|$)/i.test(input.uri);
  const signals = [hasRegisters, hasIsa, hasNamedSolanaSyscall, hasEntrypoint, hasExplicitSbpfExtension].filter(Boolean).length;
  const assemblyCounts = countAssemblyLines(input.source);
  const file = textFileMetric(input.uri, input.source, 'sbf-assembly', { ...assemblyCounts, functions: 0, functionCalls: lines.filter(line => /^(call|callx|syscall)$/i.test(line.opcode ?? '')).length, loops: countBackwardJumps(lines) });
  if (!hasIsa || !(hasNamedSolanaSyscall || hasEntrypoint || hasExplicitSbpfExtension)) return { programs: [], file, diagnostics: [`${input.uri}: assembly lacks positive sBPF/Solana identity evidence (entrypoint, named Solana syscall, or .sbpf source); metrics recorded without creating a Solana program.`] };
  const globals = new Set(lines.flatMap(line => { const match = /^\.g(?:lobl|lobal)\s+([\w.$]+)/.exec(line.code); return match ? [match[1]] : []; }));
  const typed = new Set(lines.flatMap(line => { const match = /^\.type\s+([\w.$]+)\s*,\s*[@%]function/.exec(line.code); return match ? [match[1]] : []; }));
  const directTargets = new Set(lines.filter(line => line.opcode === 'call' && /^[A-Za-z_.$][\w.$]*$/.test(line.operands.trim())).map(line => line.operands.trim()));
  const labels = lines.filter(line => line.label).map(line => line.label!); const functionNames = labels.filter(label => label === 'entrypoint' || globals.has(label) || typed.has(label) || directTargets.has(label));
  if (!functionNames.length && labels.length) functionNames.push(labels[0]);
  file.functions = functionNames.length;
  const programName = input.packageName ?? assemblyName(input.uri); const program = createSourceProgram(programName, 'sbf-assembly', input.manifestUri, 'solana-program', input.packageEvidence); program.sourceFiles!.push(file);
  program.frameworkEvidence.push({ framework: 'sbf-assembly', confidence: 0.95, evidence: [{ description: `${signals} independent sBPF/Solana assembly signals detected`, location: lineLocation(input, lines.find(line => line.opcode) ?? lines[0]) }] });
  const functionStarts = functionNames.map(name => ({ name, index: lines.findIndex(line => line.label === name) })).filter(item => item.index >= 0).sort((a, b) => a.index - b.index);
  const calls: CallSite[] = []; const runtime: RuntimeOperation[] = [];
  for (let index = 0; index < functionStarts.length; index++) {
    const current = functionStarts[index]; const body = lines.slice(current.index, functionStarts[index + 1]?.index ?? lines.length); const first = body[0]; const last = body.at(-1) ?? first; const location = { ...lineLocation(input, first), endLine: last.number, endColumn: last.code.length };
    const qualified = `${programName}::${current.name}`; const conditional = body.filter(line => isConditionalJump(line.opcode)).length;
    program.functions.push({ name: current.name, qualifiedName: qualified, location, lines: last.number - first.number + 1, codeLines: body.filter(line => line.code.trim()).length, complexity: 1 + conditional, parameters: 0, isPublic: globals.has(current.name) || current.name === 'entrypoint', visibility: globals.has(current.name) ? 'global' : 'local', isUnsafe: false, program: programName });
    if (current.name === 'entrypoint' || globals.has(current.name) && /entrypoint/i.test(current.name)) program.instructions.push({ id: stableId('instruction', input.uri, first.number, current.name), name: current.name, functionName: current.name, handler: qualified, location, confidence: 0.95, evidence: [{ description: 'Explicit sBPF assembly entrypoint symbol', location }] });
    for (const line of body) {
      const lineLoc = lineLocation(input, line); const opcode = line.opcode?.toLowerCase(); if (!opcode) continue;
      if (opcode === 'call' || opcode === 'callx') {
        const target = line.operands.trim(); const syscallTarget = opcode === 'call' && /^sol_[a-z0-9_]+$/i.test(target); const direct = opcode === 'call' && /^[A-Za-z_.$][\w.$]*$/.test(target); const resolved = direct && functionNames.includes(target);
        calls.push({ id: stableId('call', input.uri, line.number, target), caller: qualified, callee: target, resolved, sourceExpression: `${opcode} ${target}`, target: resolved ? `${programName}::${target}` : undefined, candidateTargets: resolved ? [`${programName}::${target}`] : [], status: resolved ? 'resolved' : syscallTarget ? 'external' : opcode === 'callx' ? 'dynamic' : 'unresolved', dispatchKind: opcode === 'callx' ? 'function-pointer' : 'direct', indirect: opcode === 'callx', confidence: resolved || syscallTarget ? 0.98 : 0.35, resolutionReason: resolved ? 'direct call to a declared assembly function label' : syscallTarget ? 'named Solana syscall is an external runtime call' : opcode === 'callx' ? 'register-indirect sBPF call' : 'call target is not a declared function label', location: lineLoc, evidence: [{ description: syscallTarget ? `named Solana syscall ${target}` : `${opcode} assembly instruction`, location: lineLoc }] });
      }
      const syscall = opcode === 'syscall' ? line.operands.trim() : opcode === 'call' && /^sol_/.test(line.operands.trim()) ? line.operands.trim() : undefined;
      if (syscall) addSyscall(program, runtime, input, current.name, syscall, lineLoc);
      if (/^ldx/i.test(opcode)) runtime.push(runtimeOp(input, current.name, line, 'data-read', opcode));
      if (/^stx?/i.test(opcode)) runtime.push(runtimeOp(input, current.name, line, 'data-write', opcode));
    }
  }
  program.runtimeOperations = runtime.sort((a, b) => a.id.localeCompare(b.id)); program.callGraph = simpleCallGraph(program.functions.map(fn => fn.qualifiedName!), calls);
  return { programs: [program], file, diagnostics: [] };
}

function addSyscall(program: ProgramUnit, runtime: RuntimeOperation[], input: SourceFrontendInput, fn: string, syscall: string, location: ReturnType<typeof offsetLocation>): void {
  runtime.push({ id: stableId('runtime', input.uri, location.startLine, syscall), kind: syscallKind(syscall), api: syscall, functionName: fn, instructionIds: [], location, evidence: [{ description: `Solana sBPF syscall ${syscall}`, location }] });
  if (/sol_(?:invoke|invoke_signed)/.test(syscall)) {
    const signed = /invoke_signed/.test(syscall); const cpiId = stableId('cpi', input.uri, location.startLine, syscall); const signerPdaId = signed ? stableId('pda', input.uri, location.startLine, `${syscall}:signer-seeds`) : undefined;
    program.securitySurface.cpiSites.push({ id: cpiId, location, functionName: fn, targetKind: 'dynamic', invocationApi: syscall, signerPdaIds: signerPdaId ? [signerPdaId] : [], pdaSigned: signed, evidence: [{ description: `${syscall} performs a CPI; target is constructed at runtime`, location }], confidence: 0.95 });
    if (signerPdaId) program.securitySurface.pdaSites.push({ id: signerPdaId, seeds: [], location, enclosingFunction: fn, derivationApi: `${syscall} signer seed buffers`, usedAsSigner: true, relatedCpiIds: [cpiId], evidence: [{ description: `${syscall} supplies runtime PDA signer seeds; buffer contents are unresolved`, location }], confidence: 0.9 });
  }
  if (/sol_(?:create_program_address|try_find_program_address)/.test(syscall)) program.securitySurface.pdaSites.push({ id: stableId('pda', input.uri, location.startLine, syscall), location, enclosingFunction: fn, derivationApi: syscall, evidence: [{ description: `${syscall} derives a PDA; seed buffers are register/runtime values`, location }], confidence: 0.92 });
}

function runtimeOp(input: SourceFrontendInput, fn: string, line: AssemblyLine, kind: string, api: string): RuntimeOperation { const location = lineLocation(input, line); return { id: stableId('runtime', input.uri, line.number, `${kind}:${api}`), kind, api, functionName: fn, instructionIds: [], location, evidence: [{ description: `sBPF ${kind} instruction; account/state binding is unavailable at source assembly level`, location }] }; }
function parseLines(source: string): AssemblyLine[] { let offset = 0; return source.split(/\r?\n/).map((raw, index) => { const start = offset; offset += raw.length + 1; const code = stripComment(raw).trim(); const labelMatch = /^([A-Za-z_.$][\w.$]*):/.exec(code); const rest = labelMatch ? code.slice(labelMatch[0].length).trim() : code; const instruction = /^([A-Za-z][A-Za-z0-9]*)\s*(.*)$/.exec(rest); const opcode = instruction?.[1].toLowerCase(); return { number: index + 1, start, code, label: labelMatch?.[1], opcode: opcode && SBF_OPCODES.has(opcode) ? opcode : undefined, operands: opcode && SBF_OPCODES.has(opcode) ? instruction![2].trim() : '' }; }); }
function isConditionalJump(opcode: string | undefined): boolean { return !!opcode && /^j(?:eq|ne|gt|ge|set|lt|le|sgt|sge|slt|sle)(?:32)?$/.test(opcode); }
function countBackwardJumps(lines: AssemblyLine[]): number {
  const labels = new Map(lines.filter(line => line.label).map(line => [line.label!, line.number]));
  return lines.filter(line => {
    if (!line.opcode || !(line.opcode === 'ja' || isConditionalJump(line.opcode))) return false;
    const target = line.operands.split(',').at(-1)?.trim(); const targetLine = target ? labels.get(target) : undefined;
    return targetLine !== undefined && targetLine <= line.number;
  }).length;
}
function stripComment(line: string): string { let quoted = false; for (let i = 0; i < line.length; i++) { if (line[i] === '"' && line[i - 1] !== '\\') quoted = !quoted; if (!quoted && (line[i] === ';' || line[i] === '#' || line.slice(i, i + 2) === '//')) return line.slice(0, i); } return line; }
function countAssemblyLines(source: string): { lines: number; blankLines: number; commentLines: number; codeLines: number } { const lines = source.split(/\r?\n/); let blankLines = 0, commentLines = 0, codeLines = 0; for (const line of lines) { if (!line.trim()) blankLines++; else if (stripComment(line).trim()) codeLines++; else commentLines++; } return { lines: lines.length, blankLines, commentLines, codeLines }; }
function lineLocation(input: SourceFrontendInput, line: AssemblyLine) { return offsetLocation(input.uri, input.source, line.start, line.start + line.code.length); }
function assemblyName(uri: string): string { return uri.split('/').at(-1)?.replace(/\.(?:s|S|asm|sbpf)$/, '') || 'sbf-program'; }
function syscallKind(name: string): string { if (/invoke/.test(name)) return 'cpi'; if (/program_address/.test(name)) return 'pda-derivation'; if (/log/.test(name)) return 'logging'; if (/sysvar/.test(name)) return 'sysvar-read'; if (/(memcpy|memmove|memcmp|memset)/.test(name)) return 'memory'; if (/(hash|sha|keccak|blake)/.test(name)) return 'hashing'; return 'syscall'; }
