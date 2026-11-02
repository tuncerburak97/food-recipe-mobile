import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { api, setAuthToken, setDeviceId } from '@/lib/api';
import type { CookProfile } from '@/lib/profile';
import { deviceIdStorage, onboardedStorage, tokenStorage } from '@/lib/token-storage';

/**
 * loading: reading the Keychain / registering the device. error: first launch could not reach the
 * server. onboarding: a guest account exists but the questions are not answered yet. ready: the app.
 */
type Status = 'loading' | 'error' | 'onboarding' | 'ready';

interface SessionValue {
  status: Status;
  /** This install's UUID (null for accounts created before device ids). */
  deviceId: string | null;
  /** Retries the first-launch registration after an error. */
  retry: () => void;
  /** Saves the onboarding answers and opens the app. */
  completeOnboarding: (name: string, profile: CookProfile) => Promise<void>;
  /** Forgets this install's account and starts again with a new guest account. */
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Every install is a guest account from the first launch: the server mints a device UUID and a user,
 * the app keeps the device id and token in the Keychain and sends them with every request. Google or
 * Apple sign-in and purchases will later attach to the same user, so nothing is lost.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [deviceId, setDevice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [token, device, onboarded] = await Promise.all([tokenStorage.get(), deviceIdStorage.get(), onboardedStorage.get()]);
        setDeviceId(device);
        if (!cancelled) setDevice(device);

        if (token) {
          setAuthToken(token);
          if (onboarded === '1') {
            if (!cancelled) setStatus('ready');
            return;
          }
          // Accounts from before onboarding existed answer the questions once.
          const me = await api.me();
          queryClient.setQueryData(['me'], me);
          if (me.onboarded) await onboardedStorage.set('1');
          if (!cancelled) setStatus(me.onboarded ? 'ready' : 'onboarding');
          return;
        }

        const reg = await api.registerDevice();
        await Promise.all([tokenStorage.set(reg.token), deviceIdStorage.set(reg.deviceId)]);
        setAuthToken(reg.token);
        setDeviceId(reg.deviceId);
        queryClient.setQueryData(['me'], reg.user);
        if (!cancelled) {
          setDevice(reg.deviceId);
          setStatus('onboarding');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt, queryClient]);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((a) => a + 1);
  }, []);

  const value: SessionValue = {
    status,
    deviceId,
    retry,
    async completeOnboarding(name, profile) {
      const user = await api.saveProfile(name.trim() || undefined, profile, true);
      await onboardedStorage.set('1');
      queryClient.setQueryData(['me'], user);
      setStatus('ready');
    },
    async signOut() {
      await Promise.all([tokenStorage.clear(), deviceIdStorage.clear(), onboardedStorage.clear()]);
      setAuthToken(null);
      setDeviceId(null);
      queryClient.clear();
      retry();
    },
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
