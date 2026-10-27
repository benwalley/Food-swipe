import { describe, expect, it } from 'vitest';
import type { Brief } from '@/domain/brief';
import { IdeaSourceError } from '../IdeaSource';
import { parseDishes, toIdeaError } from './GeminiIdeaSource';
import { geminiResponseSchema } from './schema';

const brief = { meal: 'dinner', count: 10 } as Brief;
const batch = { id: 'b1', meal: 'dinner' as const, requestedAt: '2026-10-26T00:00:00.000Z' };

const good = {
  title: 'Thai Green Curry',
  wikipediaTitle: 'Green curry',
  description: 'Fragrant and creamy.',
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
  it('keeps valid dishes and drops invalid ones', () => {
    const output = JSON.stringify({
      dishes: [good, { ...good, title: 'Broken', ingredients: 'nope' }, { ...good, title: '  ' }],
    });
    const dishes = parseDishes(output, brief, batch);
    expect(dishes).toHaveLength(1);
    expect(dishes[0]).toMatchObject({
      title: 'Thai Green Curry',
      ideaKey: 'thai-curry',
      tags: ['spicy'],
      meal: 'dinner',
      wikipediaTitle: 'Green curry',
      photo: null,
      batchId: 'b1',
    });
  });

  it('gives the same dish the same id regardless of title punctuation or case', () => {
    const a = parseDishes(JSON.stringify({ dishes: [good] }), brief, batch)[0]!;
    const b = parseDishes(
      JSON.stringify({ dishes: [{ ...good, title: 'thai green curry!' }] }),
      brief,
      batch,
    )[0]!;
    expect(a.id).toBe(b.id);
  });

  it('dedupes ingredients by family and drops absurd times', () => {
    const output = JSON.stringify({
      dishes: [
        {
          ...good,
          totalMinutes: 99999,
          ingredients: [
            ...good.ingredients,
            { name: 'chicken breast', family: 'Chicken', role: 'main' },
          ],
        },
      ],
    });
    const [dish] = parseDishes(output, brief, batch);
    expect(dish!.ingredients.map((i) => i.family)).toEqual(['chicken', 'coconut']);
    expect(dish!.totalMinutes).toBeNull();
  });

  it('keeps a dish whose Wikipedia title is missing or unusable, without the title', () => {
    const withoutTitle: Partial<typeof good> = { ...good };
    delete withoutTitle.wikipediaTitle;
    const output = JSON.stringify({
      dishes: [withoutTitle, { ...good, title: 'Red Curry', wikipediaTitle: 'Curry|Red' }],
    });
    const dishes = parseDishes(output, brief, batch);
    expect(dishes.map((d) => d.wikipediaTitle)).toEqual([null, null]);
  });

  it('rejects non-JSON output', () => {
    expect(() => parseDishes('not json', brief, batch)).toThrow(IdeaSourceError);
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

  it('asks Gemini for a Wikipedia title on every dish', () => {
    const schema = geminiResponseSchema(10) as {
      properties: { dishes: { items: { required: string[] } } };
    };
    expect(schema.properties.dishes.items.required).toContain('wikipediaTitle');
  });
});
