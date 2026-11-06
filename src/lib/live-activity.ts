import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { AppState, Platform } from 'react-native';

import type { CookTimer } from '@/store/timers';
import type { CookTimerProps } from '@/widgets/cook-timer-activity';

// Live Activities (Dynamic Island + lock screen) need iOS and a build that includes expo-widgets.
// expo-widgets loads its native module eagerly, so it is required lazily and only when present.
const available = Platform.OS === 'ios' && requireOptionalNativeModule('ExpoWidgets') != null;
const scheme = typeof Constants.expoConfig?.scheme === 'string' ? Constants.expoConfig.scheme : 'yemektarifi';

type Factory = typeof import('@/widgets/cook-timer-activity').default;
type Instance = ReturnType<Factory['start']>;

let factory: Factory | null = null;
let instance: Instance | null = null;
let shownKey = '';
let latest: CookTimer[] = [];
/** Activities handed to iOS with a removal time when the app went to the background. */
let handedOff: Instance[] = [];

/** How long a finished timer stays on the lock screen once the app is gone. */
const AFTER_END_MS = 10 * 60_000;
/** A paused timer cannot go on by itself: it stays this long, then iOS removes it. */
const PAUSED_KEEP_MS = 60 * 60_000;
/** iOS removes an ended activity at most 4 hours later. */
const MAX_KEEP_MS = 4 * 60 * 60_000 - 60_000;

function getFactory(): Factory | null {
  if (!available) return null;
  if (!factory) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    factory = (require('@/widgets/cook-timer-activity') as typeof import('@/widgets/cook-timer-activity')).default;
    // Activities left over from a previous run have no timer behind them any more.
    for (const old of factory.getInstances()) old.end('immediate').catch(() => {});
  }
  return factory;
}

/** The props for the timer that matters most: the one ending soonest, else a paused one, else a finished one. */
function propsFor(timers: CookTimer[]): { props: CookTimerProps; entryId: string } | null {
  const now = Date.now();
  const running = timers.filter((t) => t.status === 'running' && t.endsAt != null).sort((a, b) => a.endsAt! - b.endsAt!);
  const paused = timers.filter((t) => t.status === 'paused');
  const done = timers.find((t) => t.status === 'done' && !t.acknowledged);
  const others = running.length + paused.length - 1;
  const withOthers = (recipe: string) => [recipe, others > 0 ? `+${others} zamanlayıcı daha` : null].filter(Boolean).join(' · ');

  if (running[0]) {
    const t = running[0];
    return { entryId: t.entryId, props: { title: t.label, subtitle: withOthers(t.recipeTitle), startedAt: t.endsAt! - t.durationMs, endsAt: t.endsAt! } };
  }
  if (paused[0]) {
    const t = paused[0];
    const endsAt = now + (t.remainingMs ?? 0);
    return { entryId: t.entryId, props: { title: t.label, subtitle: withOthers(t.recipeTitle), startedAt: endsAt - t.durationMs, endsAt, pausedAt: now } };
  }
  if (done) {
    return { entryId: done.entryId, props: { title: done.label, subtitle: done.recipeTitle, startedAt: now - done.durationMs, endsAt: now, done: true } };
  }
  return null;
}

/**
 * Keeps the Live Activity in step with the cooking timers, so the countdown stays visible on the lock
 * screen and the Dynamic Island after leaving the app. Called whenever the timers change.
 */
export function syncLiveActivity(timers: CookTimer[]) {
  latest = timers;
  const f = getFactory();
  if (!f) return;
  if (AppState.currentState === 'background') return;
  try {
    const next = propsFor(timers);
    if (!next) {
      instance?.end('immediate').catch(() => {});
      instance = null;
      shownKey = '';
      return;
    }
    // A paused timer gets a new "now" on every call; compare without it so it is not re-sent needlessly.
    const key = JSON.stringify({ ...next.props, pausedAt: next.props.pausedAt ? 1 : 0, endsAt: next.props.pausedAt ? 0 : next.props.endsAt });
    if (key === shownKey) return;
    shownKey = key;
    const stale = next.props.pausedAt || next.props.done ? undefined : new Date(next.props.endsAt);
    if (instance) instance.update(next.props, stale).catch(() => {});
    else instance = f.start(next.props, `${scheme}://cook/${next.entryId}`, stale);
  } catch {
    // A Live Activity is a nice extra; it must never break the timer.
  }
}

/**
 * Only the open app can remove a Live Activity, so when it goes to the background (closing it from
 * the app switcher passes through here too) the activity is ended with a removal time: iOS keeps
 * the countdown running on the lock screen and removes it on its own 10 minutes after the timer
 * ends. Coming back starts a fresh one from the timers.
 */
function handOff() {
  if (!instance) return;
  const now = Date.now();
  const running = latest.filter((t) => t.status === 'running' && t.endsAt != null).map((t) => t.endsAt!);
  let removeAt: number | null = null;
  if (running.length) removeAt = Math.max(...running) + AFTER_END_MS;
  else if (latest.some((t) => t.status === 'paused')) removeAt = now + PAUSED_KEEP_MS;
  const old = instance;
  instance = null;
  shownKey = '';
  if (removeAt == null) {
    old.end('immediate').catch(() => {});
    return;
  }
  handedOff.push(old);
  old.end({ after: new Date(Math.min(removeAt, now + MAX_KEEP_MS)) }).catch(() => {});
}

function takeBack() {
  for (const old of handedOff) old.end('immediate').catch(() => {});
  handedOff = [];
  // Anything else still showing (a crash, an older run) has no timer behind it.
  if (!instance && factory) for (const old of factory.getInstances()) old.end('immediate').catch(() => {});
  syncLiveActivity(latest);
}

if (available) {
  // Clears leftovers from a previous run as soon as the app starts.
  getFactory();
  AppState.addEventListener('change', (state) => {
    try {
      if (state === 'background') handOff();
      else if (state === 'active') takeBack();
    } catch {
      // Never break the app over the lock screen extra.
    }
  });
}
