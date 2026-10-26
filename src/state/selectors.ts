import type { DeckContext } from '@/domain/deck';
import { eligibleCount, visibleCards } from '@/domain/deck';
import { buildMemory, type DishMemory } from '@/domain/memory';
import type { Dish, Meal, Session, TasteData } from '@/domain/types';
import type { Tuning } from '@/config/tuning';

type MemorySource = Pick<TasteData, 'events' | 'saved' | 'restores'>;

let memoInput: MemorySource | null = null;
let memoOutput: Map<string, DishMemory> = new Map();

/**
 * Dish memory, recomputed only when the event log, saved list, or restores
 * change identity. Every store update replaces those arrays immutably.
 */
export function selectMemory(source: MemorySource, t?: Tuning): Map<string, DishMemory> {
  if (
    memoInput &&
    memoInput.events === source.events &&
    memoInput.saved === source.saved &&
    memoInput.restores === source.restores
  ) {
    return memoOutput;
  }
  memoInput = { events: source.events, saved: source.saved, restores: source.restores };
  memoOutput = buildMemory(source, t);
  return memoOutput;
}

export function deckContext(
  state: Pick<TasteData, 'dishes' | 'prefs' | 'events' | 'saved' | 'restores'>,
): DeckContext {
  return { dishes: state.dishes, prefs: state.prefs, memory: selectMemory(state) };
}

export interface CardsView {
  cards: Dish[];
  eligible: number;
}

export function selectCards(
  state: Pick<TasteData, 'dishes' | 'prefs' | 'events' | 'saved' | 'restores'> & {
    session: Session;
    pinned: Record<Meal, string | null>;
  },
  meal: Meal,
): CardsView {
  const ctx = deckContext(state);
  const deck = state.session.decks[meal];
  const ids = visibleCards(deck, ctx, 2, state.pinned[meal]);
  return { cards: ids.map((id) => state.dishes[id]!), eligible: eligibleCount(deck, ctx) };
}
