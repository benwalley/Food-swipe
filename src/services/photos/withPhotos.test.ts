import { describe, expect, it, vi } from 'vitest';
import type { Brief } from '@/domain/brief';
import type { Photo } from '@/domain/types';
import { makeDish } from '@/test/factories';
import type { IdeaSource } from '../ideas/IdeaSource';
import { firstMatch } from './firstMatch';
import type { PhotoSource } from './PhotoSource';
import { withPhotos } from './withPhotos';

const brief = { meal: 'dinner', count: 2 } as Brief;
const batch = { id: 'b1', meal: 'dinner' as const, requestedAt: '2026-10-27T00:00:00.000Z' };
const a = makeDish({ id: 'a' });
const b = makeDish({ id: 'b' });
const ideas: IdeaSource = { label: 'Test', fetchBatch: async () => ({ batch, dishes: [a, b] }) };

const photo = (source: Photo['source']): Photo => ({
  url: `https://example.org/${source}.jpg`,
  thumbUrl: `https://example.org/${source}-small.jpg`,
  source,
  author: '',
  license: '',
  pageUrl: 'https://example.org/',
});

/** Finds a photo for the given dish ids only. */
function fake(ids: string[], source: Photo['source'] = 'wikipedia'): PhotoSource {
  return {
    find: vi.fn<PhotoSource['find']>(
      async (dishes) =>
        new Map(dishes.filter((d) => ids.includes(d.id)).map((d) => [d.id, photo(source)])),
    ),
  };
}

/** Never answers until aborted, then fails like fetch does. */
const hanging: PhotoSource = {
  find: (_dishes, { signal } = {}) =>
    new Promise((_resolve, reject) =>
      signal?.addEventListener('abort', () => reject(signal.reason as Error)),
    ),
};

describe('withPhotos', () => {
  it('adds the photos it finds and leaves the other dishes as they were', async () => {
    const { dishes } = await withPhotos(ideas, fake(['a'])).fetchBatch(brief);
    expect(dishes[0]!.photo).toEqual(photo('wikipedia'));
    expect(dishes[1]).toBe(b);
  });

  it('delivers the batch without photos when the lookup fails', async () => {
    const failing: PhotoSource = { find: async () => Promise.reject(new Error('offline')) };
    const { dishes } = await withPhotos(ideas, failing).fetchBatch(brief);
    expect(dishes).toEqual([a, b]);
  });

  it('stops waiting for photos at the deadline', async () => {
    const started = Date.now();
    const { dishes } = await withPhotos(ideas, hanging, 30).fetchBatch(brief);
    expect(dishes).toEqual([a, b]);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe('firstMatch', () => {
  it('asks the next source only about dishes still without a photo', async () => {
    const wikipedia = fake(['a'], 'wikipedia');
    const pexels = fake(['a', 'b'], 'pexels');
    const found = await firstMatch(wikipedia, pexels).find([a, b]);
    expect(found.get('a')?.source).toBe('wikipedia');
    expect(found.get('b')?.source).toBe('pexels');
    expect(vi.mocked(pexels.find).mock.calls[0]![0]).toEqual([b]);
  });

  it('keeps what earlier sources found when a later one hits the deadline', async () => {
    const found = await firstMatch(fake(['a']), hanging).find([a, b], {
      signal: AbortSignal.timeout(30),
    });
    expect([...found.keys()]).toEqual(['a']);
  });

  it('moves on when a source fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing: PhotoSource = { find: async () => Promise.reject(new Error('503')) };
    const found = await firstMatch(failing, fake(['b'], 'pexels')).find([a, b]);
    expect([...found.keys()]).toEqual(['b']);
    warn.mockRestore();
  });
});
