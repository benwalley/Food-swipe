import { env } from '@/config/env';
import { newId } from '@/lib/id';
import { FixtureIdeaSource } from '@/services/ideas/fixtures/FixtureIdeaSource';
import type { IdeaSource } from '@/services/ideas/IdeaSource';
import { lazyIdeaSource } from '@/services/ideas/lazy';
import type { ApiKeyStore } from '@/services/keys/ApiKeyStore';
import { BrowserApiKeyStore } from '@/services/keys/BrowserApiKeyStore';
import { LocalStorageRepository } from '@/services/storage/LocalStorageRepository';
import type { Services } from '@/state/appStore';
import { createNotifier } from '@/state/notices';

function geminiSource(keys: ApiKeyStore): IdeaSource {
  const model = env.VITE_GEMINI_MODEL;
  return lazyIdeaSource(`Gemini (${model})`, () =>
    import('@/services/ideas/gemini/GeminiIdeaSource').then(
      (m) => new m.GeminiIdeaSource({ apiKey: () => keys.get(), model }),
    ),
  );
}

function ideaServices(): Pick<Services, 'ideas' | 'keys'> {
  if (env.VITE_IDEA_SOURCE === 'fixtures') return { ideas: new FixtureIdeaSource() };
  const keys = new BrowserApiKeyStore(window.localStorage, env.VITE_GEMINI_API_KEY);
  return { ideas: geminiSource(keys), keys };
}

/**
 * Composition root: the only place that picks concrete implementations.
 * Swapping in a backend means changing these constructors.
 */
export function createServices(): Services {
  return {
    repo: new LocalStorageRepository(),
    ...ideaServices(),
    notifier: createNotifier(),
    now: () => new Date(),
    newId,
  };
}
