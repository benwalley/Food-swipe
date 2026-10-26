import { describe, expect, it } from 'vitest';
import type { Brief } from '@/domain/brief';
import { IdeaSourceError } from '../IdeaSource';
import { extractSearchSuggestions, parseDishes, toIdeaError } from './GeminiIdeaSource';
import { geminiResponseSchema } from './schema';

const brief = { meal: 'dinner', count: 10 } as Brief;
const batch = {
  id: 'b1',
  meal: 'dinner' as const,
  requestedAt: '2026-10-26T00:00:00.000Z',
  searchSuggestions: [],
};

const good = {
  title: 'Thai Green Curry',
  description: 'Fragrant and creamy.',
  recipeUrl: 'https://www.recipetineats.com/thai-green-curry/',
  sourceName: 'RecipeTin Eats',
  imageUrl: null,
  cuisine: 'Thai',
  ideaKey: 'Thai Curry',
  tags: ['Spicy'],
  totalMinutes: 35,
  ingredients: [
    { name: 'chicken thighs', family: 'chicken', role: 'main' },
    { name: 'coconut milk', family: 'coconut', role: 'main' },
  ],
};

describe('parseDishes', () => {
  it('keeps valid dishes and drops invalid or redirect-linked ones', () => {
    const output = JSON.stringify({
      dishes: [
        good,
        { ...good, title: 'Broken', ingredients: 'nope' },
        {
          ...good,
          title: 'Redirected',
          recipeUrl: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/x',
        },
      ],
    });
    const dishes = parseDishes(output, brief, batch);
    expect(dishes).toHaveLength(1);
    expect(dishes[0]).toMatchObject({
      title: 'Thai Green Curry',
      ideaKey: 'thai-curry',
      tags: ['spicy'],
      meal: 'dinner',
      batchId: 'b1',
    });
  });

  it('gives the same dish the same id regardless of URL noise', () => {
    const a = parseDishes(JSON.stringify({ dishes: [good] }), brief, batch)[0]!;
    const b = parseDishes(
      JSON.stringify({
        dishes: [{ ...good, recipeUrl: 'https://recipetineats.com/thai-green-curry?utm_source=x' }],
      }),
      brief,
      batch,
    )[0]!;
    expect(a.id).toBe(b.id);
  });

  it('rejects non-JSON output', () => {
    expect(() => parseDishes('not json', brief, batch)).toThrow(IdeaSourceError);
  });
});

describe('extractSearchSuggestions', () => {
  it('collects unique suggestion snippets from search result steps', () => {
    const steps = [
      { type: 'google_search_call', id: '1', arguments: {} },
      {
        type: 'google_search_result',
        call_id: '1',
        result: [{ search_suggestions: '<div>a</div>' }],
      },
      {
        type: 'google_search_result',
        call_id: '2',
        result: [{ search_suggestions: '<div>a</div>' }, { search_suggestions: '<div>b</div>' }],
      },
    ];
    expect(extractSearchSuggestions({ steps } as never)).toEqual(['<div>a</div>', '<div>b</div>']);
  });
});

describe('toIdeaError', () => {
  it('maps HTTP failures to error kinds', () => {
    expect((toIdeaError({ statusCode: 429, message: 'slow down' }) as IdeaSourceError).kind).toBe(
      'quota',
    );
    expect(
      (
        toIdeaError(
          Object.assign(new Error('API key not valid'), { status: 400 }),
        ) as IdeaSourceError
      ).kind,
    ).toBe('auth');
    expect((toIdeaError(new TypeError('fetch failed')) as IdeaSourceError).kind).toBe('network');
  });

  it('passes aborts through untouched', () => {
    const abort = new DOMException('Aborted', 'AbortError');
    expect(toIdeaError(abort)).toBe(abort);
  });
});

describe('geminiResponseSchema', () => {
  it('produces a plain JSON schema without a $schema header', () => {
    const schema = geminiResponseSchema(10) as {
      properties: { dishes: { maxItems: number; items: Record<string, unknown> } };
    };
    expect(schema.properties.dishes.maxItems).toBe(10);
    expect(schema.properties.dishes.items.$schema).toBeUndefined();
  });
});
