import {
  Apple,
  Beef,
  CakeSlice,
  Carrot,
  Cherry,
  Citrus,
  Coffee,
  Cookie,
  CookingPot,
  Croissant,
  Drumstick,
  Egg,
  EggFried,
  Fish,
  Hamburger,
  IceCreamBowl,
  Pizza,
  Popcorn,
  Salad,
  Sandwich,
  Shrimp,
  Soup,
  Utensils,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import type { Dish, Meal } from '@/domain/types';
import { stableHash } from '@/lib/id';

/** Warm editorial palettes for photo-less cards. `light-dark()` follows the theme. */
const PALETTES = [
  { bg: 'light-dark(#efd3c7, #4b2a20)', ink: 'light-dark(#9c3e2a, #f0b8a6)' },
  { bg: 'light-dark(#d6e2d2, #263529)', ink: 'light-dark(#3f6347, #b4d1b9)' },
  { bg: 'light-dark(#f2dfb5, #46361a)', ink: 'light-dark(#8a5a12, #ebc77e)' },
  { bg: 'light-dark(#e5d0da, #3d2631)', ink: 'light-dark(#7a3b5a, #e2b3c8)' },
  { bg: 'light-dark(#e0ddbb, #36361f)', ink: 'light-dark(#5e5c25, #d3d09a)' },
  { bg: 'light-dark(#ead6c6, #3f2f25)', ink: 'light-dark(#7b4e33, #e3c2a8)' },
  { bg: 'light-dark(#d6dee5, #26313a)', ink: 'light-dark(#3d5a73, #b5c9d9)' },
] as const;

export type Palette = (typeof PALETTES)[number];

export function paletteFor(dish: Pick<Dish, 'ideaKey' | 'title'>): Palette {
  const hash = parseInt(stableHash(dish.ideaKey || dish.title), 36);
  return PALETTES[hash % PALETTES.length]!;
}

/** First matching rule wins, so more specific dishes come before broad proteins. */
const ICON_RULES: [RegExp, LucideIcon][] = [
  [/pizza|flatbread/, Pizza],
  [/burger/, Hamburger],
  [/soup|stew|pho|ramen|chowder|broth|congee|chili\b|bisque/, Soup],
  [/salad|slaw|bowl/, Salad],
  [/shrimp|prawn|scallop/, Shrimp],
  [/fish|salmon|cod|tuna|halibut|trout|seafood/, Fish],
  [/egg|shakshuka|frittata|omelet|quiche|benedict/, EggFried],
  [/taco|burrito|sandwich|wrap|banh mi|panini|quesadilla|sub\b/, Sandwich],
  [/croissant|pastry|scone|danish/, Croissant],
  [/cake|cheesecake|tart|pie\b|tiramisu|brownie/, CakeSlice],
  [/cookie|biscuit|bar\b/, Cookie],
  [/ice cream|gelato|sorbet|posset|pudding|mousse/, IceCreamBowl],
  [/coffee|latte|espresso/, Coffee],
  [/popcorn|nacho|chips|snack mix/, Popcorn],
  [/chicken|turkey|wing|drumstick/, Drumstick],
  [/beef|steak|pork|lamb|sausage|bulgogi|meatball/, Beef],
  [/pancake|waffle|toast|oat|granola|bread|bagel|porridge/, Wheat],
  [/apple|crumble/, Apple],
  [/berry|cherry/, Cherry],
  [/lemon|lime|citrus|orange/, Citrus],
  [/carrot|veg|roasted/, Carrot],
  [/curry|risotto|casserole|braise|pasta|noodle|stroganoff/, CookingPot],
];

const MEAL_ICONS: Record<Meal, LucideIcon> = {
  breakfast: Egg,
  lunch: Sandwich,
  dinner: Utensils,
  snack: Popcorn,
  dessert: CakeSlice,
};

export function iconFor(dish: Pick<Dish, 'title' | 'ideaKey' | 'meal'>): LucideIcon {
  const text = `${dish.title} ${dish.ideaKey}`.toLowerCase();
  return ICON_RULES.find(([pattern]) => pattern.test(text))?.[1] ?? MEAL_ICONS[dish.meal];
}
