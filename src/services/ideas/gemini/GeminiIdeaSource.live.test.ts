import { describe, expect, it } from 'vitest';
import { buildBrief } from '@/domain/brief';
import { createSession } from '@/domain/session';
import { GeminiIdeaSource } from './GeminiIdeaSource';

/**
 * Hits the real Gemini API. Skipped unless GEMINI_LIVE_KEY is set:
 *   GEMINI_LIVE_KEY=... npx vitest run src/services/ideas/gemini/GeminiIdeaSource.live.test.ts
 */
const key = process.env.GEMINI_LIVE_KEY;

describe.skipIf(!key)('GeminiIdeaSource (live)', () => {
  it('returns real, validated dinner ideas with search attribution', async () => {
    const source = new GeminiIdeaSource({
      apiKey: key!,
      model: process.env.GEMINI_LIVE_MODEL ?? 'gemini-3.8-flash',
    });
    const now = new Date();
    const brief = buildBrief({
      meal: 'dinner',
      count: 10,
      angle: 'quick and easy, ready in 30 minutes or less',
      now,
      session: createSession('live', now),
      events: [],
      dishes: {},
      prefs: {},
      saved: {},
      memory: new Map(),
    });
    const started = Date.now();
    const { batch, dishes } = await source.fetchBatch(brief);
    console.info(
      `[live] ${dishes.length} dishes in ${Date.now() - started}ms, ${batch.searchSuggestions.length} suggestion snippets`,
    );
    for (const d of dishes)
      console.info(
        `[live] ${d.title} | ${d.sourceName} | ${d.recipeUrl} | img=${d.imageUrl ? 'yes' : 'no'} | ${d.ingredients.map((i) => `${i.family}${i.role === 'main' ? '*' : ''}`).join(', ')}`,
      );
    expect(dishes.length).toBeGreaterThanOrEqual(5);
    expect(batch.searchSuggestions.length).toBeGreaterThan(0);
    for (const dish of dishes) {
      expect(dish.recipeUrl).toMatch(/^https?:\/\//);
      expect(dish.ingredients.length).toBeGreaterThan(0);
    }
  }, 150_000);
});
