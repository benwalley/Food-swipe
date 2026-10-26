import { describe, expect, it } from 'vitest';
import { ing, index, makeDish, makeEvent, pref } from '@/test/factories';
import {
  admitDishes,
  mergeIntoQueue,
  orderByPreference,
  recordVerdict,
  reshowCandidates,
  settleQueue,
  visibleCards,
  type DeckContext,
} from './deck';
import { buildMemory } from './memory';
import { emptyDeck } from './session';
import type { MealDeck } from './types';

const mushroomDish = makeDish({ id: 'm', ingredients: [ing('mushrooms')] });
const pastaDish = makeDish({ id: 'p', ideaKey: 'pasta' });
const pastaVariant = makeDish({ id: 'p2', ideaKey: 'pasta' });
const soup = makeDish({ id: 's', title: 'Tomato Soup' });

function ctx(overrides: Partial<DeckContext> = {}): DeckContext {
  return {
    dishes: index([mushroomDish, pastaDish, pastaVariant, soup]),
    prefs: {},
    memory: new Map(),
    ...overrides,
  };
}

function deck(queue: string[], extra: Partial<MealDeck> = {}): MealDeck {
  return { ...emptyDeck(), queue, ...extra };
}

describe('visibleCards', () => {
  it('skips dishes with Never ingredients, except the pinned card (IN-5)', () => {
    const c = ctx({ prefs: { mushroom: pref('Mushrooms', 'never') } });
    expect(visibleCards(deck(['m', 'p']), c, 2)).toEqual(['p']);
    expect(visibleCards(deck(['m', 'p']), c, 2, 'm')).toEqual(['m', 'p']);
  });
});

describe('settleQueue', () => {
  it('drops ineligible ids from the front and reports Never skips', () => {
    const c = ctx({ prefs: { mushroom: pref('Mushrooms', 'never') } });
    const result = settleQueue(deck(['m', 'p', 'm']), c);
    expect(result.deck.queue).toEqual(['p', 'm']);
    expect(result.skippedForNever.map((d) => d.id)).toEqual(['m']);
  });
});

describe('recordVerdict', () => {
  it('moves the dish to seen and hides the idea on Nah (SE-4)', () => {
    const next = recordVerdict(deck(['p', 'p2', 's']), pastaDish, 'nah');
    expect(next.queue).toEqual(['p2', 's']);
    expect(next.seen).toEqual(['p']);
    expect(next.hiddenIdeas).toEqual(['pasta']);
    expect(visibleCards(next, ctx(), 2)).toEqual(['s']);
  });

  it('does not hide the idea on Into it', () => {
    expect(recordVerdict(deck(['p']), pastaDish, 'into').hiddenIdeas).toEqual([]);
  });
});

describe('admitDishes', () => {
  it('drops duplicates by id and title, retired dishes, and Never ingredients', () => {
    const retired = makeDish({ id: 'r' });
    const memory = buildMemory({
      events: [makeEvent('r', 'never', 's0', '2026-10-01T00:00:00.000Z')],
      saved: {},
      restores: {},
    });
    const sameTitle = makeDish({ id: 's-copy', title: 'tomato soup!' });
    const c = ctx({ memory, prefs: { mushroom: pref('Mushrooms', 'never') } });
    const admitted = admitDishes(
      [soup, sameTitle, retired, mushroomDish, pastaDish, pastaDish],
      deck([], { seen: [] }),
      {
        ...c,
        dishes: { ...c.dishes, r: retired, 's-copy': sameTitle },
      },
    );
    expect(admitted.map((d) => d.id)).toEqual(['s', 'p']);
  });
});

describe('orderByPreference', () => {
  it('pushes disliked main ingredients back, keeping order otherwise', () => {
    const ordered = orderByPreference([mushroomDish, pastaDish, soup], {
      mushroom: pref('Mushrooms', 'meh'),
    });
    expect(ordered.map((d) => d.id)).toEqual(['p', 's', 'm']);
  });
});

describe('re-shows', () => {
  const at = (n: number) => `2026-10-0${n}T00:00:00.000Z`;
  const memory = buildMemory({
    events: [
      makeEvent('p', 'into', 's1', at(1)),
      makeEvent('p', 'into', 's2', at(2)),
      makeEvent('s', 'nah', 's1', at(3)),
      makeEvent('m', 'into', 's1', at(4)),
    ],
    saved: {},
    restores: {},
  });

  it('orders staples, then liked, then passed', () => {
    expect(reshowCandidates('dinner', emptyDeck(), ctx({ memory }))).toEqual(['p', 'm', 's']);
  });

  it('keeps re-shows under the share and interleaves them (LR-7)', () => {
    const fresh = Array.from({ length: 10 }, (_, i) => `f${i}`);
    const merged = mergeIntoQueue(emptyDeck(), fresh, ['p', 'm', 's'], {
      position: 'back',
      hasStapleInPool: true,
    });
    expect(merged.reshows).toEqual(['p', 'm']);
    expect(merged.queue).toEqual([
      'f0',
      'f1',
      'f2',
      'f3',
      'p',
      'f4',
      'f5',
      'f6',
      'f7',
      'm',
      'f8',
      'f9',
    ]);
  });

  it('guarantees a staple slot even when the share rounds to zero (LR-6)', () => {
    const merged = mergeIntoQueue(emptyDeck(), ['f0', 'f1'], ['p'], {
      position: 'back',
      hasStapleInPool: true,
    });
    expect(merged.queue).toEqual(['f0', 'f1', 'p']);
  });

  it('can put a batch in front of the existing queue (RF-8)', () => {
    const merged = mergeIntoQueue(deck(['old']), ['new'], [], {
      position: 'front',
      hasStapleInPool: false,
    });
    expect(merged.queue).toEqual(['new', 'old']);
  });
});
