import { z } from 'zod';

/** What Gemini must return. Validated per dish so one bad entry doesn't sink a batch. */
export const aiDishSchema = z.object({
  title: z.string().describe('The dish name people would search for, short and appetizing.'),
  // A default keeps it required in the schema Gemini sees, while a dish without it still parses.
  wikipediaTitle: z
    .string()
    .nullable()
    .default(null)
    .describe(
      'Exact title of the English Wikipedia article about this dish, e.g. "Shakshouka", or null.',
    ),
  description: z.string().describe('One enticing sentence, at most 120 characters.'),
  cuisine: z.string().describe('One or two words, e.g. "Thai" or "Tex-Mex".'),
  ideaKey: z
    .string()
    .describe('Lowercase-hyphenated general idea shared by variations, e.g. "thai-curry".'),
  tags: z.array(z.string()).describe('Up to 4 lowercase descriptors, e.g. "one-pan".'),
  totalMinutes: z.number().nullable().describe('Typical total time in minutes, or null.'),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe('As usually written, e.g. "cremini mushrooms".'),
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
