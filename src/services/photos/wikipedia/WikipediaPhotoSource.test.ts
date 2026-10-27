import { describe, expect, it, vi } from 'vitest';
import { makeDish } from '@/test/factories';
import { WikipediaPhotoSource } from './WikipediaPhotoSource';

const thumb = (file: string, width = 960) => ({
  source: `https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/${file}/${width}px-${file}`,
  width,
});

/** Shaped like the real API's replies (formatversion 2). */
const pageImages = {
  query: {
    normalized: [{ from: 'okonomiyaki', to: 'Okonomiyaki' }],
    redirects: [
      { from: 'Shakshuka', to: 'Shakshouka' },
      { from: 'Kra pao', to: 'Thai cuisine', tofragment: 'Dishes' },
    ],
    pages: [
      {
        title: 'Shakshouka',
        pageimage: 'Shakshuka_by_Calliopejen1.jpg',
        thumbnail: thumb('Shakshuka_by_Calliopejen1.jpg'),
      },
      {
        title: 'Okonomiyaki',
        pageimage: 'Okonomiyaki_001.jpg',
        thumbnail: thumb('Okonomiyaki_001.jpg'),
      },
      { title: 'Thai cuisine', pageimage: 'Thai_food.jpg', thumbnail: thumb('Thai_food.jpg') },
      {
        title: 'Mercury',
        pageprops: { disambiguation: '' },
        pageimage: 'M.jpg',
        thumbnail: thumb('M.jpg'),
      },
      { title: 'Tiny toast', pageimage: 'Toast.jpg', thumbnail: thumb('Toast.jpg', 200) },
      { title: 'Harissa chickpea traybake', missing: true },
    ],
  },
};

const credits = {
  query: {
    normalized: [
      { from: 'File:Shakshuka_by_Calliopejen1.jpg', to: 'File:Shakshuka by Calliopejen1.jpg' },
      { from: 'File:Okonomiyaki_001.jpg', to: 'File:Okonomiyaki 001.jpg' },
    ],
    pages: [
      {
        title: 'File:Shakshuka by Calliopejen1.jpg',
        imageinfo: [
          {
            extmetadata: {
              Artist: {
                value: '<a href="//commons.wikimedia.org/wiki/User:Calliopejen1">Calliopejen1</a>',
              },
              LicenseShortName: { value: 'CC BY-SA 3.0' },
            },
          },
        ],
      },
      { title: 'File:Okonomiyaki 001.jpg', imageinfo: [{ extmetadata: {} }] },
    ],
  },
};

function source(replies: unknown[] = [pageImages, credits]) {
  const getJson = vi.fn(async (_url: string) => replies.shift());
  return { wiki: new WikipediaPhotoSource(getJson), getJson };
}

describe('WikipediaPhotoSource', () => {
  it('finds photos for a whole batch in two requests, with credits', async () => {
    const { wiki, getJson } = source();
    const shakshuka = makeDish({ id: 'a', wikipediaTitle: 'Shakshuka' });
    const okonomiyaki = makeDish({ id: 'b', wikipediaTitle: 'okonomiyaki' });
    const found = await wiki.find([shakshuka, okonomiyaki]);

    expect(getJson).toHaveBeenCalledTimes(2);
    const lookup = new URL(getJson.mock.calls[0]![0]);
    expect(lookup.searchParams.get('titles')).toBe('Shakshuka|okonomiyaki');
    expect(lookup.searchParams.get('pilicense')).toBe('free');
    expect(lookup.searchParams.get('origin')).toBe('*');

    expect(found.get('a')).toEqual({
      url: thumb('Shakshuka_by_Calliopejen1.jpg').source,
      thumbUrl: thumb('Shakshuka_by_Calliopejen1.jpg', 330).source,
      source: 'wikipedia',
      author: 'Calliopejen1',
      license: 'CC BY-SA 3.0',
      pageUrl: 'https://en.wikipedia.org/wiki/File:Shakshuka_by_Calliopejen1.jpg',
    });
    expect(found.get('b')).toMatchObject({ author: '', license: '' });
  });

  it('skips missing articles, disambiguation pages, section redirects, and small photos', async () => {
    const { wiki } = source();
    const titles = ['Harissa chickpea traybake', 'Mercury', 'Kra pao', 'Tiny toast'];
    const found = await wiki.find(
      titles.map((t, i) => makeDish({ id: `d${i}`, wikipediaTitle: t })),
    );
    expect(found.size).toBe(0);
  });

  it('makes no request when no dish has a Wikipedia title', async () => {
    const { wiki, getJson } = source();
    expect((await wiki.find([makeDish({ wikipediaTitle: null })])).size).toBe(0);
    expect(getJson).not.toHaveBeenCalled();
  });

  it('keeps the photos when the credit lookup fails', async () => {
    const getJson = vi
      .fn()
      .mockResolvedValueOnce(pageImages)
      .mockRejectedValueOnce(new Error('Wikipedia responded 503'));
    const found = await new WikipediaPhotoSource(getJson).find([
      makeDish({ id: 'a', wikipediaTitle: 'Shakshuka' }),
    ]);
    expect(found.get('a')).toMatchObject({ author: '', license: '', source: 'wikipedia' });
  });
});
