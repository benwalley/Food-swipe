import { describe, expect, it } from 'vitest';
import { normalizeUrl, stableHash } from './id';

describe('normalizeUrl', () => {
  it('strips www, hash, tracking params, and trailing slashes', () => {
    expect(normalizeUrl('https://WWW.Example.com/recipes/stew/?utm_source=x&id=2#top')).toBe(
      'https://example.com/recipes/stew?id=2',
    );
  });
});

describe('stableHash', () => {
  it('is deterministic and distinguishes inputs', () => {
    expect(stableHash('a')).toBe(stableHash('a'));
    expect(stableHash('a')).not.toBe(stableHash('b'));
  });
});
