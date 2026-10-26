/** Random UUID for records that may later sync to a backend. */
export function newId(): string {
  return crypto.randomUUID();
}

/**
 * Small, fast, stable string hash (FNV-1a, 52-bit) rendered in base 36.
 * Used for deterministic dish ids, not for security.
 */
export function stableHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  const hi = (h2 >>> 0) & 0x1fffff;
  return (hi * 0x100000000 + (h1 >>> 0)).toString(36);
}
