import type { Brief } from '@/domain/brief';
import { normalizeTitle } from '@/domain/deck';
import { canonicalIngredient } from '@/domain/ingredients';
import type { Batch, Dish, Ingredient } from '@/domain/types';
import { stableHash } from '@/lib/id';

/** The loosely-typed shape any idea source produces before cleanup. */
export interface RawDish {
  title: string;
  description: string;
  cuisine: string;
  ideaKey: string;
  tags: string[];
  totalMinutes: number | null;
  ingredients: { name: string; family: string; role: 'main' | 'supporting' }[];
}

function clean(text: string, max: number): string {
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > max ? `${single.slice(0, max - 1).trimEnd()}…` : single;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanIngredients(list: RawDish['ingredients']): Ingredient[] {
  const seen = new Set<string>();
  const out: Ingredient[] = [];
  for (const item of list) {
    const name = clean(item.name, 60);
    const family = clean(item.family || item.name, 40).toLowerCase();
    const key = canonicalIngredient(family);
    if (!name || !key || seen.has(key)) continue;
    seen.add(key);
    out.push({ name, family, role: item.role === 'main' ? 'main' : 'supporting' });
  }
  return out.slice(0, 8);
}

/** Same dish, same id: derived from the meal and normalized title. */
export function dishId(meal: Dish['meal'], title: string): string {
  return stableHash(`${meal}:${normalizeTitle(title)}`);
}

/**
 * Turns raw idea-source output into trusted `Dish` records (spec AI-5, AI-6):
 * clamped text, deduped ingredients, and a stable id. Returns null for
 * unusable entries.
 */
export function toDish(raw: RawDish, brief: Brief, batch: Batch): Dish | null {
  const title = clean(raw.title, 80);
  const ingredients = cleanIngredients(raw.ingredients);
  if (!title || ingredients.length === 0) return null;
  const minutes =
    raw.totalMinutes && raw.totalMinutes > 0 && raw.totalMinutes < 24 * 60
      ? Math.round(raw.totalMinutes)
      : null;
  return {
    id: dishId(brief.meal, title),
    title,
    description: clean(raw.description, 140),
    meal: brief.meal,
    imageUrl: null,
    cuisine: clean(raw.cuisine, 24),
    ideaKey: slug(raw.ideaKey || title) || slug(title),
    tags: [...new Set(raw.tags.map((t) => clean(t, 20).toLowerCase()).filter(Boolean))].slice(0, 4),
    totalMinutes: minutes,
    ingredients,
    batchId: batch.id,
    fetchedAt: batch.requestedAt,
  };
}
