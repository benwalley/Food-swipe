import { tuning } from '@/config/tuning';
import type { Photo } from '@/domain/types';
import type { IdeaSource } from '../ideas/IdeaSource';
import type { PhotoSource } from './PhotoSource';

/**
 * Adds photos to each batch before it reaches the deck, so a card shows its
 * photo from the start and the photo is saved with the dish. Lookups get a
 * short deadline and never fail a batch: dishes without a photo by then keep
 * the illustration. A backend would do this server-side and cache it.
 */
export function withPhotos(
  ideas: IdeaSource,
  photos: PhotoSource,
  timeoutMs: number = tuning.photos.lookupTimeoutMs,
): IdeaSource {
  return {
    label: ideas.label,
    async fetchBatch(brief, options = {}) {
      const result = await ideas.fetchBatch(brief, options);
      const deadline = AbortSignal.timeout(timeoutMs);
      const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
      const found = await photos
        .find(result.dishes, { signal })
        .catch(() => new Map<string, Photo>());
      return {
        ...result,
        dishes: result.dishes.map((dish) => {
          const photo = found.get(dish.id);
          return photo ? { ...dish, photo } : dish;
        }),
      };
    },
  };
}
