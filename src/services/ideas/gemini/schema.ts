import { z } from 'zod';

/** What Gemini must return. Validated per dish so one bad entry doesn't sink a batch. */
export const aiDishSchema = z.object({
  title: z.string().describe('Dish name, short and appetizing. No site name.'),
  description: z.string().describe('One enticing sentence, at most 120 characters.'),
  recipeUrl: z.string().describe('Direct URL of a single recipe page from the search results.'),
  sourceName: z.string().describe('Publisher name, e.g. "Serious Eats".'),
  imageUrl: z.string().nullable().describe('Direct image URL of this exact dish, or null.'),
  cuisine: z.string().describe('One or two words, e.g. "Thai" or "Tex-Mex".'),
  ideaKey: z
    .string()
    .describe('Lowercase-hyphenated general idea shared by variations, e.g. "thai-curry".'),
  tags: z.array(z.string()).describe('Up to 4 lowercase descriptors, e.g. "one-pan".'),
  totalMinutes: z.number().nullable().describe('Total time in minutes if known, else null.'),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe('As written, e.g. "cremini mushrooms".'),
        family: z
          .string()
          .describe(
            'Everyday ingredient people have opinions about, lowercase, e.g. "mushrooms", "cheese", "cilantro". Never a category.',
          ),
        role: z.enum(['main', 'supporting']),
      }),
    )
    .describe('4 to 8 character-defining ingredients; no pantry basics.'),
});

export const aiBatchSchema = z.object({ dishes: z.array(z.unknown()) });

/** JSON Schema sent to Gemini (its supported subset; no $schema header). */
export function geminiResponseSchema(maxDishes: number): Record<string, unknown> {
  const dish = z.toJSONSchema(aiDishSchema) as Record<string, unknown>;
  delete dish.$schema;
  return {
    type: 'object',
    properties: { dishes: { type: 'array', maxItems: maxDishes, items: dish } },
    required: ['dishes'],
  };
}
