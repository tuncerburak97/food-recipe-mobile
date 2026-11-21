import * as Application from 'expo-application';
import { Directory, File, Paths } from 'expo-file-system';
import { Mixpanel } from 'mixpanel-react-native';
import { AppState, Platform } from 'react-native';

// The plumbing under analytics.ts: starts the Mixpanel SDK and keeps what the app tells it in order.
// The project token ("Tarif Defteri" in Mixpanel) is public by design: it can only send events.
const MIXPANEL_TOKEN = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ?? 'a51ecb6643ba97e2ccf54b95f22c0f05';

// The project lives in Mixpanel's EU data centre (Project Settings > Data Residency). This must
// match it: the other hosts answer "ok" to the project's events and then drop them.
const MIXPANEL_SERVER_URL = 'https://api-eu.mixpanel.com';

// The web build is for development only and sends nothing.
const enabled = MIXPANEL_TOKEN !== '' && Platform.OS !== 'web';

type Value = string | number | boolean | string[];
export type Properties = Record<string, Value | null | undefined>;

/** Sent with every event. `env` lets Mixpanel filter out development builds. */
const baseProperties = {
  env: __DEV__ ? 'dev' : 'prod',
  $app_version_string: Application.nativeApplicationVersion,
  $app_build_number: Application.nativeBuildVersion,
};

/** Mixpanel shows a missing property as "(not set)"; null, undefined and an empty list mean the same, so leave them out. */
function withoutEmpty(properties: Properties) {
  const out: Record<string, Value> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value === null || value === undefined || (Array.isArray(value) && value.length === 0)) continue;
    out[key] = value;
  }
  return out;
}

/**
 * Where the SDK keeps its identity and its unsent events: one small file per key. By default it
 * asks for AsyncStorage, a native module this app does not ship; expo-file-system is in every build.
 */
function fileStorage() {
  const dir = new Directory(Paths.document, 'mixpanel');
  dir.create({ intermediates: true, idempotent: true });
  const file = (key: string) => new File(dir, key.replace(/[^\w.-]/g, '_'));

  // One operation at a time: the SDK rewrites its queue on every event, and overlapping writes
  // to one file could land out of order.
  let last: Promise<unknown> = Promise.resolve();
  function inOrder<T>(operation: () => T | Promise<T>): Promise<T> {
    const next = last.then(operation);
    last = next.catch(() => {});
    return next;
  }

  return {
    getItem: (key: string) =>
      inOrder(async () => {
        const f = file(key);
        return f.exists ? await f.text() : null;
      }),
    setItem: (key: string, value: string) => inOrder(() => file(key).write(value)),
    removeItem: (key: string) =>
      inOrder(() => {
        const f = file(key);
        if (f.exists) f.delete();
      }),
  };
}

async function start(): Promise<Mixpanel | null> {
  if (!enabled) return null;
  try {
    // JavaScript mode (the third argument): needs nothing native, so it also runs in builds made
    // before the SDK was added.
    const mixpanel = new Mixpanel(MIXPANEL_TOKEN, false, false, fileStorage());
    await mixpanel.init(false, {}, MIXPANEL_SERVER_URL);
    return mixpanel;
  } catch {
    return null;
  }
}

// Each call waits for the one before it, so events, identify and reset reach the SDK in the order
// the app made them, and nothing is lost while the SDK is still starting.
let queue = start();

function run(step: (mixpanel: Mixpanel) => void | Promise<void>) {
  queue = queue.then(async (mixpanel) => {
    try {
      if (mixpanel) await step(mixpanel);
    } catch {
      // Analytics must never break the app.
    }
    return mixpanel;
  });
}

export function mixpanelTrack(event: string, properties?: Properties) {
  run((mixpanel) => mixpanel.track(event, withoutEmpty({ ...baseProperties, ...properties })));
}

// ---- profiles ----
//
// Profile updates go straight to Mixpanel's /engage endpoint, addressed to the user id, in the
// shape the SDK itself sends. The SDK's own `getPeople()` queues them and, on the next identify,
// re-addresses whatever is still unsent to the new identity: after a sign-out that would put one
// account's name and counts on the next profile.

interface ProfileUpdate {
  /** Properties to overwrite. */
  set: Record<string, Value>;
  /** Counters to add to. */
  add: Record<string, number>;
}

/** Updates not sent yet, per user id; '' holds what happened before the user was known. */
const waiting = new Map<string, ProfileUpdate>();
const UNKNOWN = '';
let currentUser = UNKNOWN;
let profileTimer: ReturnType<typeof setTimeout> | null = null;
/** The profile last handed over for the current user, to skip sending it again unchanged. */
let lastProfile = '';

/** Merges `update` into what waits for `userId`; with `older` what is already waiting wins. */
function hold(userId: string, update: ProfileUpdate, older = false) {
  const held = waiting.get(userId) ?? { set: {}, add: {} };
  held.set = older ? { ...update.set, ...held.set } : { ...held.set, ...update.set };
  for (const [key, amount] of Object.entries(update.add)) held.add[key] = (held.add[key] ?? 0) + amount;
  waiting.set(userId, held);
}

function sendProfilesIn(ms: number) {
  if (!enabled || profileTimer) return;
  profileTimer = setTimeout(() => void sendProfiles(), ms);
}

async function sendProfiles() {
  if (profileTimer) clearTimeout(profileTimer);
  profileTimer = null;
  const batch = [...waiting].filter(([userId]) => userId !== UNKNOWN);
  const records = batch.flatMap(([userId, update]) => {
    const to = { $token: MIXPANEL_TOKEN, $distinct_id: userId };
    return [
      ...(Object.keys(update.set).length > 0 ? [{ ...to, $set: update.set }] : []),
      ...(Object.keys(update.add).length > 0 ? [{ ...to, $add: update.add }] : []),
    ];
  });
  if (records.length === 0) return;
  for (const [userId] of batch) waiting.delete(userId);
  try {
    const response = await fetch(`${MIXPANEL_SERVER_URL}/engage/?ip=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(JSON.stringify(records))}`,
    });
    if (!response.ok) throw new Error(`Mixpanel answered ${response.status}`);
  } catch {
    // Offline, most likely: keep them and try again later (until the app is closed).
    for (const [userId, update] of batch) hold(userId, update, true);
    sendProfilesIn(30_000);
  }
}

/** Changes the current user's Mixpanel profile; sent together with other changes a few seconds later. */
export function mixpanelProfile(update: { set?: Properties; add?: Record<string, number> }) {
  if (!enabled) return;
  hold(currentUser, { set: withoutEmpty(update.set ?? {}), add: update.add ?? {} });
  sendProfilesIn(5_000);
}

/**
 * Ties Mixpanel to the backend user id; what the device did before it was known is merged into it.
 * `everyEvent` rides on each event from here on (and on the first events of the next launch, before
 * the account has loaded); `profile` is what the user's page in Mixpanel shows.
 */
export function mixpanelIdentify(userId: string, everyEvent: Properties, profile: Properties) {
  if (!enabled) return;
  if (currentUser !== userId) {
    // What was counted before the account loaded belongs to this user.
    const early = waiting.get(UNKNOWN);
    waiting.delete(UNKNOWN);
    currentUser = userId;
    lastProfile = '';
    if (early) hold(userId, early, true);
  }
  const fresh = JSON.stringify(profile);
  if (fresh !== lastProfile) {
    lastProfile = fresh;
    mixpanelProfile({ set: profile });
  }
  run(async (mixpanel) => {
    await mixpanel.identify(userId);
    mixpanel.registerSuperProperties(withoutEmpty(everyEvent));
  });
}

/** Starts a fresh anonymous identity, so the next person on this device is not merged with the last. */
export function mixpanelReset() {
  if (!enabled) return;
  void sendProfiles();
  waiting.delete(UNKNOWN);
  currentUser = UNKNOWN;
  lastProfile = '';
  run(async (mixpanel) => {
    // reset() starts wiping the stored identity and returns nothing. Wait on the implementation
    // behind it instead, so the identify that follows cannot be undone by a wipe still under way.
    const impl = (mixpanel as unknown as { mixpanelImpl?: { reset?: (token: string) => Promise<void> } }).mixpanelImpl;
    if (impl?.reset) await impl.reset(MIXPANEL_TOKEN);
    else mixpanel.reset();
  });
}

// The SDK sends its queue every ten seconds while the app is open. Send what is waiting when the
// app is left too, a moment later so the events screens send as they are left are in it; anything
// that does not make it stays on disk and goes out on the next launch.
AppState.addEventListener('change', (state) => {
  if (state !== 'background') return;
  void sendProfiles();
  setTimeout(() => run((mixpanel) => mixpanel.flush()), 300);
});
