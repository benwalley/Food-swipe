import { env } from '@/config/env';
import { newId } from '@/lib/id';
import { FixtureIdeaSource } from '@/services/ideas/fixtures/FixtureIdeaSource';
import { GeminiIdeaSource } from '@/services/ideas/gemini/GeminiIdeaSource';
import type { IdeaSource } from '@/services/ideas/IdeaSource';
import { LocalStorageRepository } from '@/services/storage/LocalStorageRepository';
import type { Services } from '@/state/appStore';
import { createNotifier } from '@/state/notices';

/**
 * Composition root: the only place that picks concrete implementations.
 * Swapping in a backend means changing these two constructors.
 */
export function createServices(): Services {
  const ideas: IdeaSource =
    env.VITE_IDEA_SOURCE === 'fixtures'
      ? new FixtureIdeaSource()
      : new GeminiIdeaSource({ apiKey: env.VITE_GEMINI_API_KEY, model: env.VITE_GEMINI_MODEL });

  return {
    repo: new LocalStorageRepository(),
    ideas,
    notifier: createNotifier(),
    now: () => new Date(),
    newId,
  };
}
