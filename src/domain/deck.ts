import { tuning as defaultTuning, type Tuning } from '@/config/tuning';
import { hasNeverIngredient, preferencePenalty } from './ingredients';
import type { DishMemory } from './memory';
import type { Dish, IngredientPrefs, Meal, MealDeck, Verdict } from './types';

export interface DeckContext {
  dishes: Readonly<Record<string, Dish>>;
  prefs: IngredientPrefs;
  memory: ReadonlyMap<string, DishMemory>;
}

export type SkipReason = 'missing' | 'seen' | 'never-ingredient' | 'hidden-idea' | 'retired';

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Why a queued dish shouldn't be shown right now, or null if it can be. */
export function skipReason(dishId: string, deck: MealDeck, ctx: DeckContext): SkipReason | null {
  const dish = ctx.dishes[dishId];
  if (!dish) return 'missing';
  if (deck.seen.includes(dishId)) return 'seen';
  if (ctx.memory.get(dishId)?.retired) return 'retired';
  if (hasNeverIngredient(dish, ctx.prefs)) return 'never-ingredient';
  if (deck.hiddenIdeas.includes(dish.ideaKey)) return 'hidden-idea';
  return null;
}

/**
 * The dish ids to render, front first, without changing the deck. The card
 * already on screen (`pinned`) stays visible even if it just became
 * ineligible, so marking an ingredient Never doesn't yank it away (spec IN-5).
 */
export function visibleCards(
  deck: MealDeck,
  ctx: DeckContext,
  count: number,
  pinned: string | null = null,
): string[] {
  const out: string[] = [];
  for (const id of deck.queue) {
    if (out.length >= count) break;
    if (id === pinned && ctx.dishes[id]) out.push(id);
    else if (!skipReason(id, deck, ctx)) out.push(id);
  }
  return out;
}

/** Drops ineligible ids from the front of the queue, reporting Never skips. */
export function settleQueue(
  deck: MealDeck,
  ctx: DeckContext,
): { deck: MealDeck; skippedForNever: Dish[] } {
  const skippedForNever: Dish[] = [];
  let index = 0;
  while (index < deck.queue.length) {
    const id = deck.queue[index]!;
    const reason = skipReason(id, deck, ctx);
    if (!reason) break;
    if (reason === 'never-ingredient') skippedForNever.push(ctx.dishes[id]!);
    index += 1;
  }
  if (index === 0) return { deck, skippedForNever };
  return { deck: { ...deck, queue: deck.queue.slice(index) }, skippedForNever };
}

/** Number of upcoming cards that can actually be shown. */
export function eligibleCount(deck: MealDeck, ctx: DeckContext): number {
  return deck.queue.filter((id) => !skipReason(id, deck, ctx)).length;
}

/** Applies a verdict to the session deck (spec SE-4: Nah hides the idea). */
export function recordVerdict(deck: MealDeck, dish: Dish, verdict: Verdict): MealDeck {
  const hiddenIdeas =
    verdict === 'nah' && !deck.hiddenIdeas.includes(dish.ideaKey)
      ? [...deck.hiddenIdeas, dish.ideaKey]
      : deck.hiddenIdeas;
  return {
    ...deck,
    queue: deck.queue.filter((id) => id !== dish.id),
    seen: [...deck.seen, dish.id],
    hiddenIdeas,
    verdictsSinceFetch: deck.verdictsSinceFetch + 1,
  };
}

/**
 * Filters freshly fetched dishes down to ones worth queueing (spec DK-5,
 * DK-6, AI-6): no duplicates by id or title, nothing retired, no Never
 * ingredients, no ideas passed on this session.
 */
export function admitDishes(incoming: readonly Dish[], deck: MealDeck, ctx: DeckContext): Dish[] {
  const takenIds = new Set([...deck.seen, ...deck.queue]);
  const takenTitles = new Set(
    [...takenIds].flatMap((id) => {
      const dish = ctx.dishes[id];
      return dish ? [normalizeTitle(dish.title)] : [];
    }),
  );
  const admitted: Dish[] = [];
  for (const dish of incoming) {
    const title = normalizeTitle(dish.title);
    if (takenIds.has(dish.id) || takenTitles.has(title)) continue;
    if (ctx.memory.get(dish.id)?.retired) continue;
    if (hasNeverIngredient(dish, ctx.prefs)) continue;
    if (deck.hiddenIdeas.includes(dish.ideaKey)) continue;
    takenIds.add(dish.id);
    takenTitles.add(title);
    admitted.push(dish);
  }
  return admitted;
}

/** Stable sort that pushes disliked ingredients back and loved ones forward. */
export function orderByPreference(dishes: readonly Dish[], prefs: IngredientPrefs): Dish[] {
  return dishes
    .map((dish, index) => ({ dish, index, penalty: preferencePenalty(dish, prefs) }))
    .sort((a, b) => a.penalty - b.penalty || a.index - b.index)
    .map((entry) => entry.dish);
}

/**
 * Dishes from earlier sessions that may come back (spec LR-2, LR-5, LR-6),
 * staples first, then liked, then passed-once, most recent first within each.
 */
export function reshowCandidates(meal: Meal, deck: MealDeck, ctx: DeckContext): string[] {
  const taken = new Set([...deck.seen, ...deck.queue]);
  const rank = (m: DishMemory) => (m.staple ? 0 : m.everLiked ? 1 : 2);
  return [...ctx.memory.values()]
    .filter((m) => {
      const dish = ctx.dishes[m.dishId];
      return (
        dish &&
        dish.meal === meal &&
        !m.retired &&
        m.counts.never === 0 &&
        !taken.has(m.dishId) &&
        !hasNeverIngredient(dish, ctx.prefs) &&
        !deck.hiddenIdeas.includes(dish.ideaKey)
      );
    })
    .sort((a, b) => rank(a) - rank(b) || b.lastAt.localeCompare(a.lastAt))
    .map((m) => m.dishId);
}

/**
 * Adds fresh dish ids to the queue, interleaving re-shows so they stay under
 * the configured share (spec LR-7). A staple gets a slot even when the share
 * would otherwise round down to zero (spec LR-6).
 */
export function mergeIntoQueue(
  deck: MealDeck,
  fresh: readonly string[],
  reshowPool: readonly string[],
  options: { position: 'front' | 'back'; hasStapleInPool: boolean },
  t: Tuning = defaultTuning,
): MealDeck {
  const share = t.learning.maxReshowShare;
  const total = deck.seen.length + deck.queue.length + fresh.length;
  let budget = Math.floor(total * share) - deck.reshows.length;
  if (budget < 1 && options.hasStapleInPool && deck.reshows.length === 0 && fresh.length > 0)
    budget = 1;
  const reshows = reshowPool.slice(0, Math.max(0, budget));

  const every = Math.max(1, Math.round(1 / share) - 1);
  const merged: string[] = [];
  let r = 0;
  fresh.forEach((id, index) => {
    merged.push(id);
    if ((index + 1) % every === 0 && r < reshows.length) merged.push(reshows[r++]!);
  });
  while (r < reshows.length && merged.length > 0) merged.push(reshows[r++]!);

  const queue =
    options.position === 'front' ? [...merged, ...deck.queue] : [...deck.queue, ...merged];
  return { ...deck, queue, reshows: [...deck.reshows, ...reshows.slice(0, r)] };
}
