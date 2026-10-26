import type {
  Batch,
  Dish,
  PrefEntry,
  SavedEntry,
  Session,
  TasteData,
  VerdictEvent,
} from '@/domain/types';

export const SCHEMA_VERSION = 1;

/**
 * Persistence boundary for everything the app remembers (spec PS-3).
 *
 * Methods are deliberately granular and async so an HTTP implementation can
 * map each one to an endpoint (append an event, upsert a preference) without
 * any change above this interface.
 */
export interface TasteRepository {
  load(): Promise<TasteData>;
  appendEvent(event: VerdictEvent): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  setPref(key: string, entry: PrefEntry | null): Promise<void>;
  setSaved(dishId: string, entry: SavedEntry | null): Promise<void>;
  setRestore(dishId: string, at: string | null): Promise<void>;
  putDishes(dishes: readonly Dish[], batches: readonly Batch[]): Promise<void>;
  /** Removes cached dishes (and their batches) not in `keep`. */
  pruneDishes(keep: ReadonlySet<string>): Promise<void>;
  setSession(session: Session): Promise<void>;
  setOnboarded(value: boolean): Promise<void>;
  exportAll(): Promise<TasteData>;
  clear(): Promise<void>;
  /** Writes anything still buffered. Called when the page is hidden. */
  flush(): Promise<void>;
}

export function emptyTasteData(): TasteData {
  return {
    schemaVersion: SCHEMA_VERSION,
    events: [],
    prefs: {},
    saved: {},
    restores: {},
    dishes: {},
    batches: {},
    session: null,
    onboarded: false,
  };
}
