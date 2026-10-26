import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MEAL_LABELS } from '@/domain/meals';
import { MEALS, type Dish, type Meal } from '@/domain/types';
import { useApp, useAppStore } from '@/state/hooks';
import { DishArt } from '@/ui/components/DishArt';
import { Sheet } from '@/ui/components/Sheet';
import { formatSavedDate, metaLine } from '@/ui/lib/format';
import { IngredientRatings } from '../dish/IngredientRatings';
import { RecipeLink } from '../dish/RecipeLink';

type Filter = 'all' | Meal;

/** Dishes saved with This one, grouped by meal (spec YL-1, YL-2). */
export function YourListScreen() {
  const saved = useApp((s) => s.saved);
  const dishes = useApp((s) => s.dishes);
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      Object.values(saved)
        .flatMap((entry) => (dishes[entry.dishId] ? [{ entry, dish: dishes[entry.dishId]! }] : []))
        .sort((a, b) => b.entry.savedAt.localeCompare(a.entry.savedAt)),
    [saved, dishes],
  );
  const counts = useMemo(() => {
    const c: Partial<Record<Meal, number>> = {};
    for (const { dish } of items) c[dish.meal] = (c[dish.meal] ?? 0) + 1;
    return c;
  }, [items]);
  const visible = filter === 'all' ? items : items.filter(({ dish }) => dish.meal === filter);
  const filters: Filter[] = ['all', ...MEALS.filter((m) => counts[m])];
  const open = openId ? dishes[openId] : undefined;

  return (
    <div className="flex h-full flex-col">
      <header className="px-5 pt-safe pb-2">
        <h1 className="font-display text-[34px] leading-tight font-semibold tracking-tight">
          Your list
        </h1>
        <p className="text-[14px] text-ink-3">
          {items.length === 0
            ? 'Dishes you swipe up on land here.'
            : `${items.length} ${items.length === 1 ? 'dish' : 'dishes'} you want to make`}
        </p>
      </header>

      {items.length > 0 && filters.length > 2 && (
        <div
          className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-2"
          role="radiogroup"
          aria-label="Filter by meal"
        >
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={filter === f}
              onClick={() => setFilter(f)}
              className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors ${
                filter === f ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2 hover:bg-surface-3'
              }`}
            >
              {f === 'all' ? 'All' : MEAL_LABELS[f]}
              <span className="ml-1.5 opacity-60">{f === 'all' ? items.length : counts[f]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-6">
        {items.length === 0 ? (
          <EmptyList />
        ) : (
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {visible.map(({ entry, dish }) => (
                <motion.li
                  key={dish.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(dish.id)}
                    className="flex w-full items-center gap-4 rounded-3xl bg-surface p-2.5 pr-4 text-left shadow-float transition-transform active:scale-[0.99]"
                  >
                    <div className="size-[76px] shrink-0 overflow-hidden rounded-[18px]">
                      <DishArt dish={dish} variant="thumb" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate smallcaps text-ink-3">
                        {metaLine(dish) || MEAL_LABELS[dish.meal]}
                      </p>
                      <p className="mt-0.5 truncate font-display text-[19px] leading-tight font-semibold">
                        {dish.title}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-ink-3">
                        Saved {formatSavedDate(entry.savedAt)}
                      </p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-ink-3" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <DishSheet dish={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

function DishSheet({ dish, onClose }: { dish: Dish | undefined; onClose: () => void }) {
  const store = useAppStore();
  return (
    <Sheet open={Boolean(dish)} onClose={onClose} title={dish?.title ?? ''}>
      {dish && (
        <div className="flex flex-col gap-5">
          <div className="-mx-5 aspect-[16/9] overflow-hidden">
            <DishArt dish={dish} />
          </div>
          {dish.description && (
            <p className="text-[16px] leading-relaxed text-ink-2">{dish.description}</p>
          )}
          <RecipeLink dish={dish} />
          <section>
            <p className="smallcaps text-ink-3">How do you feel about…</p>
            <IngredientRatings dish={dish} />
          </section>
          <button
            type="button"
            onClick={() => {
              store.getState().unsave(dish.id);
              onClose();
            }}
            className="h-12 rounded-full text-[15px] font-semibold text-nope hover:bg-nope-soft"
          >
            Remove from your list
          </button>
        </div>
      )}
    </Sheet>
  );
}

function EmptyList() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 pb-16 text-center">
      <div className="mb-5 grid size-20 place-items-center rounded-full bg-super-soft">
        <Bookmark className="size-9 text-super" strokeWidth={1.6} />
      </div>
      <h2 className="font-display text-[24px] leading-tight font-semibold">Start your list</h2>
      <p className="mt-2 max-w-[280px] text-[15px] leading-relaxed text-ink-2">
        Swipe up on a dish you want to make, and it’ll wait for you here with its recipe.
      </p>
    </div>
  );
}
