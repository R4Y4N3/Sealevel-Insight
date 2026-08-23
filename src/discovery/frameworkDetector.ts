import { FrameworkEvidence, Evidence } from '../model/report';

export function detectFramework(source: string, uri: string): FrameworkEvidence[] {
  const evidence: FrameworkEvidence[] = [];
  const add = (framework: string, confidence: number, matches: string[]) => {
    const found = matches.filter(match => source.includes(match));
    if (found.length) evidence.push({ framework, confidence, evidence: found.map(description => ({ description })), location: { uri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } });
  };
  add('anchor', 0.98, ['anchor-lang', '#[program]', '#[derive(Accounts)]']);
  add('pinocchio', 0.95, ['pinocchio', 'AccountView', 'pinocchio::program_entrypoint']);
  add('native-solana', 0.9, ['solana_program', 'solana-program', 'entrypoint!', 'process_instruction']);
  if (!evidence.length && /(invoke|AccountInfo|process_instruction|entrypoint)/.test(source)) {
    evidence.push({ framework: 'native-or-custom', confidence: 0.55, evidence: [{ description: 'generic Solana entrypoint/account signal' }], location: { uri, startLine: 1, startColumn: 0, endLine: 1, endColumn: 0 } });
  }
  return evidence;
}
