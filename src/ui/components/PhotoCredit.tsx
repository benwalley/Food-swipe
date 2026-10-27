import { Camera } from 'lucide-react';
import type { Photo } from '@/domain/types';
import { isHttpsUrl } from '@/lib/url';

const HOSTS: Record<Photo['source'], string> = {
  wikipedia: 'Wikimedia Commons',
  pexels: 'Pexels',
};

/** "Calliopejen1 · CC BY-SA 3.0" for Wikipedia, "Jane Doe · Pexels" for Pexels. */
function creditParts(photo: Photo): { who: string; terms: string } {
  if (photo.source === 'pexels') return { who: photo.author, terms: 'Pexels' };
  return { who: photo.author || 'Wikipedia', terms: photo.license };
}

function creditLabel(photo: Photo): string {
  const by = photo.author ? ` by ${photo.author}` : '';
  const license = photo.license ? `, ${photo.license}` : '';
  return `Photo${by}${license}, on ${HOSTS[photo.source]}. Opens in a new tab.`;
}

/**
 * The credit each photo's licence asks for, as a small pill over the photo.
 * It links to the photo's page, which names the author and licence in full.
 */
export function PhotoCredit({ photo, className = '' }: { photo: Photo; className?: string }) {
  const style = `inline-flex h-6 items-center gap-1 rounded-full bg-surface/85 px-2.5 text-[11px] font-medium text-ink-2 backdrop-blur ${className}`;
  const { who, terms } = creditParts(photo);
  // A long name gives way first, so the licence always shows in full.
  const body = (
    <>
      <Camera className="size-3 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      {who && <span className="min-w-0 truncate">{who}</span>}
      {who && terms && <span aria-hidden="true">·</span>}
      {terms && <span className="shrink-0 whitespace-nowrap">{terms}</span>}
    </>
  );
  if (!isHttpsUrl(photo.pageUrl)) return <span className={style}>{body}</span>;
  return (
    <a
      href={photo.pageUrl}
      target="_blank"
      rel="noopener noreferrer"
      data-no-drag
      aria-label={creditLabel(photo)}
      className={`${style} transition-colors hover:text-ink`}
    >
      {body}
    </a>
  );
}
