import { readdir } from 'node:fs/promises';
import * as path from 'node:path';

export const DEFAULT_PRUNED_DIRECTORIES = new Set([
  '.git', '.anchor', '.real-world-cache', '.sealevel-insight-cache', '.vscode-test',
  'coverage', 'dist', 'dist-integration', 'dist-test', 'node_modules', 'target'
]);

export interface WalkFilesOptions {
  shouldDescend?: (relativeDirectory: string, name: string) => boolean;
  includeFile?: (relativeFile: string, name: string) => boolean;
  prunedDirectories?: ReadonlySet<string>;
}

export async function walkFiles(root: string, options: WalkFilesOptions = {}): Promise<string[]> {
  const files: string[] = [];
  const pruned = options.prunedDirectories ?? DEFAULT_PRUNED_DIRECTORIES;
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      const relative = path.relative(root, full).split(path.sep).join('/');
      if (entry.isDirectory()) {
        if (pruned.has(entry.name) || options.shouldDescend?.(relative, entry.name) === false) continue;
        await visit(full);
      } else if (entry.isFile() && options.includeFile?.(relative, entry.name) !== false) files.push(full);
    }
  }
  await visit(root);
  return files.sort();
}
