import { Evidence, PackageKind } from '../model/report';

export function classifyPackage(manifest: string, source: string): { kind: PackageKind; evidence: Evidence[] } {
  const evidence: Evidence[] = [];
  if (/\[\[test\]\]|\[dev-dependencies\]/.test(manifest) && /test|bench/.test(manifest)) evidence.push({ description: 'test or benchmark package metadata' });
  if (/anchor-lang|pinocchio|solana-program|solana_program/.test(manifest)) evidence.push({ description: 'Solana framework dependency' });
  if (/crate-type\s*=.*(cdylib|lib)/s.test(manifest)) evidence.push({ description: 'crate-type suitable for a program/library' });
  if (/entrypoint!|process_instruction|program_entrypoint|AccountInfo|AccountView/.test(source)) evidence.push({ description: 'program entrypoint or account syntax' });
  if (evidence.some(item => /test/.test(item.description)) && !evidence.some(item => /Solana|entrypoint|account/i.test(item.description))) return { kind: 'test', evidence };
  if (evidence.some(item => /Solana|entrypoint|account/i.test(item.description))) return { kind: 'solana-program', evidence };
  if (/\[lib\]|\[package\]/.test(manifest)) return { kind: 'library', evidence };
  return { kind: 'unknown', evidence };
}