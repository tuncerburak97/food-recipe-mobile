import { useEffect, useRef } from 'react';

import { openSignIn, useAccess, useAppConfig } from '@/lib/access';
import { ensurePurchases, sdkKey } from '@/lib/purchases';
import { useMe } from '@/lib/queries';
import { appleAvailable, googleAvailable } from '@/lib/social-auth';
import { signInNudgeStorage } from '@/lib/token-storage';

/**
 * Quiet account work that runs while the app is open (rendered once, under the navigator):
 *
 * - RevenueCat always knows who the user is (the server's billing id), also right after a sign-in
 *   moved this device to another account, so a purchase lands on the right account.
 * - A guest who just saved their Nth recipe (set on the server) is offered to sign in, once: that
 *   is the moment they have something to lose.
 */
export function AccountEffects() {
  const config = useAppConfig();
  const access = useAccess().data;
  const me = useMe().data;

  const key = sdkKey(config);
  const billingId = access?.billing_id;
  useEffect(() => {
    if (key && billingId) ensurePurchases(config, billingId);
    // Only the key and the user matter; the config object is new on every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, billingId]);

  const guest = me?.guest;
  const count = me?.recipeCount;
  const after = config.billing.nudges.sign_in_after_saves;
  const canSignIn = appleAvailable(config) || googleAvailable(config);
  const before = useRef<number | undefined>(undefined);
  useEffect(() => {
    const prev = before.current;
    before.current = count;
    // Only when the book just grew in this session, never on launch.
    if (!guest || !canSignIn || !after || count == null || prev == null || count <= prev || count < after) return;
    let cancelled = false;
    signInNudgeStorage
      .get()
      .then((seen) => {
        if (cancelled || seen === '1') return;
        signInNudgeStorage.set('1').catch(() => {});
        setTimeout(() => openSignIn('save'), 900);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [guest, canSignIn, after, count]);

  return null;
}
