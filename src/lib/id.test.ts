import { describe, expect, it } from 'vitest';
import { stableHash } from './id';

describe('stableHash', () => {
  it('is deterministic and distinguishes inputs', () => {
    expect(stableHash('a')).toBe(stableHash('a'));
    expect(stableHash('a')).not.toBe(stableHash('b'));
  });
});
