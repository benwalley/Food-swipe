import { env } from '@/config/env';
import { newId } from '@/lib/id';
import { FixtureIdeaSource } from '@/services/ideas/fixtures/FixtureIdeaSource';
import type { IdeaSource } from '@/services/ideas/IdeaSource';
import { lazyIdeaSource } from '@/services/ideas/lazy';
import type { ApiKeyStore } from '@/services/keys/ApiKeyStore';
import { BrowserApiKeyStore } from '@/services/keys/BrowserApiKeyStore';
import { firstMatch } from '@/services/photos/firstMatch';
import { PexelsPhotoSource } from '@/services/photos/pexels/PexelsPhotoSource';
import type { PhotoSource } from '@/services/photos/PhotoSource';
import { WikipediaPhotoSource } from '@/services/photos/wikipedia/WikipediaPhotoSource';
import { withPhotos } from '@/services/photos/withPhotos';
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

/** Wikipedia first, as it names the exact dish; Pexels stock photos when it has none. */
function photoSource(): PhotoSource {
  const apiKey = env.VITE_PEXELS_API_KEY;
  const wikipedia = new WikipediaPhotoSource();
  return apiKey ? firstMatch(wikipedia, new PexelsPhotoSource({ apiKey })) : wikipedia;
}

function ideaServices(): Pick<Services, 'ideas' | 'keys'> {
  if (env.VITE_IDEA_SOURCE === 'fixtures') {
    return { ideas: withPhotos(new FixtureIdeaSource(), photoSource()) };
  }
  const keys = new BrowserApiKeyStore(window.localStorage, env.VITE_GEMINI_API_KEY);
  return { ideas: withPhotos(geminiSource(keys), photoSource()), keys };
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
