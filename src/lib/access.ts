import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { ApiError, onLimitReached, request } from '@/lib/api';
import { useSession } from '@/store/session';

// Premium, limits and every paywall text live on the server (recipe-backend internal/billing).
// The app only draws what GET /api/v1/app/config and GET /api/v1/me/access say, so plans, limits
// and wording change without an app release.

/** What can be limited per day. Also the paywall placement of that limit. */
export type LimitKey = 'recipe_view' | 'import' | 'ai_recipe' | 'ai_chat' | 'voice_recipe' | 'adapt';
/** Why the paywall opened: a limit, or a place in the app. */
export type Placement = LimitKey | 'settings' | 'home' | 'onboarding';

export interface Plan {
  id: string;
  product_id: string;
  /** RevenueCat's package type in the offering: "ANNUAL", "MONTHLY". */
  package_type: string;
  title: string;
  /** What the price is for: "ay" / "yıl". */
  period: string;
  badge: string;
  /** Under the price; "{per_month}" becomes the monthly price of a yearly plan. */
  note: string;
  highlight: boolean;
}

export interface PaywallTexts {
  title: string;
  subtitle: string;
  benefits: { icon: string; title: string; text: string }[];
  cta: string;
  /** Used when the chosen plan starts with a free trial; "{days}". */
  cta_trial: string;
  /** "{days}", "{price}", "{period}". */
  trial_note: string;
  footnote: string;
  placements: Partial<Record<string, { title: string; subtitle: string }>>;
}

export interface BillingConfig {
  /** Off: everything is free and no paywall is shown. */
  enabled: boolean;
  entitlement: string;
  /** RevenueCat offering to sell; empty uses RevenueCat's current one. */
  offering: string;
  plans: Plan[];
  paywall: PaywallTexts;
  nudges: {
    usage_meter_below: number;
    sign_in_after_saves: number;
    paywall_after_onboarding: boolean;
    home_banner_after_days: number;
    home_banner_title: string;
    home_banner_text: string;
  };
  account: { title: string; subtitle: string; reasons: string[]; sharing_needs_sign_in: boolean };
  legal: { terms_url: string; privacy_url: string };
}

export interface AppConfig {
  billing: BillingConfig;
  /** RevenueCat's public SDK keys; empty means purchases are not set up yet. */
  purchases: { ios_api_key: string; android_api_key: string };
  auth: { apple: boolean; google: { web_client_id: string; ios_client_id: string } | null };
  share: { base_url: string };
}

export interface Usage {
  /** Per day; -1 is unlimited. */
  limit: number;
  used: number;
  /** Left today; -1 is unlimited. */
  remaining: number;
}

export interface Subscription {
  plan: string;
  /** app_store | play_store | admin ... */
  store: string;
  status: 'active' | 'grace' | 'expired' | 'revoked';
  /** normal | trial | intro */
  period_type: string;
  will_renew: boolean;
  expires_at: string | null;
  product_id: string;
}

export interface Access {
  tier: 'guest' | 'free' | 'premium';
  premium: boolean;
  /** False when limits do not apply (Premium switched off on the server): no meters, no paywall. */
  enforced: boolean;
  /** The user's id at RevenueCat. */
  billing_id: string;
  subscription: Subscription | null;
  usage: Partial<Record<LimitKey, Usage>>;
  resets_at: string;
  /** Guests: the daily limits after signing in. */
  sign_in_limits?: Partial<Record<LimitKey, number>>;
  synced?: boolean;
}

/** Sent with a LIMIT_REACHED error (ApiError.details). */
export interface LimitDetails {
  feature: LimitKey;
  limit: number;
  used: number;
  tier: Access['tier'];
  resets_at: string;
  /** Guests: the limit after signing in, when that is more. */
  sign_in_limit?: number;
}

export function limitDetails(err: unknown): LimitDetails | null {
  if (!(err instanceof ApiError) || err.code !== 'LIMIT_REACHED' || !err.details || typeof err.details !== 'object') return null;
  const d = err.details as Partial<LimitDetails>;
  return typeof d.feature === 'string' ? (d as LimitDetails) : null;
}

/**
 * What the app assumes before the server answered, or when it is a server from before Premium:
 * nothing is limited and nothing is sold.
 */
export const FALLBACK_CONFIG: AppConfig = {
  billing: {
    enabled: false,
    entitlement: 'premium',
    offering: '',
    plans: [],
    paywall: { title: 'Tarif Defteri Premium', subtitle: '', benefits: [], cta: 'Premium’a geç', cta_trial: '{days} gün ücretsiz dene', trial_note: '', footnote: '', placements: {} },
    nudges: { usage_meter_below: 0, sign_in_after_saves: 0, paywall_after_onboarding: false, home_banner_after_days: 0, home_banner_title: '', home_banner_text: '' },
    account: {
      title: 'Defterin seninle gelsin',
      subtitle: 'Giriş yap, tariflerin kaybolmasın ve her cihazında aynı defter açılsın.',
      reasons: [],
      sharing_needs_sign_in: false,
    },
    legal: { terms_url: '', privacy_url: '' },
  },
  purchases: { ios_api_key: '', android_api_key: '' },
  auth: { apple: false, google: null },
  share: { base_url: '' },
};

export const accessApi = {
  async config(): Promise<AppConfig> {
    const c = await request<AppConfig>('/api/v1/app/config', { method: 'GET' }, 15_000);
    // Lists and maps the server may leave out are filled, so screens never check for them.
    const b = c.billing ?? FALLBACK_CONFIG.billing;
    return {
      ...FALLBACK_CONFIG,
      ...c,
      billing: {
        ...FALLBACK_CONFIG.billing,
        ...b,
        plans: b.plans ?? [],
        paywall: { ...FALLBACK_CONFIG.billing.paywall, ...b.paywall, benefits: b.paywall?.benefits ?? [], placements: b.paywall?.placements ?? {} },
        nudges: { ...FALLBACK_CONFIG.billing.nudges, ...b.nudges },
        account: { ...FALLBACK_CONFIG.billing.account, ...b.account, reasons: b.account?.reasons ?? [] },
        legal: { ...FALLBACK_CONFIG.billing.legal, ...b.legal },
      },
    };
  },
  access() {
    return request<Access>('/api/v1/me/access', { method: 'GET' }, 15_000);
  },
  /** Asks the server to read the user's purchases from RevenueCat now (after a purchase or restore). */
  sync() {
    return request<Access>('/api/v1/me/subscription/sync', { method: 'POST' }, 20_000);
  },
};

/** The server's settings for Premium and accounts. Falls back to "nothing sold" until it is known. */
export function useAppConfig(): AppConfig {
  const query = useQuery({
    queryKey: ['app-config'],
    queryFn: accessApi.config,
    staleTime: 5 * 60_000,
    // A server from before Premium answers 404: keep the fallback and do not ask again and again.
    retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
  });
  return query.data ?? FALLBACK_CONFIG;
}

/** The user's tier, subscription and what is left of today's allowances. */
export function useAccess() {
  const { status } = useSession();
  return useQuery({
    queryKey: ['access'],
    queryFn: accessApi.access,
    enabled: status === 'ready',
    staleTime: 15_000,
    retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
  });
}

/** Everything a screen needs to decide what to show about Premium. */
export function usePremium() {
  const config = useAppConfig();
  const access = useAccess().data;
  const on = config.billing.enabled && !!access?.enforced;
  return {
    config,
    access,
    /** Limits and the paywall are on for this user. */
    on,
    premium: !!access?.premium,
    /** Left today of a limited thing; null when it is unlimited or not known yet. */
    remaining(key: LimitKey): number | null {
      if (!on) return null;
      const u = access?.usage[key];
      return u && u.limit >= 0 ? u.remaining : null;
    },
  };
}

/** Re-reads the allowances after something that uses one (opening a recipe, an import...). */
export function useRefreshAccess() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ['access'] });
}

let lastPaywallAt = 0;

/**
 * Opens the paywall. placement decides its headline: the limit that was reached, or where in the
 * app it was opened from. Several requests failing at once open it once.
 */
export function openPaywall(placement: Placement, details?: LimitDetails | null) {
  const now = Date.now();
  if (now - lastPaywallAt < 1200) return;
  lastPaywallAt = now;
  router.push({
    pathname: '/paywall',
    params: {
      placement,
      ...(details?.sign_in_limit != null ? { signInLimit: String(details.sign_in_limit), limit: String(details.limit) } : {}),
    },
  });
}

/** Opens the sign-in sheet; reason picks its headline ("share", "limit", "save"). */
export function openSignIn(reason?: 'share' | 'limit' | 'save' | 'purchase') {
  router.push({ pathname: '/sign-in', params: reason ? { reason } : {} });
}

/**
 * For screens that take effort before they ask the server (recording a recipe, the chef's
 * questions): when today's allowance for `key` is already used up, the paywall opens as the screen
 * does, instead of after the work. Returns whether the allowance is used up.
 */
export function useLimitGate(key: LimitKey): boolean {
  const { on, premium, access } = usePremium();
  const usage = access?.usage[key];
  const out = on && !premium && usage != null && usage.limit >= 0 && usage.remaining <= 0;
  const limit = usage?.limit ?? 0;
  const used = usage?.used ?? 0;
  const tier = access?.tier ?? 'guest';
  const resetsAt = access?.resets_at ?? '';
  const signInLimit = access?.sign_in_limits?.[key];
  useEffect(() => {
    if (out) openPaywall(key, { feature: key, limit, used, tier, resets_at: resetsAt, sign_in_limit: signInLimit });
  }, [out, key, limit, used, tier, resetsAt, signInLimit]);
  return out;
}

// An action that hit a daily limit (an import, a question, a new AI recipe) opens the paywall for it.
onLimitReached((err) => {
  const details = limitDetails(err);
  openPaywall(details?.feature ?? 'settings', details);
});
