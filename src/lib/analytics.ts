import { useSegments } from 'expo-router';
import PostHog from 'posthog-react-native';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Product analytics (PostHog, EU cloud). The project key is public by design: it can only send events.
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? 'phc_riTbbfNh25hEzxCqUsUrsp8meG9Ls28t4CPwe2N87z5P';

// The web build is for development only and has none of the storage PostHog looks for (it would
// throw on start): there it keeps its state in memory and sends nothing.
const memory = new Map<string, string>();
const webOnly =
  Platform.OS === 'web'
    ? { disabled: true, customStorage: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => void memory.set(key, value) } }
    : {};

export const posthog = new PostHog(POSTHOG_KEY, {
  host: 'https://eu.i.posthog.com',
  // Session replay needs the native plugin, so it starts working from the next build; older builds skip it.
  enableSessionReplay: Platform.OS !== 'web',
  sessionReplayConfig: {
    maskAllTextInputs: true,
    maskAllImages: false,
  },
  ...webOnly,
});

// Lets PostHog filter out events from development builds.
posthog.register({ env: __DEV__ ? 'dev' : 'prod' });

/** The events the app sends. Keep names stable: PostHog charts and funnels refer to them. */
type AnalyticsEvent =
  | 'onboarding_completed'
  | 'recipe_saved'
  | 'recipe_import_started'
  | 'chef_recipe_requested'
  | 'assistant_message_sent'
  | 'cooking_started'
  | 'cooking_finished'
  | 'signed_in'
  | 'signed_out'
  | 'account_deleted'
  | 'limit_reached'
  | 'paywall_viewed'
  | 'purchase_started'
  | 'purchase_completed'
  | 'purchase_cancelled'
  | 'purchase_failed'
  | 'purchases_restored'
  | 'recipe_shared'
  | 'shared_recipe_saved';

export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean | null>) {
  try {
    posthog.capture(event, properties ?? undefined);
  } catch {
    // Analytics must never break the app.
  }
}

/** Ties PostHog's person to the backend user id, so it can be matched with the database. */
export function identifyUser(userId: string, properties?: { name?: string; onboarded?: boolean }) {
  try {
    posthog.identify(userId, properties);
  } catch {}
}

export function resetAnalytics() {
  try {
    posthog.reset();
  } catch {}
}

/**
 * Sends a screen view on every route change. Uses the route pattern ("recipe/[id]") rather than the
 * concrete path, so all recipe screens count as one screen in PostHog.
 */
export function useScreenTracking() {
  const segments = useSegments();
  const name = segments.filter((s) => !s.startsWith('(')).join('/') || 'home';
  useEffect(() => {
    try {
      posthog.screen(name);
    } catch {}
  }, [name]);
}
