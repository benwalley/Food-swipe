import { tuning as defaultTuning, type Tuning } from '@/config/tuning';
import { defaultMealForTime } from './meals';
import { MEALS, type Meal, type MealDeck, type Mood, type Session } from './types';

export const EMPTY_MOOD: Mood = { tags: [], note: '' };

export function emptyDeck(): MealDeck {
  return { queue: [], seen: [], hiddenIdeas: [], reshows: [], verdictsSinceFetch: 0 };
}

export function createSession(id: string, now: Date): Session {
  const decks = Object.fromEntries(MEALS.map((meal) => [meal, emptyDeck()])) as Record<
    Meal,
    MealDeck
  >;
  const at = now.toISOString();
  return {
    id,
    startedAt: at,
    lastActiveAt: at,
    activeMeal: defaultMealForTime(now),
    mood: EMPTY_MOOD,
    decks,
  };
}

/** Dish ids the session still needs cached. */
export function sessionDishIds(session: Session): string[] {
  return MEALS.flatMap((meal) => [...session.decks[meal].queue, ...session.decks[meal].seen]);
}

/** Spec SE-1: a new session starts after a long idle gap. */
export function isSessionStale(
  session: Session | null,
  now: Date,
  t: Tuning = defaultTuning,
): boolean {
  if (!session) return true;
  return now.getTime() - new Date(session.lastActiveAt).getTime() > t.session.idleMs;
}

export function updateDeck(session: Session, meal: Meal, deck: MealDeck): Session {
  return { ...session, decks: { ...session.decks, [meal]: deck } };
}
