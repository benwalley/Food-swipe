import { Ban, Heart, ThumbsDown, type LucideIcon } from 'lucide-react';
import type { IngredientPref } from '@/domain/types';

/** Label, icon, and colour classes for each ingredient preference. */
export const PREF_META: Record<
  IngredientPref,
  { label: string; icon: LucideIcon; on: string; chip: string }
> = {
  love: {
    label: 'Love',
    icon: Heart,
    on: 'bg-like text-surface border-like',
    chip: 'bg-like-soft text-like border-like/30',
  },
  meh: {
    label: 'Not a fan',
    icon: ThumbsDown,
    on: 'bg-super text-surface border-super',
    chip: 'bg-super-soft text-super border-super/30',
  },
  never: {
    label: 'Never',
    icon: Ban,
    on: 'bg-nope text-surface border-nope',
    chip: 'bg-nope-soft text-nope border-nope/30 line-through decoration-1',
  },
};
