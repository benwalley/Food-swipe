import type { TasteData } from '@/domain/types';
import { collectionSchemas, type CollectionName } from './schemas';
import { emptyTasteData, SCHEMA_VERSION, type TasteRepository } from './TasteRepository';

const COLLECTIONS = Object.keys(collectionSchemas) as CollectionName[];
const FLUSH_DELAY_MS = 120;

/**
 * Stores each collection under its own versioned localStorage key, keeps an
 * in-memory copy, and batches writes so rapid swiping doesn't re-serialize
 * everything on every gesture.
 */
export class LocalStorageRepository implements TasteRepository {
  private data: TasteData = emptyTasteData();
  private loaded = false;
  private dirty = new Set<CollectionName>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly storage: Storage = window.localStorage,
    private readonly prefix = 'food-swipe',
  ) {}

  private key(name: CollectionName | 'schemaVersion'): string {
    return `${this.prefix}:v${SCHEMA_VERSION}:${name}`;
  }

  async load(): Promise<TasteData> {
    if (this.loaded) return structuredClone(this.data);
    const data = emptyTasteData();
    for (const name of COLLECTIONS) {
      const raw = this.storage.getItem(this.key(name));
      if (raw === null) continue;
      try {
        const parsed = collectionSchemas[name].safeParse(JSON.parse(raw));
        if (parsed.success) (data as unknown as Record<string, unknown>)[name] = parsed.data;
        else this.quarantine(name, raw);
      } catch {
        this.quarantine(name, raw);
      }
    }
    this.storage.setItem(this.key('schemaVersion'), String(SCHEMA_VERSION));
    this.data = data;
    this.loaded = true;
    return structuredClone(data);
  }

  /** Keeps unreadable data aside instead of silently deleting it. */
  private quarantine(name: CollectionName, raw: string): void {
    console.warn(`[storage] "${name}" failed validation and was reset; a backup was kept.`);
    try {
      this.storage.setItem(`${this.key(name)}:corrupt:${Date.now()}`, raw);
    } catch {
      // Backup is best effort; storage may be full.
    }
  }

  private touch(...names: CollectionName[]): Promise<void> {
    for (const name of names) this.dirty.add(name);
    if (!this.timer) this.timer = setTimeout(() => void this.flush(), FLUSH_DELAY_MS);
    return Promise.resolve();
  }

  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const names = [...this.dirty];
    this.dirty.clear();
    for (const name of names) this.write(name);
  }

  private write(name: CollectionName): void {
    const value = JSON.stringify(this.data[name]);
    try {
      this.storage.setItem(this.key(name), value);
    } catch (error) {
      if (!isQuotaError(error)) throw error;
      // Free space by dropping cached search attribution for old batches, then retry once.
      this.dropUnreferencedBatches();
      this.storage.setItem(this.key('batches'), JSON.stringify(this.data.batches));
      this.storage.setItem(this.key(name), value);
    }
  }

  private dropUnreferencedBatches(): void {
    const used = new Set(Object.values(this.data.dishes).map((d) => d.batchId));
    for (const id of Object.keys(this.data.batches))
      if (!used.has(id)) delete this.data.batches[id];
  }

  async appendEvent(event: TasteData['events'][number]): Promise<void> {
    this.data.events = [...this.data.events, event];
    return this.touch('events');
  }

  async deleteEvent(eventId: string): Promise<void> {
    this.data.events = this.data.events.filter((e) => e.id !== eventId);
    return this.touch('events');
  }

  async setPref(key: string, entry: TasteData['prefs'][string] | null): Promise<void> {
    const prefs = { ...this.data.prefs };
    if (entry) prefs[key] = entry;
    else delete prefs[key];
    this.data.prefs = prefs;
    return this.touch('prefs');
  }

  async setSaved(dishId: string, entry: TasteData['saved'][string] | null): Promise<void> {
    const saved = { ...this.data.saved };
    if (entry) saved[dishId] = entry;
    else delete saved[dishId];
    this.data.saved = saved;
    return this.touch('saved');
  }

  async setRestore(dishId: string, at: string | null): Promise<void> {
    const restores = { ...this.data.restores };
    if (at) restores[dishId] = at;
    else delete restores[dishId];
    this.data.restores = restores;
    return this.touch('restores');
  }

  async putDishes(
    dishes: readonly TasteData['dishes'][string][],
    batches: readonly TasteData['batches'][string][],
  ): Promise<void> {
    this.data.dishes = { ...this.data.dishes, ...Object.fromEntries(dishes.map((d) => [d.id, d])) };
    this.data.batches = {
      ...this.data.batches,
      ...Object.fromEntries(batches.map((b) => [b.id, b])),
    };
    return this.touch('dishes', 'batches');
  }

  async pruneDishes(keep: ReadonlySet<string>): Promise<void> {
    this.data.dishes = Object.fromEntries(
      Object.entries(this.data.dishes).filter(([id]) => keep.has(id)),
    );
    this.dropUnreferencedBatches();
    return this.touch('dishes', 'batches');
  }

  async setSession(session: TasteData['session']): Promise<void> {
    this.data.session = session;
    return this.touch('session');
  }

  async setOnboarded(value: boolean): Promise<void> {
    this.data.onboarded = value;
    return this.touch('onboarded');
  }

  async exportAll(): Promise<TasteData> {
    return structuredClone(this.data);
  }

  async clear(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.dirty.clear();
    for (let i = this.storage.length - 1; i >= 0; i -= 1) {
      const key = this.storage.key(i);
      if (key?.startsWith(`${this.prefix}:`)) this.storage.removeItem(key);
    }
    this.data = emptyTasteData();
  }
}

function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)
  );
}
