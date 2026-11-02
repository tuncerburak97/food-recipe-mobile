import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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
  const f = getFactory();
  if (!f) return;
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
    if (instance) instance.update(next.props).catch(() => {});
    else instance = f.start(next.props, `${scheme}://cook/${next.entryId}`);
  } catch {
    // A Live Activity is a nice extra; it must never break the timer.
  }
}
