import { FrameworkEvidence } from '../model/report';

export function enrichSteel(source: string): FrameworkEvidence[] {
  const evidence = ['steel', 'account!', 'instruction!', 'entrypoint!', 'process_instruction'].filter(pattern => source.includes(pattern));
  return evidence.length && /steel|account!|instruction!/.test(source) ? [{ framework: 'steel', confidence: 0.8, evidence: evidence.map(description => ({ description })) }] : [];
}