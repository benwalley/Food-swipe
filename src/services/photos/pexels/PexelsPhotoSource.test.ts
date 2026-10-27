import { describe, expect, it, vi } from 'vitest';
import { ing, makeDish } from '@/test/factories';
import { keywords, PexelsPhotoSource } from './PexelsPhotoSource';

const result = (alt: string, photographer = 'Jane Doe') => ({
  url: `https://www.pexels.com/photo/${encodeURIComponent(alt)}/`,
  photographer,
  alt,
  src: {
    large: `https://images.pexels.com/photos/1/large.jpeg?alt=${encodeURIComponent(alt)}`,
    tiny: `https://images.pexels.com/photos/1/tiny.jpeg?alt=${encodeURIComponent(alt)}`,
  },
});

function reply(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status });
}

function source(fetch: typeof globalThis.fetch, now = () => 0) {
  return new PexelsPhotoSource({ apiKey: 'test-key', fetch, now });
}

const traybake = makeDish({
  id: 't',
  title: 'Harissa Chickpea Traybake',
  ingredients: [ing('chickpeas', 'chickpeas', 'main'), ing('harissa', 'harissa', 'supporting')],
});

describe('PexelsPhotoSource', () => {
  it('uses the first result whose description mentions the dish', async () => {
    const fetch = vi.fn(async () =>
      reply(200, {
        photos: [result('A notepad on a desk'), result('Roasted chickpeas on a tray', 'Ana')],
      }),
    );
    const found = await source(fetch).find([traybake]);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).searchParams.get('query')).toBe('Harissa Chickpea Traybake');
    expect(init.headers).toEqual({ Authorization: 'test-key' });
    expect(found.get('t')).toMatchObject({
      source: 'pexels',
      author: 'Ana',
      license: '',
      pageUrl: 'https://www.pexels.com/photo/Roasted%20chickpeas%20on%20a%20tray/',
    });
  });

  it('finds nothing when no result looks like the dish', async () => {
    const fetch = vi.fn(async () => reply(200, { photos: [result('A notepad on a desk')] }));
    expect((await source(fetch).find([traybake])).size).toBe(0);
  });

  it('pauses after the hourly limit runs out', async () => {
    let time = 0;
    const fetch = vi.fn(async () => reply(429));
    const pexels = source(fetch, () => time);
    await pexels.find([traybake, makeDish(), makeDish(), makeDish()]);
    const calls = fetch.mock.calls.length;
    expect(calls).toBeLessThanOrEqual(3);

    await pexels.find([traybake]);
    expect(fetch).toHaveBeenCalledTimes(calls);

    time = 16 * 60 * 1000;
    await pexels.find([traybake]);
    expect(fetch).toHaveBeenCalledTimes(calls + 1);
  });

  it('stops using a rejected key', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetch = vi.fn(async () => reply(401));
    const pexels = source(fetch);
    await pexels.find([traybake]);
    await pexels.find([traybake]);
    expect(fetch).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('keywords', () => {
  it('keeps distinctive words in singular form', () => {
    expect([...keywords(['Roasted Tomatoes with Berries', 'pancakes', 'Crème brûlée'])]).toEqual([
      'tomato',
      'berry',
      'pancake',
      'creme',
      'brulee',
    ]);
  });
});
