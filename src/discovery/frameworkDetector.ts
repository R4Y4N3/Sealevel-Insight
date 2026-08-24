import { FrameworkEvidence } from '../model/report';

export function detectFramework(source: string, uri: string): FrameworkEvidence[] {
  const evidence: FrameworkEvidence[] = [];
  const add = (framework: string, confidence: number, matches: string[]) => {
    const found = matches.filter(match => source.includes(match));
    if (found.length) {
      const first = found[0];
      const index = source.indexOf(first);
      const before = source.slice(0, index).split(/\r?\n/);
      const location = { uri, startLine: before.length, startColumn: before.at(-1)!.length, endLine: before.length, endColumn: before.at(-1)!.length + first.length };
      evidence.push({ framework, confidence, evidence: found.map(description => ({ description, location })), location });
    }
  };
  if (/anchor[-_]lang|anchor_lang::|anchor_spl::/.test(source)) add('anchor', 0.98, ['anchor-lang', 'anchor_lang', '#[program]', '#[derive(Accounts)]']);
  add('pinocchio', 0.95, ['pinocchio', 'AccountView', 'InstructionContext', 'program_entrypoint!', 'lazy_program_entrypoint!', 'process_entrypoint']);
  add('native-solana', 0.9, ['solana_program', 'solana-program', 'entrypoint!', 'process_instruction']);
  add('steel', 0.8, ['steel', 'account!', 'instruction!']);
  add('quasar', 0.78, ['quasar-lang', 'quasar-spl', 'quasar::']);
  if (!evidence.length && /(invoke|AccountInfo|process_instruction|entrypoint)/.test(source)) {
    const index = source.search(/entrypoint|AccountInfo|process_instruction/);
    const before = source.slice(0, index).split(/\r?\n/);
    const location = { uri, startLine: before.length, startColumn: before.at(-1)!.length, endLine: before.length, endColumn: before.at(-1)!.length + 1 };
    evidence.push({ framework: 'native-or-custom', confidence: 0.55, evidence: [{ description: 'generic Solana entrypoint/account signal', location }], location });
  }
  return evidence;
}
