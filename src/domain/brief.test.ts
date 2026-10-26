import { describe, expect, it } from 'vitest';
import { index, makeDish, makeEvent, pref } from '@/test/factories';
import { buildBrief, renderBrief } from './brief';
import { buildMemory } from './memory';
import { createSession, updateDeck, emptyDeck } from './session';

const now = new Date('2026-10-26T18:00:00.000Z');
const curry = makeDish({ id: 'c', title: 'Thai green curry', cuisine: 'Thai' });
const stew = makeDish({ id: 'st', title: 'Irish stew', cuisine: 'Irish' });
const dishes = index([curry, stew]);

describe('buildBrief', () => {
  it('has no exploit share when there is nothing to go on', () => {
    const session = createSession('s1', now);
    const brief = buildBrief({
      meal: 'dinner',
      count: 10,
      angle: null,
      now,
      session,
      events: [],
      dishes,
      prefs: {},
      saved: {},
      memory: new Map(),
    });
    expect(brief.exploitShare).toBeNull();
    expect(brief.month).toBe('October');
  });

  it('collects likes, passes, preferences, mood, and titles to avoid', () => {
    const events = [
      makeEvent('c', 'into', 's1', '2026-10-26T17:00:00.000Z'),
      makeEvent('st', 'nah', 's1', '2026-10-26T17:01:00.000Z'),
    ];
    let session = createSession('s1', now);
    session = updateDeck({ ...session, mood: { tags: ['cozy'], note: 'no seafood' } }, 'dinner', {
      ...emptyDeck(),
      seen: ['c', 'st'],
    });
    const brief = buildBrief({
      meal: 'dinner',
      count: 10,
      angle: null,
      now,
      session,
      events,
      dishes,
      prefs: { mushroom: pref('Mushrooms', 'never'), coconut: pref('Coconut', 'love') },
      saved: {},
      memory: buildMemory({ events, saved: {}, restores: {} }),
    });
    expect(brief.intoIdeas).toEqual(['Thai green curry (Thai)']);
    expect(brief.passedIdeas).toEqual(['Irish stew (Irish)']);
    expect(brief.exploitShare).toBe(0.7);

    const text = renderBrief(brief);
    expect(text).toContain('Find 10 dinner ideas.');
    expect(text).toContain('Mood for this session: cozy; note from the user: "no seafood".');
    expect(text).toContain('Never include these ingredients: mushrooms.');
    expect(text).toContain('Ingredients they love: coconut.');
    expect(text).toContain(
      "Don't suggest these, they've already seen them: Thai green curry; Irish stew.",
    );
    expect(text).toContain('about 70% close');
  });
});
