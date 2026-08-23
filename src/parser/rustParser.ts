import * as path from 'node:path';
import { Language, Parser, Tree } from 'web-tree-sitter';

export interface ParsedRustFile {
  uri: string;
  source: string;
  tree?: Tree;
  error?: string;
}

let initialized: Promise<Language> | undefined;

export async function loadRustLanguage(wasmPath: string, runtimeWasmPath?: string): Promise<Language> {
  initialized ??= (async () => {
    await Parser.init({ locateFile: (scriptName: string, directory: string) => runtimeWasmPath ?? path.join(directory, scriptName) });
    return Language.load(wasmPath);
  })();
  return initialized;
}

export async function parseRust(uri: string, source: string, wasmPath: string, runtimeWasmPath?: string): Promise<ParsedRustFile> {
  try {
    const language = await loadRustLanguage(wasmPath, runtimeWasmPath);
    const parser = new Parser();
    parser.setLanguage(language);
    const tree = parser.parse(source);
    if (!tree) return { uri, source, error: 'Tree-sitter returned no syntax tree.' };
    return { uri, source, tree, error: tree.rootNode.hasError ? 'Rust syntax tree contains parse errors.' : undefined };
  } catch (error) {
    return { uri, source, error: error instanceof Error ? error.message : String(error) };
  }
}
