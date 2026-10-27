import type { Dish, Photo } from '@/domain/types';

/** What a photo lookup needs to know about a dish. */
export type PhotoQuery = Pick<Dish, 'id' | 'title' | 'wikipediaTitle' | 'ingredients'>;

/**
 * Where dish photos come from. Today: Wikipedia and Pexels, called from the
 * browser. Later: a backend that looks photos up once and caches them for
 * everyone.
 */
export interface PhotoSource {
  /**
   * Looks up photos for several dishes at once and returns them by dish id.
   * Dishes with no match are left out. When the signal aborts, returns or
   * throws promptly; callers treat both the same.
   */
  find(
    dishes: readonly PhotoQuery[],
    options?: { signal?: AbortSignal },
  ): Promise<Map<string, Photo>>;
}
