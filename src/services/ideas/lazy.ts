import type { IdeaSource } from './IdeaSource';

/**
 * Defers loading an idea source's code (e.g. the Gemini SDK) until the first
 * batch is requested, keeping it out of the initial bundle.
 */
export function lazyIdeaSource(label: string, load: () => Promise<IdeaSource>): IdeaSource {
  let source: Promise<IdeaSource> | null = null;
  return {
    label,
    async fetchBatch(brief, options) {
      source ??= load().catch((error: unknown) => {
        source = null;
        throw error;
      });
      return (await source).fetchBatch(brief, options);
    },
  };
}
