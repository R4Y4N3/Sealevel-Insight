export function countLines(source: string): { lines: number; blankLines: number; commentLines: number; codeLines: number } {
  const lines = source.split(/\r?\n/);
  let blankLines = 0;
  let commentLines = 0;
  let codeLines = 0;
  let inBlockComment = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blankLines++;
    } else if (inBlockComment || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      commentLines++;
      if (trimmed.includes('*/')) inBlockComment = false;
      if (trimmed.startsWith('/*') && !trimmed.includes('*/')) inBlockComment = true;
    } else {
      codeLines++;
    }
  }
  return { lines: lines.length, blankLines, commentLines, codeLines };
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
