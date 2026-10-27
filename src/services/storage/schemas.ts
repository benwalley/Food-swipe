// zod/mini keeps validation out of the main bundle's critical weight.
import * as z from 'zod/mini';
import { MEALS, MOOD_TAGS } from '@/domain/types';

/** Runtime validation for data read back from storage (never trust disk). */
const meal = z.enum(MEALS);
const verdict = z.enum(['nah', 'never', 'into', 'super']);
const ingredientPref = z.enum(['love', 'meh', 'never']);

const photoSchema = z.object({
  url: z.string(),
  thumbUrl: z.string(),
  source: z.enum(['wikipedia', 'pexels']),
  author: z.string(),
  license: z.string(),
  pageUrl: z.string(),
});

/** Optional with a null default, so dishes saved before photos existed still load. */
const nullByDefault = <T extends z.ZodMiniType>(schema: T) =>
  z._default(z.optional(z.nullable(schema)), null);

export const dishSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  meal,
  wikipediaTitle: nullByDefault(z.string()),
  photo: nullByDefault(photoSchema),
  cuisine: z.string(),
  ideaKey: z.string(),
  tags: z.array(z.string()),
  totalMinutes: z.nullable(z.number()),
  ingredients: z.array(
    z.object({ name: z.string(), family: z.string(), role: z.enum(['main', 'supporting']) }),
  ),
  batchId: z.string(),
  fetchedAt: z.string(),
});

export const batchSchema = z.object({
  id: z.string(),
  meal,
  requestedAt: z.string(),
});

export const eventSchema = z.object({
  id: z.string(),
  at: z.string(),
  sessionId: z.string(),
  dishId: z.string(),
  ideaKey: z.string(),
  meal,
  verdict,
  prefsAtTime: z.record(z.string(), ingredientPref),
});

export const prefEntrySchema = z.object({
  label: z.string(),
  pref: ingredientPref,
  updatedAt: z.string(),
});
export const savedEntrySchema = z.object({ dishId: z.string(), savedAt: z.string() });

const deckSchema = z.object({
  queue: z.array(z.string()),
  seen: z.array(z.string()),
  hiddenIdeas: z.array(z.string()),
  reshows: z.array(z.string()),
  verdictsSinceFetch: z.number(),
});

export const sessionSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  lastActiveAt: z.string(),
  activeMeal: meal,
  mood: z.object({ tags: z.array(z.enum(MOOD_TAGS)), note: z.string() }),
  decks: z.object(
    Object.fromEntries(MEALS.map((m) => [m, deckSchema])) as Record<
      (typeof MEALS)[number],
      typeof deckSchema
    >,
  ),
});

export const collectionSchemas = {
  events: z.array(eventSchema),
  prefs: z.record(z.string(), prefEntrySchema),
  saved: z.record(z.string(), savedEntrySchema),
  restores: z.record(z.string(), z.string()),
  dishes: z.record(z.string(), dishSchema),
  batches: z.record(z.string(), batchSchema),
  session: z.nullable(sessionSchema),
  onboarded: z.boolean(),
} as const;

export type CollectionName = keyof typeof collectionSchemas;
