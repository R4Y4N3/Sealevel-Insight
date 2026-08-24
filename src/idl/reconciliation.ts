import { IdlProgram, IdlReport, IdlReconciliation, InstructionInfo, ProgramIdentity, ProgramUnit } from '../model/report';
import * as path from 'node:path';

export function normalizeIdl(value: unknown, sourceUri?: string): IdlProgram | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const instructions = Array.isArray(raw.instructions) ? raw.instructions.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object').map(item => ({ name: typeof item.name === 'string' ? item.name : 'unknown', accounts: Array.isArray(item.accounts) ? item.accounts.filter((account): account is Record<string, unknown> => !!account && typeof account === 'object').map(account => ({ name: typeof account.name === 'string' ? account.name : 'unknown', signer: account.isSigner === true || account.signer === true, writable: account.isMut === true || account.writable === true })) : [] })) : [];
  return { address: typeof raw.address === 'string' ? raw.address : typeof raw.programId === 'string' ? raw.programId : undefined, instructions, sourceUri };
}

export function reconcileIdl(program: { instructions: InstructionInfo[]; identity?: ProgramIdentity }, idl: IdlProgram): IdlReport {
  const sourceNames = new Set(program.instructions.map(instruction => instruction.name));
  const idlNames = new Set(idl.instructions.map(instruction => instruction.name));
  const reconciliations: IdlReconciliation[] = [...sourceNames].map(name => ({ status: idlNames.has(name) ? 'MATCHED' as const : 'SOURCE_ONLY' as const, item: `instruction:${name}` }));
  reconciliations.push(...[...idlNames].filter(name => !sourceNames.has(name)).map(name => ({ status: 'IDL_ONLY' as const, item: `instruction:${name}` })));
  for (const sourceInstruction of program.instructions) {
    const idlInstruction = idl.instructions.find(item => item.name === sourceInstruction.name);
    if (!idlInstruction || !sourceInstruction.contextType) continue;
    const sourceAccounts = sourceInstruction.contextType;
    if (sourceAccounts && idlInstruction.accounts.length === 0) reconciliations.push({ status: 'UNKNOWN', item: `accounts:${sourceInstruction.name}`, details: 'Source context exists but normalized source account fields were not provided.' });
  }
  const diagnostics = program.identity?.programId && idl.address && program.identity.programId !== idl.address ? [`Program ID mismatch: source ${program.identity.programId}, IDL ${idl.address}`] : [];
  if (diagnostics.length) reconciliations.push({ status: 'MISMATCH', item: 'programId', details: diagnostics[0] });
  return { programs: [idl], reconciliations, diagnostics };
}

export function reconcileIdls(programs: ProgramUnit[], idls: IdlProgram[]): IdlReport {
  const reconciliations: IdlReconciliation[] = [];
  const diagnostics: string[] = [];
  for (const idl of idls) {
    const sourceName = idl.sourceUri ? path.basename(idl.sourceUri, '.json') : '';
    const normalizedName = normalizeName(sourceName);
    const matches = programs.filter(program => (idl.address && program.identity?.programId === idl.address) || (normalizedName && normalizeName(program.name) === normalizedName));
    const program = matches.length === 1 ? matches[0] : programs.length === 1 ? programs[0] : undefined;
    if (!program) {
      diagnostics.push(`Could not match IDL ${idl.sourceUri ?? idl.address ?? '<unknown>'} to a source program.`);
      reconciliations.push(...idl.instructions.map(instruction => ({ status: 'IDL_ONLY' as const, item: `instruction:${instruction.name}` })));
      continue;
    }
    const result = reconcileIdl(program, idl);
    reconciliations.push(...result.reconciliations);
    diagnostics.push(...result.diagnostics);
  }
  return { programs: idls, reconciliations, diagnostics };
}

function normalizeName(value: string): string { return value.replace(/[-_]/g, '').toLowerCase(); }
