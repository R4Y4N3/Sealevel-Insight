import { FrameworkEvidence } from '../model/report';

export function enrichQuasar(source: string): FrameworkEvidence[] {
  const evidence = ['quasar-lang', 'quasar_lang', 'quasar-spl', 'Quasar.toml', 'quasar::', 'derive(Accounts)'].filter(pattern => source.includes(pattern));
  return evidence.length && /quasar[-_]lang|quasar-spl|quasar::/.test(source) ? [{ framework: 'quasar', confidence: 0.78, evidence: evidence.map(description => ({ description })) }] : [];
}