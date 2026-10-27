import type { Photo } from '@/domain/types';
import type { PhotoSource } from './PhotoSource';

/**
 * Tries each source in order, asking the next only about dishes still
 * without a photo. A failing source is skipped; whatever was found before an
 * abort is kept.
 */
export function firstMatch(...sources: PhotoSource[]): PhotoSource {
  return {
    async find(dishes, options = {}) {
      const found = new Map<string, Photo>();
      for (const source of sources) {
        const remaining = dishes.filter((d) => !found.has(d.id));
        if (remaining.length === 0 || options.signal?.aborted) break;
        try {
          for (const [id, photo] of await source.find(remaining, options)) found.set(id, photo);
        } catch (error) {
          if (!options.signal?.aborted) console.warn('[photos] lookup failed', error);
        }
      }
      return found;
    },
  };
}
