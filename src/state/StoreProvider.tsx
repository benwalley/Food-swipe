import { useEffect, useState, type ReactNode } from 'react';
import { createAppStore, type Services } from './appStore';
import { StoreContext, type StoreContextValue } from './context';

export function StoreProvider({ services, children }: { services: Services; children: ReactNode }) {
  const [value] = useState<StoreContextValue>(() => ({
    store: createAppStore(services),
    notifier: services.notifier,
    sourceLabel: services.ideas.label,
  }));

  useEffect(() => {
    void value.store.getState().init();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void services.repo.flush();
      else value.store.getState().resumeIfStale();
    };
    const onPageHide = () => void services.repo.flush();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [value, services.repo]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
