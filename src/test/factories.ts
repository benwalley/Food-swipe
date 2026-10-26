import type { Dish, Ingredient, Meal, PrefEntry, Verdict, VerdictEvent } from '@/domain/types';

let seq = 0;

export function makeDish(overrides: Partial<Dish> & { id?: string } = {}): Dish {
  seq += 1;
  const id = overrides.id ?? `dish-${seq}`;
  return {
    id,
    title: overrides.title ?? `Dish ${id}`,
    description: 'A tasty dish.',
    meal: 'dinner',
    imageUrl: null,
    cuisine: 'Italian',
    ideaKey: overrides.ideaKey ?? `idea-${id}`,
    tags: [],
    totalMinutes: 30,
    ingredients: [ing('pasta', 'pasta', 'main')],
    batchId: 'batch-1',
    fetchedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

export function ing(name: string, family = name, role: Ingredient['role'] = 'main'): Ingredient {
  return { name, family, role };
}

export function makeEvent(
  dishId: string,
  verdict: Verdict,
  sessionId: string,
  at: string,
  meal: Meal = 'dinner',
): VerdictEvent {
  seq += 1;
  return {
    id: `ev-${seq}`,
    at,
    sessionId,
    dishId,
    ideaKey: `idea-${dishId}`,
    meal,
    verdict,
    prefsAtTime: {},
  };
}

export function pref(label: string, value: PrefEntry['pref']): PrefEntry {
  return { label, pref: value, updatedAt: '2026-10-01T00:00:00.000Z' };
}

export function index(dishes: Dish[]): Record<string, Dish> {
  return Object.fromEntries(dishes.map((d) => [d.id, d]));
}
