import type { Dish } from '@/domain/types';

export function formatMinutes(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}

/** "Thai · 35 min" style meta line. */
export function metaLine(dish: Dish): string {
  return [dish.cuisine, formatMinutes(dish.totalMinutes)].filter(Boolean).join(' · ');
}

export function formatSavedDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `on ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}
