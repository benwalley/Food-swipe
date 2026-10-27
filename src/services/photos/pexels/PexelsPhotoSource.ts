import * as z from 'zod/mini';
import { tuning } from '@/config/tuning';
import type { Photo } from '@/domain/types';
import { isHttpsUrl } from '@/lib/url';
import type { PhotoQuery, PhotoSource } from '../PhotoSource';

const API = 'https://api.pexels.com/v1/search';

const searchResponse = z.object({
  photos: z.array(
    z.object({
      url: z.string(),
      photographer: z.string(),
      alt: z.optional(z.nullable(z.string())),
      src: z.object({ large: z.string(), tiny: z.string() }),
    }),
  ),
});

/** Words too generic to show a photo is of this dish. */
const STOP_WORDS = new Set(
  'and with the for from style easy quick simple classic homemade best one pan pot sheet slow cooker baked roasted grilled fried crispy creamy spicy stuffed braised seared smoked toasted loaded food dish meal'.split(
    ' ',
  ),
);

interface PexelsConfig {
  apiKey: string;
  fetch?: typeof fetch;
  now?: () => number;
}

/**
 * Searches Pexels by dish name. Results are stock photos rather than this
 * exact dish, so one is used only when its description mentions the dish or
 * a main ingredient. Backs off for a while when the hourly limit runs out.
 */
export class PexelsPhotoSource implements PhotoSource {
  private pausedUntil = 0;

  constructor(private readonly config: PexelsConfig) {}

  private get now(): number {
    return (this.config.now ?? Date.now)();
  }

  async find(
    dishes: readonly PhotoQuery[],
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<Map<string, Photo>> {
    const found = new Map<string, Photo>();
    const queue = [...dishes];
    const worker = async () => {
      for (let dish = queue.shift(); dish; dish = queue.shift()) {
        if (signal?.aborted || this.now < this.pausedUntil) return;
        try {
          const photo = await this.search(dish, signal);
          if (photo) found.set(dish.id, photo);
        } catch (error) {
          if (!signal?.aborted) console.warn('[photos] Pexels search failed', error);
        }
      }
    };
    const workers = Math.min(tuning.photos.pexelsConcurrency, queue.length);
    await Promise.all(Array.from({ length: workers }, worker));
    return found;
  }

  private async search(dish: PhotoQuery, signal?: AbortSignal): Promise<Photo | null> {
    const params = new URLSearchParams({
      query: dish.title,
      orientation: 'landscape',
      per_page: String(tuning.photos.pexelsCandidates),
    });
    const response = await (this.config.fetch ?? fetch)(`${API}?${params}`, {
      headers: { Authorization: this.config.apiKey },
      credentials: 'omit',
      signal,
    });
    if (response.status === 429) {
      this.pausedUntil = this.now + tuning.photos.pexelsPauseMs;
      return null;
    }
    if (response.status === 401 || response.status === 403) {
      console.warn('[photos] Pexels rejected the API key; skipping Pexels until reload.');
      this.pausedUntil = Infinity;
      return null;
    }
    if (!response.ok) throw new Error(`Pexels responded ${response.status}`);

    const { photos } = searchResponse.parse(await response.json());
    const wanted = keywords([
      dish.title,
      ...dish.ingredients.filter((i) => i.role === 'main').map((i) => i.family),
    ]);
    const match = photos.find(
      (p) =>
        p.alt &&
        [...keywords([p.alt])].some((word) => wanted.has(word)) &&
        isHttpsUrl(p.src.large) &&
        isHttpsUrl(p.src.tiny) &&
        isHttpsUrl(p.url),
    );
    if (!match) return null;
    return {
      url: match.src.large,
      thumbUrl: match.src.tiny,
      source: 'pexels',
      author: match.photographer.trim().slice(0, 40),
      license: '',
      pageUrl: match.url,
    };
  }
}

/** Distinctive words in singular form: "Roasted Tomatoes" → {"tomato"}. */
export function keywords(texts: string[]): Set<string> {
  const words = texts
    .join(' ')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z]+/);
  const out = new Set<string>();
  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word)) continue;
    out.add(singular(word));
  }
  return out;
}

function singular(word: string): string {
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('oes') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}
