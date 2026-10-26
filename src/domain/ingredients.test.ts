import { describe, expect, it } from 'vitest';
import { ing, makeDish, pref } from '@/test/factories';
import {
  canonicalIngredient,
  hasNeverIngredient,
  nextPrefInCycle,
  preferencePenalty,
  prefForIngredient,
} from './ingredients';

describe('canonicalIngredient', () => {
  it('normalizes case, plurals, and punctuation', () => {
    expect(canonicalIngredient('Mushrooms')).toBe('mushroom');
    expect(canonicalIngredient(' tomatoes ')).toBe('tomato');
    expect(canonicalIngredient('Cherries')).toBe('cherry');
    expect(canonicalIngredient('Peaches')).toBe('peach');
    expect(canonicalIngredient('jalapeño peppers')).toBe('jalapeno pepper');
    expect(canonicalIngredient('couscous')).toBe('couscous');
    expect(canonicalIngredient('asparagus')).toBe('asparagus');
  });
});

describe('prefForIngredient', () => {
  const prefs = { mushroom: pref('Mushrooms', 'never') };

  it('matches on family', () => {
    expect(prefForIngredient(ing('cremini', 'mushrooms'), prefs)?.entry.pref).toBe('never');
  });

  it('falls back to whole-word matches in the specific name', () => {
    expect(prefForIngredient(ing('cremini mushrooms', 'fungi'), prefs)?.key).toBe('mushroom');
  });

  it('does not match partial words', () => {
    expect(prefForIngredient(ing('mushroomy broth', 'broth'), prefs)).toBeNull();
  });
});

describe('dish-level preferences', () => {
  const dish = makeDish({
    ingredients: [
      ing('cremini mushrooms', 'mushrooms', 'main'),
      ing('parsley', 'parsley', 'supporting'),
    ],
  });

  it('detects Never ingredients', () => {
    expect(hasNeverIngredient(dish, { mushroom: pref('Mushrooms', 'never') })).toBe(true);
    expect(hasNeverIngredient(dish, { mushroom: pref('Mushrooms', 'meh') })).toBe(false);
  });

  it('weighs main ingredients more than supporting ones', () => {
    const mainMeh = preferencePenalty(dish, { mushroom: pref('Mushrooms', 'meh') });
    const sideMeh = preferencePenalty(dish, { parsley: pref('Parsley', 'meh') });
    expect(mainMeh).toBeGreaterThan(sideMeh);
    expect(sideMeh).toBeGreaterThan(0);
    expect(preferencePenalty(dish, { mushroom: pref('Mushrooms', 'love') })).toBeLessThan(0);
  });
});

describe('nextPrefInCycle', () => {
  it('cycles love → meh → never → cleared → love', () => {
    expect(nextPrefInCycle(undefined)).toBe('love');
    expect(nextPrefInCycle('love')).toBe('meh');
    expect(nextPrefInCycle('meh')).toBe('never');
    expect(nextPrefInCycle('never')).toBeNull();
  });
});
