import { createHash } from 'node:crypto';

export interface DiscriminatorValue { value: string; resolved: boolean; }

/** Reproduce Anchor's default `sha256("namespace:name")[0..8]` discriminator. */
export function anchorDiscriminator(namespace: 'global' | 'account' | 'event', name: string): string {
  return `[${[...createHash('sha256').update(`${namespace}:${name.replace(/^r#/, '')}`).digest().subarray(0, 8)].join(',')}]`;
}

/** Resolve literal forms accepted by Anchor without evaluating arbitrary Rust. */
export function resolveRustDiscriminator(expression: string | undefined): DiscriminatorValue | undefined {
  if (!expression) return undefined;
  const value = expression.trim().replace(/^&\s*/, '');
  const integer = rustInteger(value);
  if (integer !== undefined && integer >= 0 && integer <= 255) return { value: `[${integer}]`, resolved: true };
  const array = /^\[([\s\S]*)\]$/.exec(value);
  if (array) {
    const values = array[1].split(',').map(item => item.trim()).filter(Boolean).map(rustInteger);
    if (values.every((item): item is number => item !== undefined && item >= 0 && item <= 255)) return { value: `[${values.join(',')}]`, resolved: true };
  }
  const bytes = /^b"((?:\\.|[^"\\])*)"$/.exec(value)?.[1];
  if (bytes !== undefined) {
    const decoded = decodeRustByteString(bytes);
    if (decoded) return { value: `[${decoded.join(',')}]`, resolved: true };
  }
  return { value, resolved: false };
}

export function isResolvedDiscriminator(value: string | undefined): boolean {
  return !!value && (/^\[(?:\d+,?)*\]$/.test(value.replace(/\s+/g, '')) || rustInteger(value) !== undefined);
}

function rustInteger(value: string): number | undefined {
  const normalized = value.trim().replace(/_(?=[0-9a-f])/gi, '').replace(/(?:u|i)(?:8|16|32|64|128|size)$/i, '');
  if (!/^(?:0x[0-9a-f]+|0o[0-7]+|0b[01]+|\d+)$/i.test(normalized)) return undefined;
  const result = Number(BigInt(normalized));
  return Number.isSafeInteger(result) ? result : undefined;
}

function decodeRustByteString(value: string): number[] | undefined {
  const output: number[] = [];
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char !== '\\') { if (char.charCodeAt(0) > 0x7f) return undefined; output.push(char.charCodeAt(0)); continue; }
    const escape = value[++index];
    if (escape === undefined) return undefined;
    const simple: Record<string, number> = { n: 10, r: 13, t: 9, '0': 0, '\\': 92, '"': 34 };
    if (simple[escape] !== undefined) { output.push(simple[escape]); continue; }
    if (escape === 'x') {
      const hex = value.slice(index + 1, index + 3); if (!/^[0-9a-f]{2}$/i.test(hex)) return undefined;
      output.push(Number.parseInt(hex, 16)); index += 2; continue;
    }
    return undefined;
  }
  return output;
}
