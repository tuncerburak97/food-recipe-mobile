import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { appearanceStorage } from '@/lib/token-storage';

/** The user's theme choice. The app is light unless they pick otherwise in Profil → Görünüm. */
export type Appearance = 'light' | 'dark' | 'system';

interface AppearanceValue {
  appearance: Appearance;
  setAppearance: (value: Appearance) => void;
}

export const AppearanceContext = createContext<AppearanceValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setState] = useState<Appearance>('light');

  useEffect(() => {
    appearanceStorage
      .get()
      .then((v) => {
        if (v === 'dark' || v === 'system') setState(v);
      })
      .catch(() => {});
  }, []);

  const setAppearance = (value: Appearance) => {
    setState(value);
    appearanceStorage.set(value).catch(() => {});
  };

  return <AppearanceContext value={{ appearance, setAppearance }}>{children}</AppearanceContext>;
}

export function useAppearance() {
  const ctx = use(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider');
  return ctx;
}
