import type { Brief } from '@/domain/brief';
import type { Batch, Dish } from '@/domain/types';

export interface IdeaBatch {
  batch: Batch;
  dishes: Dish[];
}

/**
 * Where meal ideas come from. Today: Gemini called from the browser. Later:
 * the same brief posted to a backend that holds the key and caches results.
 */
export interface IdeaSource {
  readonly label: string;
  fetchBatch(brief: Brief, options?: { signal?: AbortSignal }): Promise<IdeaBatch>;
}

export type IdeaErrorKind = 'config' | 'auth' | 'quota' | 'network' | 'invalid-output' | 'unknown';

export class IdeaSourceError extends Error {
  constructor(
    readonly kind: IdeaErrorKind,
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'IdeaSourceError';
  }

  get retryable(): boolean {
    return (
      this.kind === 'network' ||
      this.kind === 'quota' ||
      this.kind === 'invalid-output' ||
      this.kind === 'unknown'
    );
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
