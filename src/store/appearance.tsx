import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { Appearance as NativeAppearance } from 'react-native';

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

  // The phone's own parts (keyboard, alerts, status bar, screen backgrounds) follow the choice too,
  // so they stay light even when the phone is in dark mode. "system" hands them back to the phone.
  useEffect(() => {
    try {
      NativeAppearance.setColorScheme(appearance === 'system' ? 'unspecified' : appearance);
    } catch {
      // not supported on this platform (web)
    }
  }, [appearance]);

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
