export function countLines(source: string): { lines: number; blankLines: number; commentLines: number; codeLines: number } {
  const lines = source.split(/\r?\n/);
  let blankLines = 0;
  let commentLines = 0;
  let codeLines = 0;
  let inBlockComment = false;
  let blockDepth = 0;
  let stringQuote = '';
  let escaped = false;
  for (const line of lines) {
    let hasCode = false;
    let hasComment = false;
    for (let index = 0; index < line.length; index++) {
      const current = line[index];
      const next = line[index + 1];
      if (stringQuote) {
        if (escaped) escaped = false;
        else if (current === '\\') escaped = true;
        else if (current === stringQuote) stringQuote = '';
        continue;
      }
      if (!inBlockComment && current === '"') { stringQuote = current; hasCode = true; continue; }
      if (!inBlockComment && current === "'" && line[index + 2] === "'") { stringQuote = current; hasCode = true; continue; }
      if (!inBlockComment && current === '/' && next === '/') { hasComment = true; break; }
      if (!inBlockComment && current === '/' && next === '*') { inBlockComment = true; blockDepth++; hasComment = true; index++; continue; }
      if (inBlockComment && current === '/' && next === '*') { blockDepth++; index++; continue; }
      if (inBlockComment && current === '*' && next === '/') { blockDepth--; index++; if (blockDepth === 0) inBlockComment = false; continue; }
      if (!inBlockComment && !/\s/.test(current)) hasCode = true;
    }
    if (!hasCode && !hasComment && !line.trim()) blankLines++;
    else if (hasCode) codeLines++;
    else commentLines++;
  }
  return { lines: lines.length, blankLines, commentLines, codeLines };
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}
