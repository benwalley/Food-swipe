import { describe, expect, it } from 'vitest';
import { buildBrief } from '@/domain/brief';
import { hasNeverIngredient } from '@/domain/ingredients';
import { createSession } from '@/domain/session';
import { GeminiIdeaSource } from './GeminiIdeaSource';

/**
 * Hits the real Gemini API. Skipped unless GEMINI_LIVE_KEY is set:
 *   GEMINI_LIVE_KEY=... npx vitest run src/services/ideas/gemini/GeminiIdeaSource.live.test.ts
 */
const key = process.env.GEMINI_LIVE_KEY;

describe.skipIf(!key)('GeminiIdeaSource (live)', () => {
  it('returns validated dinner ideas that respect a Never ingredient', async () => {
    const source = new GeminiIdeaSource({
      apiKey: key!,
      model: process.env.GEMINI_LIVE_MODEL ?? 'gemini-3.8-flash',
    });
    const now = new Date();
    const prefs = {
      mushroom: { label: 'Mushrooms', pref: 'never' as const, updatedAt: now.toISOString() },
    };
    const brief = buildBrief({
      meal: 'dinner',
      count: Number(process.env.GEMINI_LIVE_COUNT ?? 10),
      angle: 'quick and easy, ready in 30 minutes or less',
      now,
      session: createSession('live', now),
      events: [],
      dishes: {},
      prefs,
      saved: {},
      memory: new Map(),
    });
    const started = Date.now();
    const { dishes } = await source.fetchBatch(brief);
    console.info(`[live] ${dishes.length} dishes in ${Date.now() - started}ms`);
    for (const d of dishes) {
      const ingredients = d.ingredients.map((i) => `${i.family}${i.role === 'main' ? '*' : ''}`);
      console.info(
        `[live] ${d.title} (${d.cuisine}, ${d.totalMinutes} min) | ${ingredients.join(', ')}`,
      );
    }
    expect(dishes.length).toBeGreaterThanOrEqual(Math.min(8, brief.count - 1));
    for (const dish of dishes) {
      expect(dish.ingredients.length).toBeGreaterThan(0);
      expect(hasNeverIngredient(dish, prefs)).toBe(false);
    }
  }, 120_000);
});
