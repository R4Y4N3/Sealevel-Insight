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
  inject: ['src/importMetaShim.ts'],
  define: { 'import.meta.url': 'importMetaUrl' },
  logLevel: 'info',
});

  await esbuild.build({
    entryPoints: ['src/cli.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist/cli.js',
    sourcemap: true,
    format: 'cjs',
    inject: ['src/importMetaShim.ts'],
    define: { 'import.meta.url': 'importMetaUrl' },
    logLevel: 'info',
  });

// Parser WASM resources must ship inside the VSIX.
copyFileSync('resources/parsers/tree-sitter-rust.wasm', 'dist/tree-sitter-rust.wasm');
copyFileSync('node_modules/web-tree-sitter/tree-sitter.wasm', 'dist/tree-sitter.wasm');
console.log('copied parser runtime and Rust grammar WASM -> dist/');
