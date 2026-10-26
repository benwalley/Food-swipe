import { ExternalLink } from 'lucide-react';
import type { Dish } from '@/domain/types';

export function RecipeLink({ dish }: { dish: Dish }) {
  return (
    <a
      href={dish.recipeUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-no-drag
      className="flex h-12 items-center justify-between gap-3 rounded-full border border-line-strong px-5 text-[15px] font-semibold transition-colors hover:bg-surface-2"
    >
      <span className="truncate">
        View recipe <span className="font-medium text-ink-3">· {dish.sourceName}</span>
      </span>
      <ExternalLink className="size-4 shrink-0 text-ink-2" strokeWidth={2} />
    </a>
  );
}
