import * as path from 'node:path';
import { Language, Parser, Tree } from 'web-tree-sitter';

export interface ParsedSolidityFile { uri: string; source: string; tree?: Tree; error?: string; }

let initialized: Promise<Language> | undefined;

export async function loadSolidityLanguage(wasmPath: string, runtimeWasmPath?: string): Promise<Language> {
  initialized ??= (async () => {
    await Parser.init({ locateFile: (scriptName: string, directory: string) => runtimeWasmPath ?? path.join(directory, scriptName) });
    return Language.load(wasmPath);
  })();
  return initialized;
}

export async function parseSolidity(uri: string, source: string, wasmPath: string, runtimeWasmPath?: string): Promise<ParsedSolidityFile> {
  try {
    const language = await loadSolidityLanguage(wasmPath, runtimeWasmPath);
    const parser = new Parser();
    parser.setLanguage(language);
    const tree = parser.parse(source);
    if (!tree) return { uri, source, error: 'Tree-sitter returned no Solidity syntax tree.' };
    // Solang annotations are currently represented as recovery nodes by the upstream grammar.
    // Keep the tree: structural contract/function nodes remain exact and annotations are parsed separately.
    return { uri, source, tree };
  } catch (error) {
    return { uri, source, error: error instanceof Error ? error.message : String(error) };
  }
}
