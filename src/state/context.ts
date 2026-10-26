import { createContext } from 'react';
import type { AppStore } from './appStore';
import type { Notifier } from './notices';

export interface StoreContextValue {
  store: AppStore;
  notifier: Notifier;
  sourceLabel: string;
}

export const StoreContext = createContext<StoreContextValue | null>(null);
