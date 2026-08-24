import { FrameworkEvidence } from '../model/report';
export function enrichPinocchio(source: string): FrameworkEvidence[] {
  const evidence = ['pinocchio::', 'AccountView', 'InstructionContext', 'entrypoint!', 'program_entrypoint!', 'lazy_program_entrypoint!', 'process_entrypoint', 'no_allocator!'].filter(value => source.includes(value));
  return evidence.length ? [{ framework: 'pinocchio', confidence: 0.9, evidence: evidence.map(description => ({ description })) }] : [];
}
