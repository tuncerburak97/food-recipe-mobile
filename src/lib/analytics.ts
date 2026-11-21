import { useFocusEffect, useSegments } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useDebounced } from '@/hooks/use-debounced';
import { mixpanelIdentify, mixpanelProfile, mixpanelReset, mixpanelTrack, type Properties } from '@/lib/mixpanel';
import type { AppUser, RecipeEntry } from '@/lib/types';

// Product analytics, in Mixpanel (mixpanel.ts does the sending). Three things make a person easy
// to follow there:
//  - every event carries `account_type` ("guest" or "member") and `premium`;
//  - the profile says who it is (name, e-mail, sign-in method) and keeps running totals:
//    `recipes_viewed`, `recipe_seconds`, `searches`;
//  - `recipe_viewed` / `recipe_closed` / `search_performed` give the same per day and per recipe.

/** The events the app sends. Keep names stable: Mixpanel charts and funnels refer to them. */
type AnalyticsEvent =
  | 'screen_view'
  | 'onboarding_completed'
  | 'recipe_viewed'
  | 'recipe_closed'
  | 'search_performed'
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

export function track(event: AnalyticsEvent, properties?: Properties) {
  mixpanelTrack(event, properties);
}

/**
 * Tells Mixpanel who is using the app, by the backend user id (so it can be matched with the
 * database). Guests have an id too: `account_type` tells them from people who signed in.
 */
export function identifyUser(user: AppUser) {
  const accountType = user.guest ? 'guest' : 'member';
  const premium = user.premium ?? false;
  mixpanelIdentify(
    user.id,
    { account_type: accountType, premium },
    {
      $name: user.name,
      $email: user.email,
      $created: user.createdAt,
      account_type: accountType,
      sign_in_providers: user.providers,
      premium,
      onboarded: user.onboarded,
      recipes_in_book: user.recipeCount,
    },
  );
}

export function resetAnalytics() {
  mixpanelReset();
}

/**
 * Sends `screen_view` on every route change once `enabled` (the session is known, so the first
 * one is not anonymous). Uses the route pattern ("recipe/[id]") rather than the concrete path, so
 * all recipe screens count as one screen.
 */
export function useScreenTracking(enabled: boolean) {
  const segments = useSegments();
  const name = segments.filter((s) => !s.startsWith('(')).join('/') || 'home';
  useEffect(() => {
    if (enabled) track('screen_view', { screen: name });
  }, [name, enabled]);
}

/** Where a recipe was opened: in the app's own lists, or from a link someone sent. */
type RecipeSurface = 'app' | 'shared_link';

function recipeProperties(entry: RecipeEntry, surface: RecipeSurface): Properties {
  return {
    recipe_id: entry.id,
    recipe_title: entry.recipe.title,
    category: entry.recipe.category,
    origin: entry.origin,
    creator: entry.source?.ownerUsername,
    surface,
  };
}

/**
 * For a screen that shows one recipe. `recipe_viewed` is sent once per visit, when the recipe is
 * on screen (a locked or failed one never counts). `recipe_closed` reports how long it was really
 * looked at, in `seconds`: one event per stretch the screen was in front, ended by leaving the
 * screen (also for the assistant or cooking mode on top of it) or the app. Ending a stretch when
 * the app is left means nothing is lost when it is closed from there; total time is the sum.
 */
export function useRecipeTracking(entry: RecipeEntry | undefined, surface: RecipeSurface = 'app') {
  const id = entry?.id;

  useEffect(() => {
    if (!entry) return;
    track('recipe_viewed', recipeProperties(entry, surface));
    mixpanelProfile({ add: { recipes_viewed: 1 }, set: { last_recipe_viewed: entry.recipe.title } });
    // Once per recipe on this screen: `entry` is a new object after every refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!entry) return;
      const properties = recipeProperties(entry, surface);
      let since: number | null = AppState.currentState === 'background' ? null : Date.now();
      const stop = () => {
        if (since === null) return;
        const seconds = Math.round((Date.now() - since) / 1000);
        since = null;
        if (seconds < 1) return;
        track('recipe_closed', { ...properties, seconds });
        mixpanelProfile({ add: { recipe_seconds: seconds } });
      };
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'background') stop();
        else if (state === 'active') since ??= Date.now();
      });
      return () => {
        subscription.remove();
        stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]),
  );
}

/** Which search field: every recipe, the user's own book, or the Instagram accounts. */
type SearchPlace = 'all_recipes' | 'my_recipes' | 'creators';

/**
 * Counts a search once the words have stood still for a second: typing "tavuk sote" is one
 * `search_performed`, not one per letter. Clearing the field lets the same words count again.
 * `filters` are sent along as they are at that moment.
 */
export function useSearchTracking(query: string, place: SearchPlace, filters?: Properties) {
  const words = useDebounced(query.trim().toLocaleLowerCase('tr'), 1000);
  const counted = useRef('');
  useEffect(() => {
    if (words.length < 2) {
      if (words === '') counted.current = '';
      return;
    }
    if (words === counted.current) return;
    counted.current = words;
    const text = words.slice(0, 80);
    track('search_performed', { query: text, place, ...filters });
    mixpanelProfile({ add: { searches: 1 }, set: { last_search: text } });
    // Only a new query is a new search; changing a filter under the same words is not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);
}
