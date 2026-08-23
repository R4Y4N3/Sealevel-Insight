import { FrameworkEvidence } from '../model/report';
export function enrichPinocchio(source: string): FrameworkEvidence[] {
  const evidence = ['pinocchio::', 'AccountView', 'program_entrypoint!'].filter(value => source.includes(value));
  return evidence.length ? [{ framework: 'pinocchio', confidence: 0.9, evidence: evidence.map(description => ({ description })) }] : [];
}
