import { useEffect, useRef } from 'react';

/**
 * Renders Google's Search Suggestions snippet, which Google's terms require
 * alongside results grounded in Google Search. A shadow root keeps its own
 * styles from leaking into the app and ours from breaking it.
 */
export function SearchSuggestions({ snippets }: { snippets: readonly string[] }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    root.innerHTML = snippets.join('');
    for (const link of root.querySelectorAll('a')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
  }, [snippets]);

  if (snippets.length === 0) return null;
  return (
    <div data-no-drag className="touch-pan-x">
      <p className="mb-1.5 text-[11px] text-ink-3">Found with Google Search</p>
      <div ref={hostRef} className="max-w-full overflow-hidden" />
    </div>
  );
}
