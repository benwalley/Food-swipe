import { beforeEach, describe, expect, it } from 'vitest';
import { tuning } from '@/config/tuning';
import { FixtureIdeaSource } from '@/services/ideas/fixtures/FixtureIdeaSource';
import { IdeaSourceError, type IdeaSource } from '@/services/ideas/IdeaSource';
import { BrowserApiKeyStore } from '@/services/keys/BrowserApiKeyStore';
import { LocalStorageRepository } from '@/services/storage/LocalStorageRepository';
import { createAppStore, type Services } from './appStore';
import { createNotifier, type Notice } from './notices';
import { selectCards } from './selectors';

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

function setup(start = new Date('2026-10-26T18:00:00'), overrides: Partial<Services> = {}) {
  let clock = start;
  let ids = 0;
  const notices: Notice[] = [];
  const notifier = createNotifier();
  notifier.subscribe((n) => notices.push(n));
  const services: Services = {
    repo: new LocalStorageRepository(localStorage, 'test'),
    ideas: new FixtureIdeaSource({ delayMs: 0 }),
    notifier,
    now: () => clock,
    newId: () => `id-${++ids}`,
    ...overrides,
  };
  const store = createAppStore(services);
  return {
    store,
    notices,
    services,
    advance: (ms: number) => (clock = new Date(clock.getTime() + ms)),
    top: () => selectCards(store.getState(), store.getState().meal).cards[0]!,
  };
}

describe('app store', () => {
  beforeEach(() => localStorage.clear());

  it('starts a session on the meal for the time of day and loads ideas (MT-2, AI-1)', async () => {
    const { store, top } = setup();
    await store.getState().init();
    expect(store.getState().meal).toBe('dinner');
    expect(store.getState().fetch.dinner.inFlight).toBe(tuning.batches.initialAngles.length + 1);
    await settle();
    expect(store.getState().fetch.dinner.inFlight).toBe(0);
    expect(top()).toBeDefined();
  });

  it('saves a dish on This one and undoes it cleanly (SW-9, SW-10)', async () => {
    const { store, notices, top } = setup();
    await store.getState().init();
    await settle();
    const dish = top();
    store.getState().decide(dish.id, 'super');
    expect(store.getState().saved[dish.id]).toBeDefined();
    expect(top().id).not.toBe(dish.id);
    expect(notices.at(-1)).toEqual({ kind: 'saved', title: dish.title });

    store.getState().undo();
    expect(store.getState().saved[dish.id]).toBeUndefined();
    expect(store.getState().events).toHaveLength(0);
    expect(top().id).toBe(dish.id);
    expect(store.getState().returning).toEqual({ dishId: dish.id, verdict: 'super' });
  });

  it('keeps the current card when its ingredient is marked Never, then skips others (IN-5)', async () => {
    const { store, top } = setup();
    await store.getState().init();
    await settle();
    const dish = top();
    const family = dish.ingredients[0]!.family;
    store.getState().setPref(family, 'never');
    expect(top().id).toBe(dish.id);
    store.getState().decide(dish.id, 'nah');
    const state = store.getState();
    const visible = selectCards(state, state.meal).cards;
    for (const card of visible) {
      expect(card.ingredients.some((i) => i.family === family)).toBe(false);
    }
  });

  it('switches meals, keeping each deck in place (MT-3)', async () => {
    const { store, top } = setup();
    await store.getState().init();
    await settle();
    const dinnerTop = top();
    store.getState().setMeal('dessert');
    await settle();
    expect(top().meal).toBe('dessert');
    store.getState().setMeal('dinner');
    expect(top().id).toBe(dinnerTop.id);
  });

  it('persists across reloads and resumes the same session within the idle window (PS-1)', async () => {
    const first = setup();
    await first.store.getState().init();
    await settle();
    const dish = first.top();
    first.store.getState().decide(dish.id, 'super');
    await first.services.repo.flush();

    const second = setup(new Date('2026-10-26T19:00:00'));
    await second.store.getState().init();
    expect(second.store.getState().session.id).toBe(first.store.getState().session.id);
    expect(second.store.getState().saved[dish.id]).toBeDefined();
  });

  it('starts a new session after the idle window and keeps long-term data (SE-1)', async () => {
    const first = setup();
    await first.store.getState().init();
    await settle();
    first.store.getState().setPref('Mushrooms', 'never');
    await first.services.repo.flush();

    const later = setup(new Date('2026-10-27T09:00:00'));
    await later.store.getState().init();
    expect(later.store.getState().session.id).not.toBe(first.store.getState().session.id);
    expect(later.store.getState().meal).toBe('breakfast');
    expect(later.store.getState().prefs.mushroom?.pref).toBe('never');
  });

  it('puts a mood-driven batch in front of the queue (RF-8)', async () => {
    const { store } = setup();
    await store.getState().init();
    await settle();
    store.getState().applyMood({ tags: ['cozy'], note: '' });
    expect(store.getState().session.mood.tags).toEqual(['cozy']);
    expect(store.getState().fetch.dinner.inFlight).toBe(1);
    await settle();
    expect(store.getState().fetch.dinner.inFlight).toBe(0);
  });

  it('waits for a key, then loads ideas as soon as one is saved (ST-1)', async () => {
    const keys = new BrowserApiKeyStore(localStorage);
    const fixtures = new FixtureIdeaSource({ delayMs: 0 });
    const ideas: IdeaSource = {
      label: 'needs a key',
      fetchBatch: (brief, options) =>
        keys.get()
          ? fixtures.fetchBatch(brief, options)
          : Promise.reject(new IdeaSourceError('config', 'No key')),
    };
    const { store, notices, top } = setup(undefined, { ideas, keys });
    await store.getState().init();
    await settle();
    expect(store.getState().keySource).toBe('none');
    expect(store.getState().fetch.dinner.error?.kind).toBe('config');

    store.getState().setApiKey('test-key');
    expect(store.getState().keySource).toBe('browser');
    expect(store.getState().fetch.dinner.inFlight).toBeGreaterThan(0);
    await settle();
    expect(top()).toBeDefined();
    expect(notices).toContainEqual({ kind: 'key-saved' });

    store.getState().clearApiKey();
    expect(store.getState().keySource).toBe('none');
  });

  it('has no key setting when the idea source needs none', () => {
    expect(setup().store.getState().keySource).toBeNull();
  });

  it('erases everything and starts over (ST-3)', async () => {
    const { store, top } = setup();
    await store.getState().init();
    await settle();
    store.getState().decide(top().id, 'super');
    await store.getState().eraseEverything();
    expect(store.getState().saved).toEqual({});
    expect(store.getState().events).toEqual([]);
    expect(store.getState().ready).toBe(true);
  });
});
