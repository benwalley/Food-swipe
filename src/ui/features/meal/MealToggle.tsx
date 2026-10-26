import { CakeSlice, Croissant, Popcorn, Salad, UtensilsCrossed } from 'lucide-react';
import { MEAL_LABELS } from '@/domain/meals';
import { MEALS, type Meal } from '@/domain/types';
import { useApp, useAppStore } from '@/state/hooks';
import { SegmentedControl, type SegmentOption } from '@/ui/components/SegmentedControl';

const ICONS = {
  breakfast: Croissant,
  lunch: Salad,
  dinner: UtensilsCrossed,
  snack: Popcorn,
  dessert: CakeSlice,
} as const;

const MEAL_OPTIONS: SegmentOption<Meal>[] = MEALS.map((meal) => ({
  value: meal,
  label: MEAL_LABELS[meal],
  icon: ICONS[meal],
}));

/** Spec MT-1: five meals, each with its own deck. */
export function MealToggle() {
  const meal = useApp((s) => s.meal);
  const store = useAppStore();
  return (
    <SegmentedControl
      label="Meal"
      layoutId="meal-pill"
      options={MEAL_OPTIONS}
      value={meal}
      onChange={(next) => store.getState().setMeal(next)}
      stacked
    />
  );
}
