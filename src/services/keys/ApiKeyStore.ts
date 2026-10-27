/** Where the key in use came from: pasted into this browser, set at build time, or neither. */
export type KeySource = 'browser' | 'build' | 'none';

/**
 * Holds the Gemini API key for an idea source that calls Gemini straight from
 * the browser. A backend makes this unnecessary: the key lives on the server
 * and the client never sees it.
 */
export interface ApiKeyStore {
  /** The key to use, or '' when there is none. */
  get(): string;
  source(): KeySource;
  set(key: string): void;
  /** Forgets the pasted key. A build-time key still applies. */
  clear(): void;
}
