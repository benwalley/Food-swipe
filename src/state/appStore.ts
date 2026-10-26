import { createStore, type StoreApi } from 'zustand/vanilla';
import { tuning as defaultTuning, type Tuning } from '@/config/tuning';
import { buildBrief } from '@/domain/brief';
import {
  admitDishes,
  eligibleCount,
  mergeIntoQueue,
  orderByPreference,
  recordVerdict,
  reshowCandidates,
  settleQueue,
  visibleCards,
} from '@/domain/deck';
import {
  canonicalIngredient,
  hasNeverIngredient,
  ingredientLabel,
  prefsTouchingDish,
} from '@/domain/ingredients';
import { createSession, isSessionStale, sessionDishIds, updateDeck } from '@/domain/session';
import {
  MEALS,
  type Batch,
  type Dish,
  type IngredientPref,
  type Meal,
  type MealDeck,
  type Mood,
  type SavedEntry,
  type Session,
  type TasteData,
  type Verdict,
} from '@/domain/types';
import { isAbortError, IdeaSourceError, type IdeaSource } from '@/services/ideas/IdeaSource';
import type { TasteRepository } from '@/services/storage/TasteRepository';
import type { Notifier } from './notices';
import { deckContext, selectMemory } from './selectors';

export interface Services {
  repo: TasteRepository;
  ideas: IdeaSource;
  notifier: Notifier;
  now: () => Date;
  newId: () => string;
  tuning?: Tuning;
}

export interface FetchStatus {
  inFlight: number;
  error: IdeaSourceError | null;
}

interface UndoEntry {
  meal: Meal;
  eventId: string;
  dishId: string;
  verdict: Verdict;
  prevDeck: MealDeck;
  prevSaved: SavedEntry | null;
}

type Persisted = Pick<
  TasteData,
  'events' | 'prefs' | 'saved' | 'restores' | 'dishes' | 'batches' | 'onboarded'
>;

export interface AppState extends Persisted {
  ready: boolean;
  meal: Meal;
  session: Session;
  fetch: Record<Meal, FetchStatus>;
  /** The card on screen per meal; stays put when its ingredients change. */
  pinned: Record<Meal, string | null>;
  undoStack: UndoEntry[];
  /** Set by undo so the returning card can animate in from where it left. */
  returning: { dishId: string; verdict: Verdict } | null;

  init(): Promise<void>;
  resumeIfStale(): void;
  setMeal(meal: Meal): void;
  decide(dishId: string, verdict: Verdict): void;
  undo(): void;
  setPref(label: string, pref: IngredientPref | null): void;
  applyMood(mood: Mood): void;
  startNewSession(): void;
  retry(meal: Meal): void;
  unsave(dishId: string): void;
  resave(entry: SavedEntry): void;
  restoreDish(dishId: string): void;
  setOnboarded(value: boolean): void;
  exportData(): Promise<TasteData>;
  eraseEverything(): Promise<void>;
}

type BatchSpec = { angle: string | null; count: number };

const idleFetch = (): Record<Meal, FetchStatus> =>
  Object.fromEntries(MEALS.map((m) => [m, { inFlight: 0, error: null }])) as Record<
    Meal,
    FetchStatus
  >;
const nobodyPinned = (): Record<Meal, string | null> =>
  Object.fromEntries(MEALS.map((m) => [m, null])) as Record<Meal, string | null>;

export type AppStore = StoreApi<AppState>;

export function createAppStore(services: Services): AppStore {
  const { repo, ideas, notifier, now, newId } = services;
  const t = services.tuning ?? defaultTuning;
  let controllers = new Set<AbortController>();
  let initPromise: Promise<void> | null = null;

  return createStore<AppState>()((set, get) => {
    /** Re-pins the top card for a meal after anything that can change it. */
    function pinTop(state: AppState, meal: Meal): Record<Meal, string | null> {
      const top = visibleCards(state.session.decks[meal], deckContext(state), 1)[0] ?? null;
      return { ...state.pinned, [meal]: top };
    }

    function commitSession(session: Session) {
      set({ session });
      void repo.setSession(session);
    }

    function freshSession(retiredBefore: Set<string>) {
      const state = get();
      const session = createSession(newId(), now());
      const keep = new Set([
        ...state.events.map((e) => e.dishId),
        ...Object.keys(state.saved),
        ...sessionDishIds(session),
      ]);
      const dishes = Object.fromEntries(
        Object.entries(state.dishes).filter(([id]) => keep.has(id)),
      );
      const usedBatches = new Set(Object.values(dishes).map((d) => d.batchId));
      const batches = Object.fromEntries(
        Object.entries(state.batches).filter(([id]) => usedBatches.has(id)),
      );
      void repo.pruneDishes(keep);
      const memory = selectMemory(state, t);
      const retired = [...memory.values()].filter(
        (m) => m.retired && !retiredBefore.has(m.dishId),
      ).length;
      return { session, dishes, batches, retired };
    }

    function retiredIds(): Set<string> {
      return new Set(
        [...selectMemory(get(), t).values()].filter((m) => m.retired).map((m) => m.dishId),
      );
    }

    /** Decides whether a meal needs more ideas and requests them (spec AI-1, AI-2). */
    function ensureSupply(meal: Meal) {
      const state = get();
      const status = state.fetch[meal];
      if (status.inFlight > 0 || status.error) return;
      const deck = state.session.decks[meal];
      const neverFetched = !Object.values(state.dishes).some((d) => d.meal === meal);
      if (neverFetched && deck.queue.length === 0) {
        requestBatches(
          meal,
          [
            t.batches.quickStart,
            ...t.batches.initialAngles.map((angle) => ({
              angle,
              count: t.batches.initialPerAngle,
            })),
          ],
          'back',
        );
        return;
      }
      const lowOnCards = eligibleCount(deck, deckContext(state)) < t.batches.lowWater;
      if (lowOnCards || deck.verdictsSinceFetch >= t.batches.refetchAfterVerdicts) {
        requestBatches(
          meal,
          Array.from({ length: t.batches.followUpParallel }, () => ({
            angle: null,
            count: t.batches.followUpSize,
          })),
          'back',
        );
      }
    }

    function requestBatches(meal: Meal, specs: BatchSpec[], position: 'front' | 'back') {
      const state = get();
      const deck = { ...state.session.decks[meal], verdictsSinceFetch: 0 };
      commitSession(updateDeck(state.session, meal, deck));
      set((s) => ({
        fetch: {
          ...s.fetch,
          [meal]: { inFlight: s.fetch[meal].inFlight + specs.length, error: null },
        },
      }));

      for (const spec of specs) {
        const controller = new AbortController();
        controllers.add(controller);
        const current = get();
        const brief = buildBrief(
          {
            meal,
            count: spec.count,
            angle: spec.angle,
            now: now(),
            session: current.session,
            events: current.events,
            dishes: current.dishes,
            prefs: current.prefs,
            saved: current.saved,
            memory: selectMemory(current, t),
          },
          t,
        );
        ideas
          .fetchBatch(brief, { signal: controller.signal })
          .then(({ batch, dishes }) => {
            if (!controller.signal.aborted) mergeBatch(meal, batch, dishes, position);
            settle(meal, null);
          })
          .catch((error: unknown) => {
            if (isAbortError(error) || controller.signal.aborted) return;
            const ideaError =
              error instanceof IdeaSourceError
                ? error
                : new IdeaSourceError('unknown', String(error), error);
            console.warn('[ideas] batch failed', ideaError);
            settle(meal, ideaError);
          })
          .finally(() => controllers.delete(controller));
      }
    }

    function settle(meal: Meal, error: IdeaSourceError | null) {
      set((s) => {
        const inFlight = Math.max(0, s.fetch[meal].inFlight - 1);
        // Keep the first error, but only surface it once nothing else is still loading.
        const nextError = error ?? s.fetch[meal].error;
        return { fetch: { ...s.fetch, [meal]: { inFlight, error: nextError } } };
      });
      const after = get();
      const status = after.fetch[meal];
      if (status.inFlight === 0 && status.error) {
        // With cards still to swipe, a failed top-up stays silent and is retried
        // on the next trigger. The error card only shows when the deck is empty (spec AI-8).
        const hasCards = eligibleCount(after.session.decks[meal], deckContext(after)) > 0;
        if (hasCards) set((s) => ({ fetch: { ...s.fetch, [meal]: { inFlight: 0, error: null } } }));
      }
    }

    function mergeBatch(meal: Meal, batch: Batch, incoming: Dish[], position: 'front' | 'back') {
      const state = get();
      const deck = state.session.decks[meal];
      const ctx = deckContext(state);
      const admitted = orderByPreference(admitDishes(incoming, deck, ctx), state.prefs);
      const dishes = { ...state.dishes, ...Object.fromEntries(admitted.map((d) => [d.id, d])) };
      const batches = { ...state.batches, [batch.id]: batch };
      const reshowCtx = { ...ctx, dishes };
      const pool = reshowCandidates(meal, deck, reshowCtx);
      const memory = ctx.memory;
      const merged = mergeIntoQueue(
        deck,
        admitted.map((d) => d.id),
        pool,
        { position, hasStapleInPool: pool.some((id) => memory.get(id)?.staple) },
        t,
      );
      const session = updateDeck(state.session, meal, merged);
      const next = { ...state, dishes, batches, session };
      set({
        dishes,
        batches,
        session,
        pinned: state.pinned[meal] && position === 'back' ? state.pinned : pinTop(next, meal),
      });
      void repo.putDishes(admitted, [batch]);
      void repo.setSession(session);
    }

    return {
      ready: false,
      meal: 'dinner',
      session: createSession('pending', new Date(0)),
      events: [],
      prefs: {},
      saved: {},
      restores: {},
      dishes: {},
      batches: {},
      onboarded: false,
      fetch: idleFetch(),
      pinned: nobodyPinned(),
      undoStack: [],
      returning: null,

      init() {
        // Idempotent: React StrictMode and remounts may call this more than once.
        initPromise ??= (async () => {
          const data = await repo.load();
          set({ ...data, session: data.session ?? createSession(newId(), now()) });
          if (!data.session || isSessionStale(data.session, now(), t)) {
            const { session, dishes, batches } = freshSession(retiredIds());
            set({ session, dishes, batches });
            void repo.setSession(session);
          }
          const state = get();
          const meal = state.session.activeMeal;
          set({ ready: true, meal, pinned: pinTop(state, meal) });
          ensureSupply(meal);
        })();
        return initPromise;
      },

      resumeIfStale() {
        if (!get().ready || !isSessionStale(get().session, now(), t)) return;
        get().startNewSession();
      },

      setMeal(meal) {
        const state = get();
        if (state.meal === meal) return;
        const session = { ...state.session, activeMeal: meal };
        set({
          meal,
          pinned: state.pinned[meal] ? state.pinned : pinTop({ ...state, session }, meal),
          returning: null,
        });
        commitSession(session);
        ensureSupply(meal);
      },

      decide(dishId, verdict) {
        const state = get();
        const meal = state.meal;
        const dish = state.dishes[dishId];
        if (!dish) return;
        const at = now().toISOString();
        const event = {
          id: newId(),
          at,
          sessionId: state.session.id,
          dishId,
          ideaKey: dish.ideaKey,
          meal,
          verdict,
          prefsAtTime: prefsTouchingDish(dish, state.prefs),
        };
        const prevDeck = state.session.decks[meal];
        const prevSaved = state.saved[dishId] ?? null;
        const saved = { ...state.saved };
        if (verdict === 'super') saved[dishId] = prevSaved ?? { dishId, savedAt: at };
        if (verdict === 'never') delete saved[dishId];

        const events = [...state.events, event];
        const afterVerdict = recordVerdict(prevDeck, dish, verdict);
        const { deck, skippedForNever } = settleQueue(
          afterVerdict,
          deckContext({ ...state, events, saved }),
        );
        const session = { ...updateDeck(state.session, meal, deck), lastActiveAt: at };
        const next = { ...state, events, saved, session };
        set({
          events,
          saved,
          session,
          pinned: pinTop(next, meal),
          returning: null,
          undoStack: [
            ...state.undoStack,
            { meal, eventId: event.id, dishId, verdict, prevDeck, prevSaved },
          ],
        });

        void repo.appendEvent(event);
        if (saved[dishId] !== state.saved[dishId])
          void repo.setSaved(dishId, saved[dishId] ?? null);
        void repo.setSession(session);

        if (verdict === 'super') notifier.emit({ kind: 'saved', title: dish.title });
        if (verdict === 'never') notifier.emit({ kind: 'never-dish', title: dish.title });
        if (skippedForNever.length)
          notifier.emit({ kind: 'skipped-never', count: skippedForNever.length });
        ensureSupply(meal);
      },

      undo() {
        const state = get();
        const entry = state.undoStack.at(-1);
        if (!entry) {
          notifier.emit({ kind: 'nothing-to-undo' });
          return;
        }
        const saved = { ...state.saved };
        if (entry.prevSaved) saved[entry.dishId] = entry.prevSaved;
        else delete saved[entry.dishId];
        const events = state.events.filter((e) => e.id !== entry.eventId);
        const session = {
          ...updateDeck(state.session, entry.meal, entry.prevDeck),
          activeMeal: entry.meal,
        };
        set({
          events,
          saved,
          session,
          meal: entry.meal,
          undoStack: state.undoStack.slice(0, -1),
          pinned: { ...state.pinned, [entry.meal]: entry.dishId },
          returning: { dishId: entry.dishId, verdict: entry.verdict },
        });
        void repo.deleteEvent(entry.eventId);
        void repo.setSaved(entry.dishId, saved[entry.dishId] ?? null);
        void repo.setSession(session);
      },

      setPref(rawLabel, pref) {
        const key = canonicalIngredient(rawLabel);
        if (!key) return;
        const state = get();
        const label = state.prefs[key]?.label ?? ingredientLabel(rawLabel);
        const prefs = { ...state.prefs };
        const entry = pref ? { label, pref, updatedAt: now().toISOString() } : null;
        if (entry) prefs[key] = entry;
        else delete prefs[key];

        let skipped = 0;
        if (pref === 'never') {
          const deck = state.session.decks[state.meal];
          const pinned = state.pinned[state.meal];
          skipped = deck.queue.filter((id) => {
            const dish = state.dishes[id];
            return (
              id !== pinned && dish && !deck.seen.includes(id) && hasNeverIngredient(dish, prefs)
            );
          }).length;
        }
        set({ prefs });
        void repo.setPref(key, entry);
        notifier.emit({ kind: 'pref', label, pref, skipped });
      },

      applyMood(mood) {
        const state = get();
        const before = state.session.mood;
        const changed = before.note !== mood.note || before.tags.join() !== mood.tags.join();
        if (!changed) return;
        commitSession({ ...state.session, mood });
        notifier.emit({ kind: 'refine-applied' });
        // Spec RF-8: a changed mood fetches right away, in front of the queue.
        set((s) => ({
          fetch: { ...s.fetch, [state.meal]: { ...s.fetch[state.meal], error: null } },
        }));
        requestBatches(state.meal, [{ angle: null, count: t.batches.followUpSize }], 'front');
      },

      startNewSession() {
        const { session, dishes, batches, retired } = freshSession(retiredIds());
        const meal = session.activeMeal;
        set({
          session,
          dishes,
          batches,
          meal,
          undoStack: [],
          returning: null,
          pinned: nobodyPinned(),
          fetch: idleFetch(),
        });
        void repo.setSession(session);
        set((s) => ({ pinned: pinTop(s, meal) }));
        notifier.emit({ kind: 'session-started', retired });
        ensureSupply(meal);
      },

      retry(meal) {
        set((s) => ({ fetch: { ...s.fetch, [meal]: { ...s.fetch[meal], error: null } } }));
        ensureSupply(meal);
        if (get().fetch[meal].inFlight === 0) {
          requestBatches(
            meal,
            Array.from({ length: t.batches.followUpParallel }, () => ({
              angle: null,
              count: t.batches.followUpSize,
            })),
            'back',
          );
        }
      },

      unsave(dishId) {
        const state = get();
        const entry = state.saved[dishId];
        if (!entry) return;
        const saved = { ...state.saved };
        delete saved[dishId];
        set({ saved });
        void repo.setSaved(dishId, null);
        notifier.emit({ kind: 'unsaved', title: state.dishes[dishId]?.title ?? 'Dish', entry });
      },

      resave(entry) {
        set((s) => ({ saved: { ...s.saved, [entry.dishId]: entry } }));
        void repo.setSaved(entry.dishId, entry);
      },

      restoreDish(dishId) {
        const at = now().toISOString();
        set((s) => ({ restores: { ...s.restores, [dishId]: at } }));
        void repo.setRestore(dishId, at);
        notifier.emit({ kind: 'restored', title: get().dishes[dishId]?.title ?? 'Dish' });
      },

      setOnboarded(value) {
        set({ onboarded: value });
        void repo.setOnboarded(value);
      },

      exportData: () => repo.exportAll(),

      async eraseEverything() {
        controllers.forEach((c) => c.abort());
        controllers = new Set();
        initPromise = null;
        await repo.clear();
        set({
          ready: false,
          events: [],
          prefs: {},
          saved: {},
          restores: {},
          dishes: {},
          batches: {},
          onboarded: false,
          fetch: idleFetch(),
          pinned: nobodyPinned(),
          undoStack: [],
          returning: null,
        });
        await get().init();
      },
    };
  });
}
