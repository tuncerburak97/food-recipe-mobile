import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { ApiError, onLimitReached, request } from '@/lib/api';
import { useSession } from '@/store/session';

// Premium, limits and every paywall text live on the server (recipe-backend internal/billing).
// The app only draws what GET /api/v1/app/config and GET /api/v1/me/access say, so plans, limits
// and wording change without an app release.

/** What can be limited, per day and in total. Also the paywall placement of that limit. */
export type LimitKey = 'recipe_view' | 'import' | 'ai_recipe' | 'ai_chat' | 'voice_recipe' | 'adapt';
/** The allowance a limit counts in: a day's (starts again at midnight) or the total one (never does). */
export type LimitPeriod = 'day' | 'total';
/** Why the paywall opened: a limit ("<key>_total" when the total ran out), or a place in the app. */
export type Placement = LimitKey | `${LimitKey}_total` | 'settings' | 'home' | 'onboarding';

/** The paywall's header for one reason it opened; icon and eyebrow say what the user was doing. */
export interface PlacementText {
  icon?: string;
  eyebrow?: string;
  title: string;
  subtitle: string;
}

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
  /** The reassurance under the buy button. */
  trust: string;
  /** On the plan that costs less per month; "{percent}" comes from the store's prices. */
  savings_badge: string;
  /** The trial as a timeline; "{days}", "{price}", "{period}". */
  trial_steps: { title: string; text: string }[];
  /** The same in one sentence; "{days}", "{price}", "{period}". */
  trial_note: string;
  /** The way out of a paywall that cannot be closed, and of one that can. */
  free_cta: string;
  later_cta: string;
  /** Placements whose paywall has no close button: the only way out is `free_cta`. */
  hard: string[];
  footnote: string;
  placements: Partial<Record<string, PlacementText>>;
}

/** One page of the welcome: an illustration, a short text and, when given, numbered steps. */
export interface WelcomePage {
  /** The app's own illustration: "video", "chef", "pantry", "cook" or "book"; anything else shows none. */
  art: string;
  kicker: string;
  title: string;
  text: string;
  steps?: string[];
}

/**
 * The short welcome shown once, after the paywall that ends onboarding is left (by paying or by
 * going on for free), and under Profil → "Uygulamayı tanı": what to do first, in a few pages.
 */
export interface WelcomeTexts {
  enabled: boolean;
  pages: WelcomePage[];
  /** The button on the last page, on the others, and the way out at the top. */
  cta: string;
  next: string;
  skip: string;
}

/** The "try it with a sample video" step of onboarding. */
export interface DemoTexts {
  enabled: boolean;
  title: string;
  subtitle: string;
  cta: string;
  skip: string;
  /** Under the finished recipe: on to the rest of onboarding. */
  done_cta: string;
  /** Video links or shortcodes whose recipes the server already has; empty lets the app pick. */
  samples: string[];
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
  onboarding: { demo: DemoTexts; welcome: WelcomeTexts };
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
  /** Today. */
  used: number;
  /** What can still be used right now (the smaller of today's rest and the total's); -1 is unlimited. */
  remaining: number;
  /** Over the life of the account; -1 is unlimited. Absent on a server from before totals. */
  total_limit?: number;
  total_used?: number;
  /** The allowance that ends first: what the app talks about. */
  period?: LimitPeriod;
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
  /** The allowance that ran out; `limit` and `used` are of it. Absent means a day's. */
  period?: LimitPeriod;
  limit: number;
  used: number;
  tier: Access['tier'];
  /** When a day's allowance starts again; absent for a total. */
  resets_at?: string;
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
    paywall: {
      title: 'Tarif Defteri Premium',
      subtitle: '',
      benefits: [],
      cta: 'Premium’a geç',
      cta_trial: '{days} gün ücretsiz dene',
      trust: '',
      savings_badge: '',
      trial_steps: [],
      trial_note: '',
      free_cta: 'Ücretsiz devam et',
      later_cta: 'Şimdilik kalsın',
      hard: [],
      footnote: '',
      placements: {},
    },
    nudges: { usage_meter_below: 0, sign_in_after_saves: 0, paywall_after_onboarding: false, home_banner_after_days: 0, home_banner_title: '', home_banner_text: '' },
    onboarding: {
      demo: {
        enabled: true,
        title: 'Şimdi sihri kendin gör',
        subtitle: 'Instagram’dan ya da YouTube’dan bir yemek videosu seç. Malzemeleri ve adımlarıyla tarife dönüşmesini izle.',
        cta: 'Bu videoyu tarife çevir',
        skip: 'Şimdilik geç',
        done_cta: 'Harika, mutfağımı hazırla',
        samples: [],
      },
      welcome: {
        enabled: true,
        pages: [
          {
            art: 'video',
            kicker: 'Instagram’dan tarife',
            title: 'Beğendiğin videoyu tarife çevir',
            text: '',
            steps: [
              'Instagram’da videonun paylaş simgesine dokun, “Bağlantıyı kopyala”yı seç.',
              'Tarif Defteri’ne dön ve ana sayfadaki “Yapıştır”a dokun.',
              'Malzemeler ve adımlar hazır. Adım adım pişir.',
            ],
          },
          {
            art: 'chef',
            kicker: 'Sevdiğin şefler',
            title: 'En sevdiğin şeflere ulaş',
            text: 'Yapay Zeka Şefi’ne şefin adını yaz; tariflerini önüne getirsin, beğendiğini defterine ekle.',
          },
          {
            art: 'pantry',
            kicker: 'Malzemeden tarife',
            title: 'Malzemeyi söyle, tarifini yapalım',
            text: 'Evde ne varsa yaz ya da sesle söyle. Yapay Zeka Şefi sana uygun bir tarif yazsın.',
          },
        ],
        cta: 'Başlayalım',
        next: 'Devam',
        skip: 'Atla',
      },
    },
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
        paywall: {
          ...FALLBACK_CONFIG.billing.paywall,
          ...b.paywall,
          benefits: b.paywall?.benefits ?? [],
          trial_steps: b.paywall?.trial_steps ?? [],
          hard: b.paywall?.hard ?? [],
          placements: b.paywall?.placements ?? {},
        },
        nudges: { ...FALLBACK_CONFIG.billing.nudges, ...b.nudges },
        onboarding: {
          demo: { ...FALLBACK_CONFIG.billing.onboarding.demo, ...b.onboarding?.demo, samples: b.onboarding?.demo?.samples ?? [] },
          // A server from before the welcome, or one that sent no pages: the app's own.
          welcome: {
            ...FALLBACK_CONFIG.billing.onboarding.welcome,
            ...b.onboarding?.welcome,
            pages: b.onboarding?.welcome?.pages?.length ? b.onboarding.welcome.pages : FALLBACK_CONFIG.billing.onboarding.welcome.pages,
          },
        },
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
    /** What is left right now of a limited thing; null when it is unlimited or not known yet. */
    remaining(key: LimitKey): number | null {
      if (!on) return null;
      const u = access?.usage[key];
      return u && isLimited(u) ? u.remaining : null;
    },
  };
}

/** Whether a limit stops anyone: per day, in total, or both. */
export function isLimited(u: Usage): boolean {
  return u.limit >= 0 || (u.total_limit ?? -1) >= 0;
}

/** The paywall placement of a used-up limit: its own, or "<key>_total" when the total ran out. */
export function limitPlacement(key: LimitKey, period?: LimitPeriod): Placement {
  return period === 'total' ? `${key}_total` : key;
}

/**
 * The paywall's header for a placement. A total without wording of its own uses its key's, and a
 * placement the server does not know uses the paywall's general title.
 */
export function placementText(texts: PaywallTexts, placement: string): PlacementText {
  return texts.placements[placement] ?? texts.placements[placement.replace(/_total$/, '')] ?? { title: texts.title, subtitle: texts.subtitle };
}

/** Re-reads the allowances after something that uses one (opening a recipe, an import...). */
export function useRefreshAccess() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: ['access'] });
}

// What follows onboarding (its paywall, then the welcome) opens by itself. Home also opens the
// welcome for somebody who has not seen it yet; this keeps it from doing so on top of that.
let welcomeQueued = false;
export function queueWelcome() {
  welcomeQueued = true;
}
export function welcomeIsQueued() {
  return welcomeQueued;
}

let lastPaywallAt = 0;

/**
 * Opens the paywall. placement decides its header: the limit that was reached (pass its details,
 * so a used-up total is told from a used-up day), or where in the app it was opened from. Several
 * requests failing at once open it once.
 */
export function openPaywall(placement: Placement, details?: LimitDetails | null) {
  const now = Date.now();
  if (now - lastPaywallAt < 1200) return;
  lastPaywallAt = now;
  router.push({
    pathname: '/paywall',
    params: {
      placement: details ? limitPlacement(details.feature, details.period) : placement,
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
  const out = on && !premium && usage != null && isLimited(usage) && usage.remaining <= 0;
  const period: LimitPeriod = usage?.period ?? 'day';
  const limit = (period === 'total' ? usage?.total_limit : usage?.limit) ?? 0;
  const used = (period === 'total' ? usage?.total_used : usage?.used) ?? 0;
  const tier = access?.tier ?? 'guest';
  const resetsAt = period === 'day' ? access?.resets_at : undefined;
  // Signing in is only worth offering for a day's allowance: that is what `sign_in_limits` holds.
  const signInLimit = period === 'day' ? access?.sign_in_limits?.[key] : undefined;
  useEffect(() => {
    if (out) openPaywall(key, { feature: key, period, limit, used, tier, resets_at: resetsAt, sign_in_limit: signInLimit });
  }, [out, key, period, limit, used, tier, resetsAt, signInLimit]);
  return out;
}

// An action that hit a limit (an import, a question, a new AI recipe) opens the paywall for it at once.
onLimitReached((err) => {
  const details = limitDetails(err);
  openPaywall(details?.feature ?? 'settings', details);
});
