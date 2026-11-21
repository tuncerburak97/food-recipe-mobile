import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { CookProfile } from '@/lib/profile';

import type {
  ApiEntry,
  ApiErrorBody,
  ApiPage,
  ApiUser,
  AppUser,
  AssistantAnswer,
  CategoryCount,
  ChatTurn,
  ChefRequest,
  Creator,
  Recipe,
  Category,
  FetchRecipeResponse,
  GenerationJob,
  RecipeEntry,
  RecipePage,
  Reel,
} from '@/lib/types';

/** The live backend (nginx on the server, in front of the API on port 8055). */
const PRODUCTION_API_URL = 'https://recipe.civar.io';

/**
 * Backend URL. Set EXPO_PUBLIC_API_URL to override. Release builds use https://recipe.civar.io; in
 * development it defaults to port 8055 on the machine running Metro, so the simulator and a phone on
 * the same Wi-Fi both reach the local backend.
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (!__DEV__) return PRODUCTION_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:8055`;
}

export const API_BASE_URL = resolveBaseUrl();
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

const APP_VERSION = Constants.expoConfig?.version ?? '';

/** Bearer token of the signed-in user, set by the session provider. */
let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

/** This install's UUID (sent as X-Device-Id), set by the session provider. */
let deviceId: string | null = null;
export function setDeviceId(id: string | null) {
  deviceId = id;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
    /** Extra data the server sent with the error (see ApiErrorBody.details). */
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(body: ApiErrorBody, status = 0) {
    return new ApiError(body.code, body.message, status, body.details);
  }
}

/** True when the server refused because today's free allowance is used up. */
export function isLimitError(err: unknown): err is ApiError {
  return err instanceof ApiError && err.code === 'LIMIT_REACHED';
}

let limitListener: ((err: ApiError) => void) | null = null;
/** Registers what happens when an action hits a daily limit (the paywall opens; see lib/access). */
export function onLimitReached(listener: ((err: ApiError) => void) | null) {
  limitListener = listener;
}
/** Tells the listener about a limit error; callers that showed their own message skip it. */
export function notifyLimit(err: unknown) {
  if (isLimitError(err)) limitListener?.(err);
}

/**
 * Headers every backend call sends (API key, signed-in user, device). Also for images and audio
 * the app loads from the backend that need the user, e.g. `source={{ uri, headers: authHeaders() }}`.
 */
export function authHeaders(): Record<string, string> {
  return {
    ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
    ...(APP_VERSION ? { 'X-App-Version': APP_VERSION } : {}),
  };
}

/**
 * Calls the backend and unwraps its `{ success, data, error }` envelope. A `FormData` body is sent
 * as multipart (for audio and photo uploads); anything else is JSON.
 */
export async function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const multipart = typeof FormData !== 'undefined' && init.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(API_BASE_URL + path, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        // fetch sets the multipart boundary itself.
        ...(multipart ? {} : { 'Content-Type': 'application/json' }),
        ...authHeaders(),
      },
    });
  } catch {
    throw controller.signal.aborted
      ? new ApiError('TIMEOUT', 'İstek zaman aşımına uğradı')
      : new ApiError('NETWORK_ERROR', `Sunucuya ulaşılamadı (${API_BASE_URL})`);
  } finally {
    clearTimeout(timer);
  }

  let body: { success: boolean; data?: T; error?: ApiErrorBody };
  try {
    body = await res.json();
  } catch {
    throw new ApiError('INVALID_RESPONSE', 'Sunucudan beklenmeyen bir yanıt geldi', res.status);
  }
  if (!body.success || body.data === undefined) {
    const err = ApiError.from(body.error ?? { code: 'UNKNOWN', message: 'Bilinmeyen hata' }, res.status);
    // Something the user did hit a limit: the paywall opens. Reading (GET) is left to the screen,
    // which shows the limit in place (a locked recipe).
    if ((init.method ?? 'GET') !== 'GET') notifyLimit(err);
    throw err;
  }
  return body.data;
}

// ---- mapping backend snake_case to app models ----

export function toUser(u: ApiUser): AppUser {
  return {
    id: String(u.id),
    name: u.display_name,
    username: u.username ?? undefined,
    avatarUrl: u.avatar_url ?? undefined,
    recipeCount: u.recipe_count,
    profile: u.profile ?? undefined,
    onboarded: u.onboarded_at != null,
    createdAt: u.created_at,
    email: u.email ?? undefined,
    providers: u.providers ?? [],
    // Servers from before accounts send no flag: everyone was a guest then.
    guest: u.is_guest ?? true,
    premium: u.premium ?? false,
  };
}

/** Images the backend serves itself come as "/media/..."; make them absolute. */
export function absolute(url: string): string {
  return url.startsWith('/') ? API_BASE_URL + url : url;
}

/** An account as the app shows it: its picture and covers are the server's own copies ("/media/..."). */
export function toCreator(c: Creator): Creator {
  return { ...c, avatar_url: c.avatar_url ? absolute(c.avatar_url) : '', covers: (c.covers ?? []).map(absolute) };
}

export function toEntry(e: ApiEntry): RecipeEntry {
  const s = e.source;
  return {
    id: String(e.id),
    recipe: e.recipe,
    imageUrl: e.image_url ? absolute(e.image_url) : '',
    imageStatus: e.image_status ?? undefined,
    createdAt: e.created_at,
    customized: e.customized,
    customNote: e.custom_note ?? undefined,
    origin: e.origin ?? 'instagram',
    generation: e.generation ?? undefined,
    voice: e.voice
      ? {
          url: absolute(e.voice.url),
          durationSec: e.voice.duration_sec ?? undefined,
          teller: e.voice.teller ?? undefined,
          waveform: e.voice.waveform ?? [],
        }
      : undefined,
    addedBy: {
      id: String(e.added_by.id),
      name: e.added_by.display_name,
      username: e.added_by.username ?? undefined,
      avatarUrl: e.added_by.avatar_url ?? undefined,
    },
    source: s
      ? {
          shortcode: s.shortcode,
          url: s.url,
          ownerUsername: s.owner_username,
          ownerFullName: s.owner_full_name,
          ownerAvatarUrl: s.owner_avatar_url ? absolute(s.owner_avatar_url) : undefined,
          ownerVerified: s.owner_verified,
          likes: s.likes ?? undefined,
          plays: s.plays,
          videoUrl: s.video_url,
        }
      : undefined,
  };
}

export interface FeedParams {
  scope: 'all' | 'mine' | 'others';
  q?: string;
  category?: Category;
  userId?: string;
  /** Instagram username: only recipes from this account's reels. */
  owner?: string;
  /** "ai": recipes the AI chef made for the user; "saved": the others. */
  origin?: 'ai' | 'saved';
  maxMinutes?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  dietary?: string;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  /** First launch: the server mints a UUID for this install and a guest user that owns it. */
  async registerDevice() {
    const data = await request<{ device_id: string; user: ApiUser; token: string }>(
      '/api/v1/devices',
      { method: 'POST', body: json({ platform: Platform.OS, app_version: APP_VERSION }) },
      15_000,
    );
    return { deviceId: data.device_id, user: toUser(data.user), token: data.token };
  },

  /** Saves the onboarding answers; `completed` marks onboarding as finished. */
  async saveProfile(displayName: string | undefined, profile: CookProfile, completed: boolean) {
    return toUser(
      await request<ApiUser>(
        '/api/v1/me/profile',
        { method: 'PUT', body: json({ display_name: displayName || undefined, profile, completed }) },
        15_000,
      ),
    );
  },

  /** Starts a recipe from what the user has; it is prepared in the background (see listGenerations). */
  startGeneration(req: ChefRequest) {
    return request<GenerationJob>('/api/v1/recipes/generate', { method: 'POST', body: json(req) }, 20_000);
  },

  /** The share sheet's quick path: the reel's recipe is saved to the book in the background. */
  importRecipe(url: string) {
    return request<GenerationJob>('/api/v1/me/recipes/import', { method: 'POST', body: json({ url }) }, 20_000);
  },

  /** Remembers this device for "your recipe is ready" notifications. */
  savePushToken(token: string, platform: string) {
    return request<{ saved: boolean }>('/api/v1/me/push-token', { method: 'PUT', body: json({ token, platform }) }, 15_000);
  },

  /** The user's background recipes, newest first, and how many finished ones they have not seen. */
  listGenerations() {
    return request<{ items: GenerationJob[]; unseen: number }>('/api/v1/me/generations?limit=20', { method: 'GET' }, 15_000);
  },

  markGenerationsSeen(ids?: string[]) {
    return request<{ unseen: number }>('/api/v1/me/generations/seen', { method: 'POST', body: json(ids ? { ids } : {}) }, 15_000);
  },

  async me() {
    return toUser(await request<ApiUser>('/api/v1/me', { method: 'GET' }, 15_000));
  },

  /**
   * Sign in with Apple or Google. The identity is attached to this device's account, or, when it
   * already belongs to an account, this device moves to that account: then `token` is the new
   * bearer token and `merged` says what the guest saved here came along.
   */
  async signIn(provider: 'apple' | 'google', identityToken: string, name?: string) {
    const data = await request<{ user: ApiUser; token?: string; merged: boolean; created: boolean }>(
      `/api/v1/auth/${provider}`,
      { method: 'POST', body: json({ identity_token: identityToken, name: name || undefined }) },
      30_000,
    );
    return { user: toUser(data.user), token: data.token || undefined, merged: data.merged, created: data.created };
  },

  /** Ends this device's session of a member account. */
  signOut() {
    return request<{ signed_out: boolean }>('/api/v1/auth/signout', { method: 'POST' }, 15_000);
  },

  /** Deletes the account and everything in it. Cannot be undone. */
  deleteAccount() {
    return request<{ deleted: boolean }>('/api/v1/me', { method: 'DELETE' }, 20_000);
  },

  /** The user's link to a recipe (the same one every time). */
  shareRecipe(entryId: string) {
    return request<{ token: string; url: string }>(`/api/v1/me/recipes/${encodeURIComponent(entryId)}/share`, { method: 'POST' }, 15_000);
  },

  /** A recipe someone shared with a link. `myEntryId` is set when it is already in the user's book. */
  async getShared(token: string) {
    const data = await request<{ entry: ApiEntry; shared_by: string; my_entry_id: number | null }>(
      `/api/v1/shared/${encodeURIComponent(token)}`,
      { method: 'GET' },
      20_000,
    );
    return { entry: toEntry(data.entry), sharedBy: data.shared_by, myEntryId: data.my_entry_id != null ? String(data.my_entry_id) : undefined };
  },

  /** Adds a shared recipe to the user's book. */
  async saveShared(token: string) {
    return toEntry(await request<ApiEntry>(`/api/v1/shared/${encodeURIComponent(token)}/save`, { method: 'POST' }, 20_000));
  },

  async listRecipes(p: FeedParams & { cursor?: string; limit?: number }): Promise<RecipePage> {
    const qs = new URLSearchParams({ scope: p.scope, limit: String(p.limit ?? 20) });
    if (p.q) qs.set('q', p.q);
    if (p.category) qs.set('category', p.category);
    if (p.userId) qs.set('user', p.userId);
    if (p.owner) qs.set('owner', p.owner);
    if (p.maxMinutes) qs.set('max_minutes', String(p.maxMinutes));
    if (p.difficulty) qs.set('difficulty', p.difficulty);
    if (p.dietary) qs.set('dietary', p.dietary);
    if (p.origin) qs.set('origin', p.origin);
    if (p.cursor) qs.set('cursor', p.cursor);
    const page = await request<ApiPage>(`/api/v1/recipes?${qs}`, { method: 'GET' }, 20_000);
    return { items: page.items.map(toEntry), nextCursor: page.next_cursor };
  },

  async getRecipe(id: string) {
    return toEntry(await request<ApiEntry>(`/api/v1/recipes/${encodeURIComponent(id)}`, { method: 'GET' }, 20_000));
  },

  /** Instagram accounts the recipes came from, the one with the most recipes first. */
  async listCreators(q?: string, limit = 100) {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (q) qs.set('q', q);
    return (await request<{ items: Creator[] }>(`/api/v1/creators?${qs}`, { method: 'GET' }, 20_000)).items.map(toCreator);
  },

  async getCreator(username: string) {
    return toCreator(await request<Creator>(`/api/v1/creators/${encodeURIComponent(username)}`, { method: 'GET' }, 20_000));
  },

  /** The ingredients most recipes use (staples like salt left out), most used first. */
  async popularIngredients(limit = 24) {
    return (await request<{ items: { name: string; count: number }[] }>(`/api/v1/ingredients?limit=${limit}`, { method: 'GET' }, 20_000)).items;
  },

  /** Recipe count per category, largest first (empty categories are left out). */
  categories() {
    return request<{ items: CategoryCount[]; total: number }>('/api/v1/categories', { method: 'GET' }, 20_000);
  },

  /** Adds the reel's recipe to the signed-in user's book (runs the agent if the recipe is not stored yet). */
  async saveRecipe(reelUrl: string) {
    return toEntry(await request<ApiEntry>('/api/v1/me/recipes', { method: 'POST', body: json({ url: reelUrl }) }, 200_000));
  },

  /** Yemek Asistanı: answers the last user message about this recipe (the app keeps the history). */
  askAssistant(entryId: string, messages: ChatTurn[]) {
    return request<AssistantAnswer>(
      `/api/v1/recipes/${encodeURIComponent(entryId)}/assistant`,
      { method: 'POST', body: json({ messages }) },
      160_000,
    );
  },

  /** Saves the user's personal version of a recipe; returns the user's entry (may be a new one). */
  async saveCustomRecipe(entryId: string, recipe: Recipe, note?: string) {
    return toEntry(
      await request<ApiEntry>(
        `/api/v1/me/recipes/${encodeURIComponent(entryId)}/custom`,
        { method: 'PUT', body: json({ recipe, note }) },
        20_000,
      ),
    );
  },

  async resetCustomRecipe(entryId: string) {
    return toEntry(await request<ApiEntry>(`/api/v1/me/recipes/${encodeURIComponent(entryId)}/custom`, { method: 'DELETE' }, 20_000));
  },

  async deleteRecipe(id: string) {
    await request<unknown>(`/api/v1/me/recipes/${encodeURIComponent(id)}`, { method: 'DELETE' }, 15_000);
  },

  /** API 1: reel info only (Instagram). */
  fetchReel(url: string) {
    return request<Reel>('/api/v1/reels/fetch', { method: 'POST', body: JSON.stringify({ url }) }, 45_000);
  },

  /** API 2: reel + AI recipe. The reel is already stored after API 1, so only the agent runs. */
  async fetchRecipe(url: string, refresh = false) {
    const data = await request<FetchRecipeResponse>(
      '/api/v1/reels/fetch-recipe',
      { method: 'POST', body: JSON.stringify({ url, refresh_recipe: refresh }) },
      200_000,
    );
    if (data.recipe_error) throw ApiError.from(data.recipe_error);
    if (!data.recipe) throw new ApiError('RECIPE_AGENT_ERROR', 'Tarif oluşturulamadı');
    return data;
  },
};

/** Video of a reel, streamed by the backend (it refreshes expired Instagram links and supports seeking). */
export function videoSource(shortcode: string) {
  return {
    uri: `${API_BASE_URL}/api/v1/reels/${encodeURIComponent(shortcode)}/video/download?inline=true`,
    headers: API_KEY ? { 'X-API-Key': API_KEY } : undefined,
  };
}

/** User-facing Turkish text for an error. */
export function describeError(err: unknown): { title: string; message: string } {
  const code = err instanceof ApiError ? err.code : 'UNKNOWN';
  switch (code) {
    case 'NETWORK_ERROR':
      return { title: 'Sunucuya ulaşılamadı', message: 'İnternet bağlantını ya da backend’in çalıştığını kontrol et.' };
    case 'TIMEOUT':
      return { title: 'Zaman aşımı', message: 'İşlem beklenenden uzun sürdü. Tekrar dener misin?' };
    case 'INVALID_INPUT':
      return { title: 'Geçersiz link', message: 'Bu bir Instagram ya da YouTube video linki gibi görünmüyor.' };
    case 'REEL_NOT_FOUND':
      return { title: 'Video bulunamadı', message: 'Paylaşım silinmiş ya da gizli bir hesaba ait olabilir.' };
    case 'NOT_A_VIDEO':
      return { title: 'Video değil', message: 'Bu paylaşım bir video değil. Bir video linki dene.' };
    case 'INSTAGRAM_RATE_LIMITED':
    case 'RECIPE_AGENT_RATE_LIMITED':
      return { title: 'Biraz yavaşlayalım', message: 'Çok fazla istek gönderildi. Birkaç dakika sonra tekrar dene.' };
    case 'YOUTUBE_NOT_CONFIGURED':
      return { title: 'YouTube şu an kapalı', message: 'YouTube videoları şu an eklenemiyor. Birazdan tekrar dener misin?' };
    case 'INSTAGRAM_LOGIN_REQUIRED':
      return { title: 'Instagram bağlantısı yok', message: 'Sunucunun Instagram oturumu yenilenmeli.' };
    case 'NO_RECIPE_TEXT':
      return { title: 'Açıklama boş', message: 'Bu videonun açıklamasında tarif bulunamadı.' };
    case 'NOT_A_RECIPE':
      return { title: 'Bu paylaşımda tarif yok', message: 'AI açıklamada malzeme ya da yapılış bulamadı.' };
    case 'CANNOT_COOK':
      return { title: 'Bununla tarif çıkmadı', message: err instanceof Error ? err.message : 'Birkaç malzeme daha ekler misin?' };
    case 'CHEF_UNSAFE':
      return { title: 'Güvenli bir tarif bulamadık', message: 'Alerji ve beslenme tercihlerine uymayan bir şey çıktı, göstermedik. Tekrar dener misin?' };
    case 'AGENT_RATE_LIMITED':
      return { title: 'Biraz yavaşlayalım', message: 'Kısa sürede çok soru sordun. Birkaç dakika sonra tekrar dene.' };
    case 'AGENT_NOT_CONFIGURED':
      return { title: 'Asistan şu an kapalı', message: 'Birazdan tekrar dene.' };
    case 'CREATOR_NOT_FOUND':
      return { title: 'Profil bulunamadı', message: 'Bu hesaptan kayıtlı tarif yok.' };
    case 'RECIPE_NOT_FOUND':
      return { title: 'Tarif bulunamadı', message: 'Bu tarif silinmiş olabilir.' };
    case 'LIMIT_REACHED':
      return {
        title: err instanceof Error && err.message ? err.message : 'Bugünlük hakkın doldu',
        message: 'Yarın yeniden açılır. Beklemek istemezsen Premium ile sınırsız devam edebilirsin.',
      };
    case 'SIGN_IN_REQUIRED':
      return { title: 'Önce giriş yap', message: 'Bu özellik için Apple ya da Google ile giriş yapman yeterli.' };
    case 'SIGN_IN_INVALID':
      return { title: 'Giriş doğrulanamadı', message: 'Tekrar dener misin?' };
    case 'SIGN_IN_UNAVAILABLE':
    case 'SIGN_IN_RETRY':
      return { title: 'Giriş şu an yapılamadı', message: 'Birazdan tekrar dener misin?' };
    case 'SIGN_IN_NOT_CONFIGURED':
      return { title: 'Bu giriş yöntemi kapalı', message: 'Diğer giriş yöntemini deneyebilirsin.' };
    case 'ACCOUNT_ALREADY_LINKED':
      return { title: 'Bu hesap başka bir kimliğe bağlı', message: 'Farklı bir hesapla girmek için önce çıkış yap.' };
    case 'SHARE_NOT_FOUND':
      return { title: 'Tarif bulunamadı', message: 'Bu tarif artık paylaşılmıyor.' };
    case 'AUTH_REQUIRED':
    case 'INVALID_TOKEN':
      return { title: 'Oturum bulunamadı', message: 'Devam etmek için tekrar giriş yapmalısın.' };
    case 'DATABASE_REQUIRED':
      return { title: 'Veritabanı kapalı', message: 'Sunucu veritabanı olmadan çalışıyor.' };
    case 'ASSISTANT_NOT_CONFIGURED':
      return { title: 'Asistan şu an kapalı', message: 'Sunucuda yapay zeka ayarlı değil.' };
    case 'RECIPE_AGENT_NOT_CONFIGURED':
      return { title: 'AI servisi kapalı', message: 'Sunucuda tarif agent’ı ayarlı değil (BASETEN_API_KEY).' };
    case 'RECIPE_AGENT_ERROR':
    case 'RECIPE_AGENT_AUTH_FAILED':
      return { title: 'Tarif oluşturulamadı', message: 'AI tarifi çıkaramadı. Tekrar denemek ister misin?' };
    default:
      return {
        title: 'Bir şeyler ters gitti',
        message: err instanceof Error ? err.message : 'Beklenmeyen bir hata oluştu.',
      };
  }
}
