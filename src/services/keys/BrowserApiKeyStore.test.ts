import { beforeEach, describe, expect, it } from 'vitest';
import { BrowserApiKeyStore } from './BrowserApiKeyStore';

describe('BrowserApiKeyStore', () => {
  beforeEach(() => localStorage.clear());

  it('has no key until one is pasted', () => {
    const keys = new BrowserApiKeyStore(localStorage);
    expect(keys.get()).toBe('');
    expect(keys.source()).toBe('none');
  });

  it('saves a trimmed key that survives a reload', () => {
    new BrowserApiKeyStore(localStorage).set('  test-key  ');
    const reloaded = new BrowserApiKeyStore(localStorage);
    expect(reloaded.get()).toBe('test-key');
    expect(reloaded.source()).toBe('browser');
  });

  it('prefers a pasted key over the build key, and falls back when cleared', () => {
    const keys = new BrowserApiKeyStore(localStorage, 'build-key');
    expect(keys.source()).toBe('build');
    keys.set('pasted-key');
    expect(keys.get()).toBe('pasted-key');
    keys.clear();
    expect(keys.get()).toBe('build-key');
    expect(new BrowserApiKeyStore(localStorage).source()).toBe('none');
  });

  it('keeps working when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => undefined,
    } as unknown as Storage;
    const keys = new BrowserApiKeyStore(broken);
    keys.set('test-key');
    expect(keys.get()).toBe('test-key');
  });
});
