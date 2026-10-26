import type { Brief } from '@/domain/brief';
import { normalizeTitle } from '@/domain/deck';
import type { Batch, Meal } from '@/domain/types';
import { newId } from '@/lib/id';
import type { IdeaBatch, IdeaSource } from '../IdeaSource';
import { toDish, type RawDish } from '../normalize';
import { SAMPLE_DISHES } from './sampleDishes';

/**
 * Offline idea source with sample data. Used for tests, design work, and
 * development without spending API quota (VITE_IDEA_SOURCE=fixtures).
 */
export class FixtureIdeaSource implements IdeaSource {
  readonly label = 'Sample ideas (offline)';

  constructor(
    private readonly options: { delayMs?: number; data?: Record<Meal, RawDish[]> } = {},
  ) {}

  async fetchBatch(brief: Brief, { signal }: { signal?: AbortSignal } = {}): Promise<IdeaBatch> {
    await wait(this.options.delayMs ?? 700, signal);
    const batch: Batch = { id: newId(), meal: brief.meal, requestedAt: new Date().toISOString() };
    const avoid = new Set(brief.avoidTitles.map(normalizeTitle));
    const pool = (this.options.data ?? SAMPLE_DISHES)[brief.meal].filter(
      (d) => !avoid.has(normalizeTitle(d.title)),
    );
    const dishes = shuffle(pool)
      .slice(0, brief.count)
      .flatMap((raw) => {
        const dish = toDish(raw, brief, batch);
        return dish ? [dish] : [];
      });
    return { batch, dishes };
  }
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
