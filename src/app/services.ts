import { env } from '@/config/env';
import { newId } from '@/lib/id';
import { FixtureIdeaSource } from '@/services/ideas/fixtures/FixtureIdeaSource';
import type { IdeaSource } from '@/services/ideas/IdeaSource';
import { lazyIdeaSource } from '@/services/ideas/lazy';
import { LocalStorageRepository } from '@/services/storage/LocalStorageRepository';
import type { Services } from '@/state/appStore';
import { createNotifier } from '@/state/notices';

function geminiSource(): IdeaSource {
  const config = { apiKey: env.VITE_GEMINI_API_KEY, model: env.VITE_GEMINI_MODEL };
  return lazyIdeaSource(`Gemini (${config.model}) with Google Search`, () =>
    import('@/services/ideas/gemini/GeminiIdeaSource').then((m) => new m.GeminiIdeaSource(config)),
  );
}

/**
 * Composition root: the only place that picks concrete implementations.
 * Swapping in a backend means changing these two constructors.
 */
export function createServices(): Services {
  return {
    repo: new LocalStorageRepository(),
    ideas: env.VITE_IDEA_SOURCE === 'fixtures' ? new FixtureIdeaSource() : geminiSource(),
    notifier: createNotifier(),
    now: () => new Date(),
    newId,
  };
}
