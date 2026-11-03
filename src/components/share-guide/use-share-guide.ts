import { useCallback, useRef, useState } from 'react';

import { shareGuideHomeStorage, shareGuideSharedStorage } from '@/lib/token-storage';

const STORES = { home: shareGuideHomeStorage, shared: shareGuideSharedStorage };

/**
 * Shows the share guide at most once per place. `offer(then)` opens it the first time and runs
 * `then` right away every other time; `close()` hides it, remembers it and then runs `then`.
 */
export function useShareGuideOnce(place: keyof typeof STORES) {
  const [visible, setVisible] = useState(false);
  const after = useRef<(() => void) | null>(null);

  const offer = useCallback(
    async (then?: () => void) => {
      const seen = await STORES[place].get().catch(() => '1');
      if (seen === '1') {
        then?.();
        return;
      }
      after.current = then ?? null;
      setVisible(true);
    },
    [place],
  );

  const close = useCallback(() => {
    setVisible(false);
    STORES[place].set('1').catch(() => {});
    const then = after.current;
    after.current = null;
    // After the sheet has slid away, so a pushed screen does not fight its animation.
    if (then) setTimeout(then, 350);
  }, [place]);

  return { visible, offer, close };
}
