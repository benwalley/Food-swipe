import type { Brief } from '@/domain/brief';
import { canonicalIngredient } from '@/domain/ingredients';
import type { Batch, Dish, Ingredient } from '@/domain/types';
import { normalizeUrl, stableHash } from '@/lib/id';

/** The loosely-typed shape any idea source produces before cleanup. */
export interface RawDish {
  title: string;
  description: string;
  recipeUrl: string;
  sourceName: string;
  imageUrl: string | null;
  cuisine: string;
  ideaKey: string;
  tags: string[];
  totalMinutes: number | null;
  ingredients: { name: string; family: string; role: 'main' | 'supporting' }[];
}

const REDIRECT_HOSTS = ['vertexaisearch.cloud.google.com', 'google.com', 'www.google.com'];

function httpUrl(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
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

/**
 * Turns raw idea-source output into trusted `Dish` records (spec AI-5, AI-6):
 * real http(s) recipe links only, clamped text, deduped ingredients, and an
 * id derived from the normalized URL. Returns null for unusable entries.
 */
export function toDish(raw: RawDish, brief: Brief, batch: Batch): Dish | null {
  const recipe = httpUrl(raw.recipeUrl);
  if (!recipe || REDIRECT_HOSTS.includes(recipe.hostname)) return null;
  const title = clean(raw.title, 80);
  const ingredients = cleanIngredients(raw.ingredients);
  if (!title || ingredients.length === 0) return null;
  const image = httpUrl(raw.imageUrl);
  const minutes =
    raw.totalMinutes && raw.totalMinutes > 0 && raw.totalMinutes < 24 * 60
      ? Math.round(raw.totalMinutes)
      : null;
  const normalized = normalizeUrl(recipe.toString());
  return {
    id: stableHash(normalized),
    title,
    description: clean(raw.description, 140),
    meal: brief.meal,
    recipeUrl: recipe.toString(),
    sourceName: clean(raw.sourceName, 40) || recipe.hostname.replace(/^www\./, ''),
    imageUrl: image?.protocol === 'https:' ? image.toString() : null,
    cuisine: clean(raw.cuisine, 24),
    ideaKey: slug(raw.ideaKey || title) || slug(title),
    tags: [...new Set(raw.tags.map((t) => clean(t, 20).toLowerCase()).filter(Boolean))].slice(0, 4),
    totalMinutes: minutes,
    ingredients,
    batchId: batch.id,
    fetchedAt: batch.requestedAt,
  };
}
