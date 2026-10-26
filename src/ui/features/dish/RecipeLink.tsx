import { Search } from 'lucide-react';
import type { Dish } from '@/domain/types';
import { recipeSearchUrl } from '@/ui/lib/links';

/** Opens a web search for recipes of this dish in a new tab. */
export function RecipeLink({ dish }: { dish: Dish }) {
  return (
    <a
      href={recipeSearchUrl(dish)}
      target="_blank"
      rel="noopener noreferrer"
      data-no-drag
      className="flex h-12 items-center justify-center gap-2 rounded-full border border-line-strong px-5 text-[15px] font-semibold transition-colors hover:bg-surface-2"
    >
      <Search className="size-4 shrink-0 text-ink-2" strokeWidth={2.25} />
      Find a recipe
    </a>
  );
}
