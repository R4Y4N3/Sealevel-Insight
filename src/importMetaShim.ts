import { pathToFileURL } from 'node:url';

// web-tree-sitter is ESM-first and reads import.meta.url during initialization.
// Bundled CommonJS builds replace that value with this runtime-safe equivalent.
export const importMetaUrl = pathToFileURL(__filename).href;
