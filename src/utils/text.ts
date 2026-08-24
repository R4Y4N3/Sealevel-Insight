export interface LineCounts { lines: number; blankLines: number; commentLines: number; codeLines: number; docCommentLines: number; todoCount: number; fixmeCount: number; hackCount: number; }

export function countLines(source: string): LineCounts {
  const lines = source.split(/\r?\n/);
  let blankLines = 0, commentLines = 0, codeLines = 0, docCommentLines = 0;
  let blockDepth = 0, blockDoc = false;
  let string: 'normal' | 'char' | 'raw' | undefined;
  let rawHashes = 0, escaped = false;
  let todoCount = 0, fixmeCount = 0, hackCount = 0;
  for (const line of lines) {
    let hasCode = false, hasComment = false, hasDoc = blockDepth > 0 && blockDoc;
    let commentText = '';
    for (let index = 0; index < line.length; index++) {
      const current = line[index], next = line[index + 1];
      if (string === 'raw') {
        if (current === '"' && line.slice(index + 1, index + 1 + rawHashes) === '#'.repeat(rawHashes)) { index += rawHashes; string = undefined; }
        continue;
      }
      if (string) {
        if (escaped) escaped = false;
        else if (current === '\\') escaped = true;
        else if ((string === 'normal' && current === '"') || (string === 'char' && current === "'")) string = undefined;
        continue;
      }
      if (blockDepth > 0) {
        hasComment = true; commentText += current;
        if (current === '/' && next === '*') { blockDepth++; index++; commentText += next; continue; }
        if (current === '*' && next === '/') { blockDepth--; index++; commentText += next; if (blockDepth === 0) blockDoc = false; continue; }
        continue;
      }
      if (current === '/' && next === '/') {
        hasComment = true;
        const text = line.slice(index + 2);
        hasDoc ||= text.startsWith('/') || text.startsWith('!');
        commentText += text;
        break;
      }
      if (current === '/' && next === '*') {
        hasComment = true; blockDepth = 1; blockDoc = line[index + 2] === '*' || line[index + 2] === '!'; hasDoc ||= blockDoc; index++; continue;
      }
      const raw = /^(?:br|rb|r)(#+)?"/.exec(line.slice(index));
      if (raw) { hasCode = true; string = 'raw'; rawHashes = raw[1]?.length ?? 0; index += raw[0].length - 1; continue; }
      if ((current === 'b' && next === '"') || current === '"') { hasCode = true; string = 'normal'; if (current === 'b') index++; continue; }
      if (current === "'" && isCharLiteral(line, index)) { hasCode = true; string = 'char'; continue; }
      if (!/\s/.test(current)) hasCode = true;
    }
    todoCount += occurrences(commentText, /\bTODO\b/gi);
    fixmeCount += occurrences(commentText, /\bFIXME\b/gi);
    hackCount += occurrences(commentText, /\bHACK\b/gi);
    if (hasDoc) docCommentLines++;
    if (!hasCode && !hasComment && !line.trim()) blankLines++;
    else if (hasCode) codeLines++;
    else commentLines++;
  }
  return { lines: lines.length, blankLines, commentLines, codeLines, docCommentLines, todoCount, fixmeCount, hackCount };
}

export function unique<T>(items: T[]): T[] { return [...new Set(items)]; }

export function splitRustExpressions(value: string): string[] {
  const result: string[] = []; let start = 0; const stack: string[] = []; let quote = ''; let escaped = false;
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (quote) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === quote) quote = ''; continue; }
    if (char === '"' || (char === "'" && /^(?:\\.|[^'\\])'/.test(value.slice(index + 1)))) { quote = char; continue; }
    if (pairs[char]) stack.push(pairs[char]);
    else if (stack.at(-1) === char) stack.pop();
    else if (char === ',' && !stack.length) { result.push(value.slice(start, index).trim()); start = index + 1; }
  }
  result.push(value.slice(start).trim());
  return result.filter(Boolean);
}

function occurrences(value: string, pattern: RegExp): number { return [...value.matchAll(pattern)].length; }
function isCharLiteral(line: string, index: number): boolean { const rest = line.slice(index + 1); if (/^[A-Za-z_][A-Za-z0-9_]*\b/.test(rest) && !rest.startsWith("'")) return false; return /^(?:\\.|[^'\\])'/.test(rest); }
