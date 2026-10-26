import { prefForIngredient } from '@/domain/ingredients';
import type { Dish } from '@/domain/types';
import { useApp, useAppStore } from '@/state/hooks';
import { PrefButtons } from '@/ui/components/PrefControls';

/** "How do you feel about…" rows for a dish's ingredients (spec IN-2, IN-3). */
export function IngredientRatings({ dish }: { dish: Dish }) {
  const prefs = useApp((s) => s.prefs);
  const store = useAppStore();
  return (
    <ul className="divide-y divide-line">
      {dish.ingredients.map((ingredient) => {
        const match = prefForIngredient(ingredient, prefs);
        const family = ingredient.family;
        const showName = ingredient.name.toLowerCase() !== family.toLowerCase();
        return (
          <li key={family} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-tight font-medium first-letter:uppercase">
                {family}
                {ingredient.role === 'main' && (
                  <span className="ml-1.5 align-middle text-[10px] font-semibold tracking-wider text-ink-3 uppercase">
                    main
                  </span>
                )}
              </p>
              {showName && <p className="mt-0.5 truncate text-xs text-ink-3">{ingredient.name}</p>}
            </div>
            <PrefButtons
              ingredient={family}
              value={match?.entry.pref}
              onChange={(pref) => store.getState().setPref(match?.entry.label ?? family, pref)}
            />
          </li>
        );
      })}
    </ul>
  );
}
