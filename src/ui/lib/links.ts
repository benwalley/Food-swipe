import type { Dish } from '@/domain/types';

/** A web search for recipes of this dish. Ideas come without links, so this is the way out. */
export function recipeSearchUrl(dish: Pick<Dish, 'title'>): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`${dish.title} recipe`)}`;
}
