import { useCallback, useEffect, useState } from 'react';

export const TABS = ['swipe', 'list', 'taste'] as const;
export type Tab = (typeof TABS)[number];

function readTab(): Tab {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return (TABS as readonly string[]).includes(hash) ? (hash as Tab) : 'swipe';
}

/** Tab state mirrored in the URL hash so back/forward and deep links work. */
export function useTab(): [Tab, (tab: Tab) => void] {
  const [tab, setTab] = useState<Tab>(readTab);

  useEffect(() => {
    const onHash = () => setTab(readTab());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((next: Tab) => {
    if (next === readTab()) return;
    window.location.hash = next === 'swipe' ? '' : `/${next}`;
    if (next === 'swipe')
      history.replaceState(null, '', window.location.pathname + window.location.search);
    setTab(next);
  }, []);

  return [tab, go];
}
