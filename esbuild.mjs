import * as esbuild from 'esbuild';
import { mkdirSync, copyFileSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

await esbuild.build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  external: ['vscode'],
  outfile: 'dist/extension.js',
  sourcemap: true,
  format: 'cjs',
  logLevel: 'info',
});

// Parser WASM resources must ship inside the VSIX.
copyFileSync('resources/parsers/tree-sitter-rust.wasm', 'dist/tree-sitter-rust.wasm');
console.log('copied resources/parsers/tree-sitter-rust.wasm -> dist/');
