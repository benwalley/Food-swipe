import { Bookmark, Clock, Heart, RotateCcw, Star } from 'lucide-react';
import type { MemoryLine } from '@/domain/memory';
import type { Batch, Dish } from '@/domain/types';
import { DishArt } from '@/ui/components/DishArt';
import { SearchSuggestions } from '@/ui/components/SearchSuggestions';
import { metaLine } from '@/ui/lib/format';
import { IngredientRatings } from '../dish/IngredientRatings';
import { RecipeLink } from '../dish/RecipeLink';

const MEMORY: Record<MemoryLine['kind'], { icon: typeof Clock; text: (m: MemoryLine) => string }> =
  {
    staple: { icon: Star, text: () => 'One of your staples' },
    saved: { icon: Bookmark, text: () => 'On your list' },
    liked: { icon: Heart, text: () => 'You liked this before' },
    passed: {
      icon: Clock,
      text: (m) =>
        m.kind === 'passed' && m.lastChance ? 'Passed once · last chance' : 'Passed before',
    },
  };

interface FrontProps {
  dish: Dish;
  memory: MemoryLine | null;
  onFlip: () => void;
}

/** Front of the card: the art, then the dish set like a menu entry. */
export function CardFront({ dish, memory, onFlip }: FrontProps) {
  const meta = metaLine(dish);
  const memoryInfo = memory ? MEMORY[memory.kind] : null;
  const MemoryIcon = memoryInfo?.icon;
  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-[1.2]">
        <DishArt dish={dish} />
        {memoryInfo && MemoryIcon && memory && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-semibold text-ink-2 backdrop-blur">
            <MemoryIcon className="size-3.5" strokeWidth={2.25} />
            {memoryInfo.text(memory)}
          </span>
        )}
        <button
          type="button"
          data-no-drag
          onClick={onFlip}
          aria-label={`Rate the ingredients in ${dish.title}`}
          className="absolute right-3 bottom-3 grid size-10 place-items-center rounded-full bg-surface/90 text-ink-2 backdrop-blur transition-transform hover:text-ink active:scale-90"
        >
          <RotateCcw className="size-[18px]" strokeWidth={2} />
        </button>
      </div>
      <div className="flex flex-col gap-1.5 px-5 pt-4 pb-5">
        {meta && <p className="smallcaps text-ink-3">{meta}</p>}
        <h2 className="font-display text-[28px] leading-[1.05] font-semibold tracking-[-0.01em] text-balance">
          {dish.title}
        </h2>
        {dish.description && (
          <p className="line-clamp-2 text-[15px] leading-snug text-ink-2">{dish.description}</p>
        )}
        <p className="mt-1 truncate text-[13px] text-ink-3">
          {dish.ingredients.map((i) => i.family).join(' · ')}
        </p>
        <p className="truncate text-[12px] font-medium text-ink-3">from {dish.sourceName}</p>
      </div>
    </div>
  );
}

interface BackProps {
  dish: Dish;
  batch: Batch | undefined;
  onFlip: () => void;
}

/** Back of the card: rate ingredients, open the recipe, Google attribution. */
export function CardBack({ dish, batch, onFlip }: BackProps) {
  const meta = metaLine(dish);
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-3">
        <div className="min-w-0 flex-1">
          {meta && <p className="smallcaps text-ink-3">{meta}</p>}
          <h2 className="mt-0.5 font-display text-[22px] leading-tight font-semibold">
            {dish.title}
          </h2>
        </div>
        <button
          type="button"
          data-no-drag
          onClick={onFlip}
          aria-label="Show the front of the card"
          className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2"
        >
          <RotateCcw className="size-[18px]" strokeWidth={2} />
        </button>
      </header>
      <div
        data-no-drag
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 pt-3"
      >
        <p className="smallcaps text-ink-3">How do you feel about…</p>
        <IngredientRatings dish={dish} />
      </div>
      <footer className="flex flex-col gap-3 border-t border-line px-5 pt-3 pb-4">
        <RecipeLink dish={dish} />
        <SearchSuggestions snippets={batch?.searchSuggestions ?? []} />
      </footer>
    </div>
  );
}
