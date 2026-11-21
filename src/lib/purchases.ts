import { NativeModules, Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';

import type { AppConfig, Plan } from '@/lib/access';

// Purchases go through RevenueCat (App Store / Google Play underneath). Its native module exists
// only in builds made after it was added, so everything here answers "not available" instead of
// throwing on older builds and on web. The SDK key and the user's id come from the server.

/** True when this build can sell: the RevenueCat module is in it. */
export const purchasesInBuild = Platform.OS !== 'web' && NativeModules.RNPurchases != null;

type Sdk = typeof import('react-native-purchases');
function sdk(): Sdk {
  // Loaded lazily, and only after purchasesInBuild was checked.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-purchases') as Sdk;
}

/** The public SDK key of this platform, as the server gave it. */
export function sdkKey(config: AppConfig): string {
  return (Platform.OS === 'ios' ? config.purchases.ios_api_key : config.purchases.android_api_key) || '';
}

/** Why purchases cannot be made right now, or null when they can. */
export function purchasesBlocked(config: AppConfig): 'build' | 'setup' | null {
  if (!purchasesInBuild) return 'build';
  if (!sdkKey(config)) return 'setup';
  return null;
}

let configuredKey: string | null = null;
let currentUser: string | null = null;
let pending: Promise<boolean> = Promise.resolve(false);

/**
 * Makes RevenueCat ready for this user (the server's billing id). The first call configures the
 * SDK; a later call with another user (after signing in to an existing account) logs in as them.
 * Returns false when purchases are not available.
 */
export function ensurePurchases(config: AppConfig, billingId: string): Promise<boolean> {
  const key = sdkKey(config);
  if (!purchasesInBuild || !key || !billingId) return Promise.resolve(false);
  // One at a time: configure must finish before a logIn.
  pending = pending
    .catch(() => false)
    .then(async () => {
      const { default: Purchases } = sdk();
      if (configuredKey !== key) {
        Purchases.configure({ apiKey: key, appUserID: billingId });
        configuredKey = key;
        currentUser = billingId;
        return true;
      }
      if (currentUser !== billingId) {
        await Purchases.logIn(billingId);
        currentUser = billingId;
      }
      return true;
    })
    .catch(() => false);
  return pending;
}

/**
 * After signing in to an existing account: a subscription bought on this phone as a guest belongs
 * to the same Apple ID, so it is attached to the account. Not done on sign out, where it would
 * pull the subscription off the account.
 */
export async function claimPurchases(): Promise<void> {
  if (!purchasesInBuild || !configuredKey) return;
  try {
    await pending;
    await sdk().default.syncPurchases();
  } catch {
    // The store is asked again on the next restore.
  }
}

/** A plan with what the store says about it. */
export interface StorePlan {
  plan: Plan;
  pkg: PurchasesPackage;
  /** Localized price, e.g. "₺49,99". */
  price: string;
  /** Price of one month of this plan (a yearly plan divided by 12), formatted like `price`. */
  perMonth: string | null;
  /** Days of free trial the store offers this user; 0 when there is none or it was used. */
  trialDays: number;
}

const UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** "₺399,99" + 33.33 -> "₺33,33": the amount in the price's own formatting. */
function formatLike(priceString: string, amount: number): string {
  const match = priceString.match(/[\d.,\s]*\d/);
  if (!match) return amount.toFixed(2);
  const comma = match[0].lastIndexOf(',') > match[0].lastIndexOf('.');
  const text = amount.toFixed(2).replace('.', comma ? ',' : '.');
  return priceString.replace(match[0], text);
}

/**
 * The plans the paywall sells: the server's plans matched with the store's packages of the
 * offering (by package type, then by product id). Plans the store does not have are left out.
 */
export async function loadStorePlans(config: AppConfig): Promise<StorePlan[]> {
  const { default: Purchases, INTRO_ELIGIBILITY_STATUS } = sdk();
  const offerings = await Purchases.getOfferings();
  const offering = (config.billing.offering && offerings.all[config.billing.offering]) || offerings.current;
  const packages = offering?.availablePackages ?? [];
  const matched = config.billing.plans
    .map((plan) => {
      const pkg =
        packages.find((p) => p.product.identifier === plan.product_id) ??
        packages.find((p) => plan.package_type && String(p.packageType) === plan.package_type);
      return pkg ? { plan, pkg } : null;
    })
    .filter((m): m is { plan: Plan; pkg: PurchasesPackage } => m != null);

  // Whether this Apple ID may still take the free trial (it can be used once).
  let eligible: Record<string, number> = {};
  if (Platform.OS === 'ios' && matched.length) {
    try {
      const res = await Purchases.checkTrialOrIntroductoryPriceEligibility(matched.map((m) => m.pkg.product.identifier));
      eligible = Object.fromEntries(Object.entries(res).map(([id, v]) => [id, v.status]));
    } catch {
      // Unknown: the store decides at purchase time.
    }
  }

  return matched.map(({ plan, pkg }) => {
    const product = pkg.product;
    const intro = product.introPrice;
    const status = eligible[product.identifier];
    const mayTry = status == null || status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE || status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_UNKNOWN;
    const trialDays = intro && intro.price === 0 && mayTry ? Math.round((UNIT_DAYS[intro.periodUnit] ?? 0) * intro.periodNumberOfUnits) : 0;
    const yearly = String(pkg.packageType) === 'ANNUAL' || plan.id === 'yearly';
    return {
      plan,
      pkg,
      price: product.priceString,
      perMonth: yearly && product.price > 0 ? formatLike(product.priceString, product.price / 12) : null,
      trialDays,
    };
  });
}

function hasPremium(info: CustomerInfo, entitlement: string): boolean {
  return info.entitlements.active[entitlement] != null;
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending';

/**
 * Buys a plan. 'pending' means the store took the order but has not granted it yet (Ask to Buy, a
 * slow bank): Premium arrives later by itself. Throws with a message for the user on failure.
 */
export async function buy(plan: StorePlan, config: AppConfig): Promise<PurchaseOutcome> {
  const { default: Purchases, PURCHASES_ERROR_CODE } = sdk();
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    return hasPremium(customerInfo, config.billing.entitlement) ? 'purchased' : 'pending';
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string; message?: string };
    if (err.userCancelled) return 'cancelled';
    if (err.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    if (err.code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
      // Already subscribed with this Apple ID: bring it over instead of failing.
      const info = await Purchases.restorePurchases();
      if (hasPremium(info, config.billing.entitlement)) return 'purchased';
    }
    throw new Error(purchaseMessage(err.code, PURCHASES_ERROR_CODE));
  }
}

function purchaseMessage(code: string | undefined, codes: Sdk['PURCHASES_ERROR_CODE']): string {
  switch (code) {
    case codes.NETWORK_ERROR:
    case codes.OFFLINE_CONNECTION_ERROR:
      return 'İnternet bağlantını kontrol edip tekrar dener misin?';
    case codes.PURCHASE_NOT_ALLOWED_ERROR:
      return 'Bu cihazda satın alma kapalı. Ekran Süresi ya da ebeveyn denetimi ayarlarına bakabilirsin.';
    case codes.STORE_PROBLEM_ERROR:
      return 'Mağaza şu an yanıt vermiyor. Birazdan tekrar dener misin?';
    case codes.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      return 'Bu plan şu an satın alınamıyor. Birazdan tekrar dener misin?';
    default:
      return 'Satın alma tamamlanamadı. Senden ücret alınmadı; tekrar deneyebilirsin.';
  }
}

/** Brings back a subscription bought before (another phone, a reinstall). True when Premium is active. */
export async function restore(config: AppConfig): Promise<boolean> {
  const { default: Purchases } = sdk();
  const info = await Purchases.restorePurchases();
  return hasPremium(info, config.billing.entitlement);
}

/** Where the user manages or cancels the subscription. */
export function manageSubscriptionUrl(): string {
  return Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions';
}
