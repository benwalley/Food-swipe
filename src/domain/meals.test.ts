import { describe, expect, it } from 'vitest';
import { defaultMealForTime } from './meals';

const at = (h: number, m = 0) => new Date(2026, 9, 26, h, m);

describe('defaultMealForTime (MT-2)', () => {
  it.each([
    [at(5), 'breakfast'],
    [at(10, 29), 'breakfast'],
    [at(10, 30), 'lunch'],
    [at(14, 29), 'lunch'],
    [at(14, 30), 'snack'],
    [at(17), 'dinner'],
    [at(20, 59), 'dinner'],
    [at(21), 'dessert'],
    [at(2), 'dessert'],
  ])('%s → %s', (date, meal) => {
    expect(defaultMealForTime(date)).toBe(meal);
  });
});
