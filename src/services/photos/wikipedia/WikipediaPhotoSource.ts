import * as z from 'zod/mini';
import { tuning } from '@/config/tuning';
import type { Photo } from '@/domain/types';
import { isHttpsUrl } from '@/lib/url';
import type { PhotoQuery, PhotoSource } from '../PhotoSource';

const API = 'https://en.wikipedia.org/w/api.php';
/** The API's limit on titles per request for anonymous callers. */
const MAX_TITLES = 50;
/** Lets browsers and Wikimedia's cache reuse identical lookups for a day. */
const CACHE_SECONDS = '86400';

type GetJson = (url: string, signal?: AbortSignal) => Promise<unknown>;

const renames = z.optional(
  z.array(z.object({ from: z.string(), to: z.string(), tofragment: z.optional(z.string()) })),
);

const pageImagesResponse = z.object({
  query: z.optional(
    z.object({
      normalized: renames,
      redirects: renames,
      pages: z.array(
        z.object({
          title: z.string(),
          missing: z.optional(z.boolean()),
          pageprops: z.optional(z.object({ disambiguation: z.optional(z.string()) })),
          thumbnail: z.optional(z.object({ source: z.string(), width: z.number() })),
          pageimage: z.optional(z.string()),
        }),
      ),
    }),
  ),
});

const creditsResponse = z.object({
  query: z.optional(
    z.object({
      normalized: renames,
      pages: z.array(
        z.object({
          title: z.string(),
          imageinfo: z.optional(
            z.array(
              z.object({
                extmetadata: z.optional(
                  z.record(z.string(), z.object({ value: z.optional(z.unknown()) })),
                ),
              }),
            ),
          ),
        }),
      ),
    }),
  ),
});

interface PageImage {
  url: string;
  /** File name as Wikipedia stores it, e.g. "Okonomiyaki_001.jpg". */
  file: string;
}

interface Credit {
  author: string;
  license: string;
}

/**
 * Finds each dish's photo through the English Wikipedia article Gemini named
 * for it. Two requests cover a whole batch: one for the articles' lead
 * images, one for those images' authors and licences. Only freely licensed
 * images are returned.
 */
export class WikipediaPhotoSource implements PhotoSource {
  constructor(private readonly getJson: GetJson = fetchJson) {}

  async find(
    dishes: readonly PhotoQuery[],
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<Map<string, Photo>> {
    const found = new Map<string, Photo>();
    const titles = [
      ...new Set(dishes.flatMap((d) => (d.wikipediaTitle ? [d.wikipediaTitle] : []))),
    ].slice(0, MAX_TITLES);
    if (titles.length === 0) return found;

    const images = await this.pageImages(titles, signal);
    if (images.size === 0) return found;
    // A missing credit still leaves the link to the file page, which shows the licence.
    const credits = await this.credits(
      [...new Set([...images.values()].map((i) => i.file))],
      signal,
    ).catch(() => new Map<string, Credit>());

    for (const dish of dishes) {
      const image = dish.wikipediaTitle ? images.get(dish.wikipediaTitle) : undefined;
      if (!image) continue;
      const credit = credits.get(image.file);
      found.set(dish.id, {
        url: image.url,
        thumbUrl: image.url.replace(
          `/${tuning.photos.cardWidth}px-`,
          `/${tuning.photos.thumbWidth}px-`,
        ),
        source: 'wikipedia',
        author: credit?.author ?? '',
        license: credit?.license ?? '',
        pageUrl: `https://en.wikipedia.org/wiki/File:${encodeURIComponent(image.file)}`,
      });
    }
    return found;
  }

  /** Lead image of each article, keyed by the title as requested. */
  private async pageImages(
    titles: string[],
    signal?: AbortSignal,
  ): Promise<Map<string, PageImage>> {
    const json = await this.getJson(
      apiUrl({
        prop: 'pageimages|pageprops',
        ppprop: 'disambiguation',
        piprop: 'thumbnail|name',
        pithumbsize: String(tuning.photos.cardWidth),
        // Leaves out non-free images, such as logos used under fair use.
        pilicense: 'free',
        redirects: '1',
        titles: titles.join('|'),
      }),
      signal,
    );
    const query = pageImagesResponse.parse(json).query;
    const images = new Map<string, PageImage>();
    if (!query) return images;

    const normalized = new Map(query.normalized?.map((r) => [r.from, r]));
    const redirects = new Map(query.redirects?.map((r) => [r.from, r]));
    const pages = new Map(query.pages.map((p) => [p.title, p]));
    for (const title of titles) {
      const name = normalized.get(title)?.to ?? title;
      const redirect = redirects.get(name);
      // A redirect to a section lands on a broader article, whose photo is of something else.
      if (redirect?.tofragment) continue;
      const page = pages.get(redirect?.to ?? name);
      const thumb = page?.thumbnail;
      if (!page || page.missing || page.pageprops?.disambiguation !== undefined) continue;
      if (!thumb || !page.pageimage || !isHttpsUrl(thumb.source)) continue;
      if (thumb.width < tuning.photos.minWidth) continue;
      images.set(title, { url: thumb.source, file: page.pageimage });
    }
    return images;
  }

  /** Author and licence of each file, keyed by file name. */
  private async credits(files: string[], signal?: AbortSignal): Promise<Map<string, Credit>> {
    const requested = files.map((file) => `File:${file}`);
    const json = await this.getJson(
      apiUrl({
        prop: 'imageinfo',
        iiprop: 'extmetadata',
        iiextmetadatafilter: 'Artist|LicenseShortName',
        titles: requested.join('|'),
      }),
      signal,
    );
    const query = creditsResponse.parse(json).query;
    const credits = new Map<string, Credit>();
    if (!query) return credits;

    const normalized = new Map(query.normalized?.map((r) => [r.from, r.to]));
    const fileByTitle = new Map(
      requested.map((title, i) => [normalized.get(title) ?? title, files[i]!]),
    );
    for (const page of query.pages) {
      const file = fileByTitle.get(page.title);
      const meta = page.imageinfo?.[0]?.extmetadata;
      if (!file || !meta) continue;
      credits.set(file, {
        author: plainText(meta.Artist?.value, 40),
        license: plainText(meta.LicenseShortName?.value, 24),
      });
    }
    return credits;
  }
}

function apiUrl(params: Record<string, string>): string {
  const search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    // Anonymous CORS: no cookies are sent or read.
    origin: '*',
    maxage: CACHE_SECONDS,
    smaxage: CACHE_SECONDS,
    ...params,
  });
  return `${API}?${search}`;
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, credentials: 'omit' });
  if (!response.ok) throw new Error(`Wikipedia responded ${response.status}`);
  return response.json();
}

/**
 * Wikipedia gives authors as HTML, often a link to their user page. This
 * keeps the text only; parsed documents are inert, so nothing in it runs.
 */
function plainText(html: unknown, max: number): string {
  if (typeof html !== 'string') return '';
  const text = new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '';
  const single = text.replace(/\s+/g, ' ').trim();
  return single.length > max ? `${single.slice(0, max - 1).trimEnd()}…` : single;
}
