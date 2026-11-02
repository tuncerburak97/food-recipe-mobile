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
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(body: ApiErrorBody, status = 0) {
    return new ApiError(body.code, body.message, status);
  }
}

async function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(API_BASE_URL + path, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
        ...(APP_VERSION ? { 'X-App-Version': APP_VERSION } : {}),
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
    throw ApiError.from(body.error ?? { code: 'UNKNOWN', message: 'Bilinmeyen hata' }, res.status);
  }
  return body.data;
}

// ---- mapping backend snake_case to app models ----

function toUser(u: ApiUser): AppUser {
  return {
    id: String(u.id),
    name: u.display_name,
    username: u.username ?? undefined,
    avatarUrl: u.avatar_url ?? undefined,
    recipeCount: u.recipe_count,
    profile: u.profile ?? undefined,
    onboarded: u.onboarded_at != null,
  };
}

/** Images the backend serves itself come as "/media/..."; make them absolute. */
function absolute(url: string): string {
  return url.startsWith('/') ? API_BASE_URL + url : url;
}

function toEntry(e: ApiEntry): RecipeEntry {
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
          ownerAvatarUrl: s.owner_avatar_url || undefined,
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
    return (await request<{ items: Creator[] }>(`/api/v1/creators?${qs}`, { method: 'GET' }, 20_000)).items;
  },

  getCreator(username: string) {
    return request<Creator>(`/api/v1/creators/${encodeURIComponent(username)}`, { method: 'GET' }, 20_000);
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
      return { title: 'Geçersiz link', message: 'Bu bir Instagram Reels linki gibi görünmüyor.' };
    case 'REEL_NOT_FOUND':
      return { title: 'Reels bulunamadı', message: 'Paylaşım silinmiş ya da gizli bir hesaba ait olabilir.' };
    case 'NOT_A_VIDEO':
      return { title: 'Video değil', message: 'Bu paylaşım bir Reels değil. Bir Reels linki dene.' };
    case 'INSTAGRAM_RATE_LIMITED':
    case 'RECIPE_AGENT_RATE_LIMITED':
      return { title: 'Biraz yavaşlayalım', message: 'Çok fazla istek gönderildi. Birkaç dakika sonra tekrar dene.' };
    case 'INSTAGRAM_LOGIN_REQUIRED':
      return { title: 'Instagram bağlantısı yok', message: 'Sunucunun Instagram oturumu yenilenmeli.' };
    case 'NO_RECIPE_TEXT':
      return { title: 'Açıklama boş', message: 'Bu Reels’in açıklamasında tarif bulunamadı.' };
    case 'NOT_A_RECIPE':
      return { title: 'Bu paylaşımda tarif yok', message: 'AI açıklamada malzeme ya da yapılış bulamadı.' };
    case 'CANNOT_COOK':
      return { title: 'Bununla tarif çıkmadı', message: err instanceof Error ? err.message : 'Birkaç malzeme daha ekler misin?' };
    case 'CHEF_UNSAFE':
      return { title: 'Güvenli bir tarif bulamadık', message: 'Alerji ve beslenme tercihlerine uymayan bir şey çıktı, göstermedik. Tekrar dener misin?' };
    case 'CREATOR_NOT_FOUND':
      return { title: 'Profil bulunamadı', message: 'Bu hesaptan kayıtlı tarif yok.' };
    case 'RECIPE_NOT_FOUND':
      return { title: 'Tarif bulunamadı', message: 'Bu tarif silinmiş olabilir.' };
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
