import type { IngredientPref, SavedEntry } from '@/domain/types';

/**
 * Things worth telling the user about, described as data. The UI decides
 * wording and presentation; the store never deals in display strings.
 */
export type Notice =
  | { kind: 'saved'; title: string }
  | { kind: 'never-dish'; title: string }
  | { kind: 'pref'; label: string; pref: IngredientPref | null; skipped: number }
  | { kind: 'skipped-never'; count: number }
  | { kind: 'unsaved'; title: string; entry: SavedEntry }
  | { kind: 'restored'; title: string }
  | { kind: 'session-started'; retired: number }
  | { kind: 'refine-applied' }
  | { kind: 'nothing-to-undo' };

export type NoticeListener = (notice: Notice) => void;

export interface Notifier {
  emit(notice: Notice): void;
  subscribe(listener: NoticeListener): () => void;
}

export function createNotifier(): Notifier {
  const listeners = new Set<NoticeListener>();
  return {
    emit: (notice) => listeners.forEach((listener) => listener(notice)),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
