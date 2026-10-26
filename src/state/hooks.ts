import { useContext } from 'react';
import { useStore } from 'zustand';
import type { AppState, AppStore } from './appStore';
import { StoreContext, type StoreContextValue } from './context';
import type { Notifier } from './notices';

function useStoreContext(): StoreContextValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('App hooks must be used inside <StoreProvider>.');
  return value;
}

/** Subscribe to a slice of app state. Keep selectors narrow to avoid re-renders. */
export function useApp<T>(selector: (state: AppState) => T): T {
  return useStore(useStoreContext().store, selector);
}

/** Imperative access for event handlers (no subscription). */
export function useAppStore(): AppStore {
  return useStoreContext().store;
}

export function useNotifier(): Notifier {
  return useStoreContext().notifier;
}

export function useSourceLabel(): string {
  return useStoreContext().sourceLabel;
}
