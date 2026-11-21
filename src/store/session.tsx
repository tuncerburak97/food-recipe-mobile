import { useQueryClient } from '@tanstack/react-query';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { identifyUser, resetAnalytics, track } from '@/lib/analytics';
import { api, setAuthToken, setDeviceId } from '@/lib/api';
import type { CookProfile } from '@/lib/profile';
import { claimPurchases } from '@/lib/purchases';
import { forgetGoogle, type ProviderToken } from '@/lib/social-auth';
import { deviceIdStorage, onboardedStorage, tokenStorage } from '@/lib/token-storage';
import type { AppUser } from '@/lib/types';

/** What a sign-in did. */
export interface SignInResult {
  user: AppUser;
  /** The device moved to an account that existed already (instead of the guest becoming one). */
  switched: boolean;
  /** What the guest saved on this device was moved into that account. */
  merged: boolean;
}

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
  /**
   * Signs in with a token from Apple or Google (lib/social-auth). The guest account of this device
   * becomes a member, or, when the identity already has an account, the device moves to it and
   * what the guest saved here comes along.
   */
  signIn: (token: ProviderToken) => Promise<SignInResult>;
  /** Leaves the account on this device (or drops the guest account) and starts a new guest account. */
  signOut: () => Promise<void>;
  /** Deletes the account and everything in it, then starts a new guest account. */
  deleteAccount: () => Promise<void>;
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

  /** Forgets everything about the account on this device and registers a new guest. */
  const reset = async () => {
    await Promise.all([tokenStorage.clear(), deviceIdStorage.clear(), onboardedStorage.clear()]);
    setAuthToken(null);
    setDeviceId(null);
    queryClient.clear();
    resetAnalytics();
    retry();
  };

  const value: SessionValue = {
    status,
    deviceId,
    retry,
    async completeOnboarding(name, profile) {
      const user = await api.saveProfile(name.trim() || undefined, profile, true);
      await onboardedStorage.set('1');
      queryClient.setQueryData(['me'], user);
      track('onboarding_completed', { skill: profile.skill ?? null, household: profile.household ?? null, persona: profile.persona ?? null });
      setStatus('ready');
    },
    async signIn(t) {
      const res = await api.signIn(t.provider, t.identityToken, t.name);
      if (res.token) {
        // Another account: its token replaces the guest's, and nothing cached is ours any more.
        await tokenStorage.set(res.token);
        setAuthToken(res.token);
        queryClient.clear();
        if (res.user.onboarded) await onboardedStorage.set('1');
        else await onboardedStorage.clear();
      }
      queryClient.setQueryData(['me'], res.user);
      queryClient.invalidateQueries();
      // Before the event: when the device moved to an existing account, "signed_in" belongs to
      // that account, not to the guest that was here.
      identifyUser(res.user);
      track('signed_in', { provider: t.provider, merged: res.merged, new_member: res.created });
      if (res.token) {
        // A subscription bought on this phone as a guest follows the person into the account.
        claimPurchases();
        setStatus(res.user.onboarded ? 'ready' : 'onboarding');
      }
      return { user: res.user, switched: !!res.token, merged: res.merged };
    },
    async signOut() {
      // Ends the server session of a member; a guest has none. Never blocks leaving.
      await api.signOut().catch(() => {});
      await forgetGoogle();
      track('signed_out');
      await reset();
    },
    async deleteAccount() {
      await api.deleteAccount();
      await forgetGoogle();
      track('account_deleted');
      await reset();
    },
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
