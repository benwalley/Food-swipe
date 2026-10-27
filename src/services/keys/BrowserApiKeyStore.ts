import type { ApiKeyStore, KeySource } from './ApiKeyStore';

const STORAGE_KEY = 'food-swipe:gemini-api-key';

/**
 * Keeps a pasted key in this browser's localStorage, so a public build can
 * ship without one. Falls back to `VITE_GEMINI_API_KEY` for local development.
 */
export class BrowserApiKeyStore implements ApiKeyStore {
  private saved: string;

  constructor(
    private readonly storage: Storage = window.localStorage,
    private readonly buildKey = '',
  ) {
    this.saved = readSaved(storage);
  }

  get(): string {
    return this.saved || this.buildKey;
  }

  source(): KeySource {
    if (this.saved) return 'browser';
    return this.buildKey ? 'build' : 'none';
  }

  set(key: string): void {
    this.saved = key.trim();
    try {
      if (this.saved) this.storage.setItem(STORAGE_KEY, this.saved);
      else this.storage.removeItem(STORAGE_KEY);
    } catch {
      // Storage may be full or disabled; the key still works until the page reloads.
    }
  }

  clear(): void {
    this.set('');
  }
}

function readSaved(storage: Storage): string {
  try {
    return storage.getItem(STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}
