import { tuning as defaultTuning, type Tuning } from '@/config/tuning';
import type { SavedEntry, Verdict, VerdictEvent } from './types';

/** What the app remembers about one dish across sessions. */
export interface DishMemory {
  dishId: string;
  counts: Record<Verdict, number>;
  /** Distinct sessions with a Nah. */
  nahSessions: number;
  /** Distinct sessions with Into it or This one since the most recent Nah. */
  likedSessionsSinceNah: number;
  everLiked: boolean;
  lastVerdict: Verdict;
  lastAt: string;
  lastSessionId: string;
  retired: boolean;
  staple: boolean;
}

interface MemoryInput {
  events: readonly VerdictEvent[];
  saved: Readonly<Record<string, SavedEntry>>;
  restores: Readonly<Record<string, string>>;
}

/**
 * Derives dish memory from the verdict log (spec LR-1 to LR-8). Pure and
 * order-independent: events are sorted by time before folding.
 */
export function buildMemory(
  { events, saved, restores }: MemoryInput,
  t: Tuning = defaultTuning,
): Map<string, DishMemory> {
  const byDish = new Map<string, VerdictEvent[]>();
  for (const event of events) {
    const restoredAt = restores[event.dishId];
    if (restoredAt && event.at <= restoredAt) continue;
    const list = byDish.get(event.dishId);
    if (list) list.push(event);
    else byDish.set(event.dishId, [event]);
  }

  const memory = new Map<string, DishMemory>();
  for (const [dishId, list] of byDish) {
    list.sort((a, b) => a.at.localeCompare(b.at));
    const counts: Record<Verdict, number> = { nah: 0, never: 0, into: 0, super: 0 };
    const nahSessions = new Set<string>();
    let likedSince = new Set<string>();
    for (const event of list) {
      counts[event.verdict] += 1;
      if (event.verdict === 'nah') {
        nahSessions.add(event.sessionId);
        likedSince = new Set();
      } else if (event.verdict === 'into' || event.verdict === 'super') {
        likedSince.add(event.sessionId);
      }
    }
    const last = list[list.length - 1]!;
    const everLiked = counts.into + counts.super > 0;
    const isSaved = Boolean(saved[dishId]);
    const retired =
      counts.never > 0 ||
      (!everLiked && !isSaved && nahSessions.size >= t.learning.retireAfterNahSessions);
    memory.set(dishId, {
      dishId,
      counts,
      nahSessions: nahSessions.size,
      likedSessionsSinceNah: likedSince.size,
      everLiked,
      lastVerdict: last.verdict,
      lastAt: last.at,
      lastSessionId: last.sessionId,
      retired,
      staple: !retired && likedSince.size >= t.learning.stapleAfterLikedSessions,
    });
  }
  return memory;
}

export type MemoryLine =
  | { kind: 'staple' }
  | { kind: 'saved' }
  | { kind: 'liked' }
  | { kind: 'passed'; lastChance: boolean };

/** The short "seen before" line on a card front (spec DK-4). */
export function memoryLine(
  memory: DishMemory | undefined,
  isSaved: boolean,
  currentSessionId: string,
  t: Tuning = defaultTuning,
): MemoryLine | null {
  if (!memory || memory.lastSessionId === currentSessionId) return null;
  if (memory.staple) return { kind: 'staple' };
  if (isSaved) return { kind: 'saved' };
  if (memory.everLiked) return { kind: 'liked' };
  if (memory.counts.nah > 0) {
    return {
      kind: 'passed',
      lastChance: memory.nahSessions >= t.learning.retireAfterNahSessions - 1,
    };
  }
  return null;
}
