import { IdlProgram, IdlReport, IdlReconciliation, InstructionInfo, ProgramIdentity } from '../model/report';

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
  const diagnostics = program.identity?.programId && idl.address && program.identity.programId !== idl.address ? [`Program ID mismatch: source ${program.identity.programId}, IDL ${idl.address}`] : [];
  if (diagnostics.length) reconciliations.push({ status: 'MISMATCH', item: 'programId', details: diagnostics[0] });
  return { programs: [idl], reconciliations, diagnostics };
}