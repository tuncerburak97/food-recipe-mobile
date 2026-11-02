import { useIsFocused } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { VoiceSession, type VoiceContext } from '@/lib/voice/session';
import { useTimers } from '@/store/timers';

/**
 * The cook screen's voice session: created once, told the current page and timers on every
 * render, paused while another screen is on top, and stopped when cook mode closes.
 */
export function useVoiceSession({ entryId, recipe, page, onGo, onComplete }: VoiceContext) {
  const [session] = useState(() => new VoiceSession());
  const state = useSyncExternalStore(session.subscribe, session.getState, session.getState);
  const timers = useTimers();
  const focused = useIsFocused();

  // Runs first, so the session knows the page before it mounts. No deps: the latest callbacks.
  useEffect(() => {
    session.setContext({ entryId, recipe, page, onGo, onComplete });
  });

  useEffect(() => {
    session.mount();
    return () => session.unmount();
  }, [session]);

  useEffect(() => {
    session.setTimers(timers);
  }, [session, timers]);

  useEffect(() => {
    session.setFocused(focused);
  }, [session, focused]);

  return { session, state };
}
