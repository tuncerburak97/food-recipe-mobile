import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';

import { API_BASE_URL, ApiError, authHeaders, describeError, request } from '@/lib/api';
import { appendFile } from '@/lib/transcribe';
import type { Category } from '@/lib/types';
import { useSession } from '@/store/session';

/**
 * Cook journal ("Pişirdiklerim"): each time the user cooked a recipe, with an optional verdict, a
 * note for next time and a photo. Backend: /api/v1/me/journal and /api/v1/recipes/:entryId/journal.
 */

export type CookRating = 'loved' | 'ok' | 'bad';

/** The three verdicts of the finished page, in order. */
export const RATINGS: { value: CookRating; label: string }[] = [
  { value: 'loved', label: 'Çok beğendik' },
  { value: 'ok', label: 'Fena değil' },
  { value: 'bad', label: 'Olmadı' },
];

export function ratingLabel(r?: CookRating): string | undefined {
  return RATINGS.find((x) => x.value === r)?.label;
}

/** The longest note the backend keeps. */
export const NOTE_MAX = 1000;

export interface CookLog {
  id: string;
  /** Opens the recipe; missing when the recipe is no longer in any book. */
  entryId?: string;
  recipeTitle: string;
  category?: Category;
  recipeImageUrl?: string;
  rating?: CookRating;
  note?: string;
  /** The user's own photo (absolute); load it with `photoSource()`. */
  photoUrl?: string;
  cookedAt: string;
}

export interface JournalSummary {
  count: number;
  lastCookedAt?: string;
  lastRating?: CookRating;
  /** The newest note, which may be from an earlier cook than the last one. */
  lastNote?: string;
  lastNoteAt?: string;
  /** Newest first, at most 4 (absolute URLs). */
  photos: { logId: string; url: string }[];
}

export interface JournalPage {
  items: CookLog[];
  nextCursor?: string;
  total: number;
}

/** A photo picked on the device, ready to upload. */
export interface PickedPhoto {
  uri: string;
  type: string;
  name: string;
}

interface ApiCookLog {
  id: number;
  entry_id: number | null;
  recipe_title: string;
  recipe_category: string;
  recipe_image_url: string;
  rating: CookRating | null;
  note: string | null;
  photo_url: string | null;
  cooked_at: string;
}

interface ApiSummary {
  count: number;
  last_cooked_at: string | null;
  last_rating: CookRating | null;
  last_note: string | null;
  last_note_at: string | null;
  photos: { log_id: number; url: string }[];
}

function absolute(url: string): string {
  return url.startsWith('/') ? API_BASE_URL + url : url;
}

function toLog(l: ApiCookLog): CookLog {
  return {
    id: String(l.id),
    entryId: l.entry_id != null ? String(l.entry_id) : undefined,
    recipeTitle: l.recipe_title,
    category: (l.recipe_category || undefined) as Category | undefined,
    recipeImageUrl: l.recipe_image_url ? absolute(l.recipe_image_url) : undefined,
    rating: l.rating ?? undefined,
    note: l.note ?? undefined,
    photoUrl: l.photo_url ? absolute(l.photo_url) : undefined,
    cookedAt: l.cooked_at,
  };
}

/** One short Turkish line for a failed journal request. */
export function journalErrorText(err: unknown): string {
  const code = err instanceof ApiError ? err.code : '';
  switch (code) {
    case 'PHOTO_TOO_LARGE':
      return 'Fotoğraf çok büyük. Başka bir fotoğraf dener misin?';
    case 'UNSUPPORTED_PHOTO':
      return 'Bu fotoğraf açılamadı. Başka bir fotoğraf dener misin?';
    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return `${describeError(err).title}. Bağlantını kontrol edip tekrar dene.`;
    case 'RECIPE_NOT_FOUND':
    case 'COOK_LOG_NOT_FOUND':
      return 'Bu kayıt artık yok.';
    default:
      return 'Kaydedilemedi. Tekrar dener misin?';
  }
}

/** Image source for a private journal photo: it is served to its owner only, so it sends the token. */
export function photoSource(url: string) {
  return { uri: url, headers: authHeaders() };
}

export const journalApi = {
  /** Saves one cook. Everything but the entry is optional. */
  async create(v: { entryId: string; rating?: CookRating; note?: string; photo?: PickedPhoto }) {
    const form = new FormData();
    form.append('entry_id', v.entryId);
    if (v.rating) form.append('rating', v.rating);
    if (v.note) form.append('note', v.note);
    if (v.photo) await appendFile(form, 'photo', v.photo.uri, v.photo.name, v.photo.type);
    return toLog(await request<ApiCookLog>('/api/v1/me/journal', { method: 'POST', body: form }, v.photo ? 60_000 : 20_000));
  },

  async list(p: { entryId?: string; cursor?: string; limit?: number }): Promise<JournalPage> {
    const qs = new URLSearchParams({ limit: String(p.limit ?? 20) });
    if (p.entryId) qs.set('entry_id', p.entryId);
    if (p.cursor) qs.set('cursor', p.cursor);
    const page = await request<{ items: ApiCookLog[]; next_cursor?: string; total: number }>(`/api/v1/me/journal?${qs}`, { method: 'GET' }, 20_000);
    return { items: page.items.map(toLog), nextCursor: page.next_cursor, total: page.total };
  },

  async summary(entryId: string): Promise<JournalSummary> {
    const s = await request<ApiSummary>(`/api/v1/recipes/${encodeURIComponent(entryId)}/journal`, { method: 'GET' }, 15_000);
    return {
      count: s.count,
      lastCookedAt: s.last_cooked_at ?? undefined,
      lastRating: s.last_rating ?? undefined,
      lastNote: s.last_note ?? undefined,
      lastNoteAt: s.last_note_at ?? undefined,
      photos: s.photos.map((p) => ({ logId: String(p.log_id), url: absolute(p.url) })),
    };
  },

  /** Changes the note and the verdict; an empty note or a null verdict clears it. */
  async update(id: string, patch: { note?: string; rating?: CookRating | null }) {
    const body = JSON.stringify({ note: patch.note, rating: patch.rating === null ? '' : patch.rating });
    return toLog(await request<ApiCookLog>(`/api/v1/me/journal/${encodeURIComponent(id)}`, { method: 'PATCH', body }, 15_000));
  },

  async remove(id: string) {
    await request<unknown>(`/api/v1/me/journal/${encodeURIComponent(id)}`, { method: 'DELETE' }, 15_000);
  },
};

// ---- queries ----

const LIST = ['journal', 'list'] as const;

/** The journal, newest first; `entryId` limits it to that recipe. */
export function useJournal(entryId?: string) {
  const { status } = useSession();
  return useInfiniteQuery({
    queryKey: [...LIST, entryId ?? ''],
    queryFn: ({ pageParam }) => journalApi.list({ entryId, cursor: pageParam || undefined }),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor,
    enabled: status === 'ready',
  });
}

/** How often the user cooked this recipe and their last note (for the recipe page). */
export function useJournalSummary(entryId: string) {
  const { status } = useSession();
  return useQuery({
    queryKey: ['journal', 'summary', entryId],
    queryFn: () => journalApi.summary(entryId),
    enabled: status === 'ready',
  });
}

/** Replaces or removes one log in every loaded journal page. */
function patchLists(client: ReturnType<typeof useQueryClient>, id: string, next: CookLog | null) {
  client.setQueriesData<InfiniteData<JournalPage>>({ queryKey: LIST }, (data) => {
    if (!data) return data;
    const removed = !next && data.pages.some((p) => p.items.some((l) => l.id === id)) ? 1 : 0;
    return {
      ...data,
      pages: data.pages.map((p) => ({
        ...p,
        total: p.total - removed,
        items: next ? p.items.map((l) => (l.id === id ? next : l)) : p.items.filter((l) => l.id !== id),
      })),
    };
  });
}

export function useUpdateCookLog() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; note?: string; rating?: CookRating | null }) => journalApi.update(v.id, v),
    onSuccess: (log) => {
      patchLists(client, log.id, log);
      client.invalidateQueries({ queryKey: ['journal'] });
    },
  });
}

export function useDeleteCookLog() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: journalApi.remove,
    onSuccess: (_, id) => {
      patchLists(client, id, null);
      client.invalidateQueries({ queryKey: ['journal'] });
    },
  });
}

// ---- dates, in Turkish ----

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAY = 86_400_000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Bugün", "Dün", "12 Ekim", or "12 Ekim 2025" in another year. */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY);
  if (days === 0) return 'Bugün';
  if (days === 1) return 'Dün';
  const date = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? date : `${date} ${d.getFullYear()}`;
}

/** The month a cook belongs to in the timeline: "Kasım", or "Kasım 2025" in another year. */
export function monthLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() ? MONTHS[d.getMonth()] : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "3 kez pişirdin · son 12 Ekim", or "1 kez pişirdin · dün". */
export function cookedLine(count: number, lastIso: string, now = new Date()): string {
  const day = dayLabel(lastIso, now);
  const when = day === 'Bugün' ? 'bugün' : day === 'Dün' ? 'dün' : day;
  return count === 1 ? `1 kez pişirdin · ${when}` : `${count} kez pişirdin · son ${when}`;
}
