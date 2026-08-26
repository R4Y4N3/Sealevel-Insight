import * as path from 'node:path';
import { SourceLanguage } from '../model/report';

export const DEFAULT_SOURCE_GLOBS = ['**/*.rs', '**/*.sol', '**/*.s', '**/*.S', '**/*.asm', '**/*.sbpf'];

export function sourceLanguage(uri: string): SourceLanguage | undefined {
  const extension = path.extname(uri.split(/[?#]/, 1)[0]);
  if (extension === '.rs') return 'rust';
  if (extension === '.sol') return 'solang-solidity';
  if (['.s', '.S', '.asm', '.sbpf'].includes(extension)) return 'sbf-assembly';
  return undefined;
}
