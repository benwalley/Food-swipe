import type { Meal } from './types';

export const MEAL_LABELS: Record<Meal, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
  dessert: 'Dessert',
};

/** Spec MT-2: pick a sensible meal from the local time of day. */
export function defaultMealForTime(date: Date): Meal {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 5 * 60 && minutes < 10 * 60 + 30) return 'breakfast';
  if (minutes >= 10 * 60 + 30 && minutes < 14 * 60 + 30) return 'lunch';
  if (minutes >= 14 * 60 + 30 && minutes < 17 * 60) return 'snack';
  if (minutes >= 17 * 60 && minutes < 21 * 60) return 'dinner';
  return 'dessert';
}
