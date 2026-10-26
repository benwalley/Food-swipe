import type { Dish, IngredientPref, IngredientPrefs, PrefEntry } from './types';

/**
 * Canonical key for an ingredient family, so "Mushrooms", "mushroom" and
 * "mushrooms " all match. Deliberately simple: the AI is asked to return
 * families, and this only has to absorb casing and plural noise.
 */
export function canonicalIngredient(raw: string): string {
  const words = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
  return words.map(singularize).join(' ');
}

function singularize(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (/(oes|ches|shes|xes|sses)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us')) return word.slice(0, -1);
  return word;
}

/** Title-cases the first letter for display, e.g. "mushrooms" → "Mushrooms". */
export function ingredientLabel(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** True if `key` appears as whole words inside canonical `text`. */
function containsKey(text: string, key: string): boolean {
  return ` ${text} `.includes(` ${key} `);
}

/**
 * The preference that applies to one ingredient, matching on its family first
 * and then on its specific name, so "never mushrooms" also catches "cremini
 * mushrooms" when the family was reported differently.
 */
export function prefForIngredient(
  ingredient: { name: string; family: string },
  prefs: IngredientPrefs,
): { key: string; entry: PrefEntry } | null {
  const family = canonicalIngredient(ingredient.family);
  const direct = prefs[family];
  if (direct) return { key: family, entry: direct };
  const name = canonicalIngredient(ingredient.name);
  for (const [key, entry] of Object.entries(prefs)) {
    if (containsKey(family, key) || containsKey(name, key)) return { key, entry };
  }
  return null;
}

/** Spec DK-5: a dish containing any Never ingredient is never shown. */
export function hasNeverIngredient(dish: Dish, prefs: IngredientPrefs): boolean {
  return dish.ingredients.some((i) => prefForIngredient(i, prefs)?.entry.pref === 'never');
}

/**
 * Ordering penalty from ingredient preferences (spec LR-9). Higher sorts later.
 * Main ingredients weigh more than supporting ones; loves pull a dish forward.
 */
export function preferencePenalty(dish: Dish, prefs: IngredientPrefs): number {
  let penalty = 0;
  for (const ingredient of dish.ingredients) {
    const pref = prefForIngredient(ingredient, prefs)?.entry.pref;
    const weight = ingredient.role === 'main' ? 1 : 0.35;
    if (pref === 'meh') penalty += 3 * weight;
    if (pref === 'love') penalty -= 1 * weight;
  }
  return penalty;
}

/** Snapshot of the prefs that touch this dish, recorded with each verdict. */
export function prefsTouchingDish(
  dish: Dish,
  prefs: IngredientPrefs,
): Record<string, IngredientPref> {
  const touched: Record<string, IngredientPref> = {};
  for (const ingredient of dish.ingredients) {
    const match = prefForIngredient(ingredient, prefs);
    if (match) touched[match.key] = match.entry.pref;
  }
  return touched;
}

/** Ingredient families on a dish that the user would rather skip. */
export function heldIngredients(dish: Dish, prefs: IngredientPrefs): string[] {
  return dish.ingredients
    .filter((i) => {
      const pref = prefForIngredient(i, prefs)?.entry.pref;
      return pref === 'meh' || pref === 'never';
    })
    .map((i) => i.family);
}

/** Next state when cycling a chip: love → meh → never → cleared (spec RF-6). */
export function nextPrefInCycle(current: IngredientPref | undefined): IngredientPref | null {
  if (current === 'love') return 'meh';
  if (current === 'meh') return 'never';
  if (current === 'never') return null;
  return 'love';
}
