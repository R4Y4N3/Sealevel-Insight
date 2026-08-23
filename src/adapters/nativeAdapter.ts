import { FrameworkEvidence } from '../model/report';
export function enrichNative(source: string): FrameworkEvidence[] {
  const evidence = ['process_instruction', 'entrypoint!', 'AccountInfo'].filter(value => source.includes(value));
  return evidence.length ? [{ framework: 'native-solana', confidence: 0.85, evidence: evidence.map(description => ({ description })) }] : [];
}
