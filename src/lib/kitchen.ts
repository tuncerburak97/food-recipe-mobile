// "Dolabım" (what the user has at home) and the shopping list: API calls, hooks and small helpers.
// Mirrors recipe-backend internal/httpapi/kitchen.go.

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { API_BASE_URL, request } from '@/lib/api';
import { capitalize, formatAmount, searchKey } from '@/lib/format';
import type { ApiEntry, Ingredient, IngredientGroup, RecipeEntry, Unit } from '@/lib/types';
import { useSession } from '@/store/session';

// ---- types ----

export type AisleCode = 'produce' | 'meat_fish' | 'dairy_deli' | 'dry_goods' | 'spices' | 'bakery' | 'frozen' | 'drinks' | 'other';

/** One supermarket section ("Manav") with its items, in the backend's fixed order. */
export interface AisleGroup<T> {
  aisle: AisleCode;
  title: string;
  items: T[];
}

export interface PantryItem {
  id: number;
  name: string;
  /** Folded search key (same as the backend's ingredient key). */
  key: string;
  created_at: string;
}

export interface PantryList {
  count: number;
  groups: AisleGroup<PantryItem>[];
  /** Names a POST added (names already in the pantry are left out). */
  added?: string[];
}

export interface ShoppingItem {
  id: number;
  name: string;
  key: string;
  quantity: number | null;
  unit: Unit | null;
  checked: boolean;
  /** Recipes the item was added for. */
  recipes: { entry_id: number; title: string }[];
  created_at: string;
}

export interface ShoppingList {
  count: number;
  checked: number;
  groups: AisleGroup<ShoppingItem>[];
  /** Names "move-to-pantry" took off the list. */
  moved?: string[];
}

/** An item to add to the shopping list. */
export interface ShoppingAdd {
  name: string;
  quantity?: number | null;
  unit?: Unit | null;
  entry_id?: number;
  entry_ids?: number[];
}

export interface KitchenMatch {
  entry_id: number;
  missing: string[];
  have: number;
  required: number;
}

export interface KitchenMatches {
  pantryCount: number;
  /** By entry id (as a string, like RecipeEntry.id). Only entries with at most 2 missing. */
  byEntry: Record<string, KitchenMatch>;
}

export interface Suggestion {
  entry: RecipeEntry;
  missing: string[];
  /** In the user's own book. */
  saved: boolean;
}

export type IngredientStatus = 'have' | 'missing' | 'staple';

export interface CheckedName {
  name: string;
  key: string;
  status: IngredientStatus;
}

// ---- API ----

const json = (body: unknown) => JSON.stringify(body);
const TIMEOUT = 15_000;

/** Same as toEntry in api.ts (not exported there). */
function toEntry(e: ApiEntry): RecipeEntry {
  const s = e.source;
  return {
    id: String(e.id),
    recipe: e.recipe,
    imageUrl: e.image_url ? (e.image_url.startsWith('/') ? API_BASE_URL + e.image_url : e.image_url) : '',
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

export const kitchenApi = {
  pantry() {
    return request<PantryList>('/api/v1/me/pantry', { method: 'GET' }, TIMEOUT);
  },
  /** Adds names from a list and/or typed text ("domates, 3 yumurta"); amounts are dropped. */
  addPantry(input: { names?: string[]; text?: string }) {
    return request<PantryList>('/api/v1/me/pantry', { method: 'POST', body: json(input) }, TIMEOUT);
  },
  removePantry(id: number) {
    return request<PantryList>(`/api/v1/me/pantry/${id}`, { method: 'DELETE' }, TIMEOUT);
  },
  async matches(): Promise<KitchenMatches> {
    const data = await request<{ pantry_count: number; items: KitchenMatch[] }>('/api/v1/me/kitchen/matches', { method: 'GET' }, 20_000);
    const byEntry: Record<string, KitchenMatch> = {};
    for (const m of data.items) byEntry[String(m.entry_id)] = m;
    return { pantryCount: data.pantry_count, byEntry };
  },
  async suggestions(limit = 10): Promise<{ pantryCount: number; items: Suggestion[] }> {
    const data = await request<{ pantry_count: number; items: { entry: ApiEntry; missing: string[]; saved: boolean }[] }>(
      `/api/v1/me/kitchen/suggestions?limit=${limit}`,
      { method: 'GET' },
      20_000,
    );
    return { pantryCount: data.pantry_count, items: data.items.map((s) => ({ ...s, entry: toEntry(s.entry) })) };
  },
  check(names: string[]) {
    return request<{ pantry_count: number; items: CheckedName[] }>('/api/v1/me/kitchen/check', { method: 'POST', body: json({ names }) }, TIMEOUT);
  },
  shopping() {
    return request<ShoppingList>('/api/v1/me/shopping', { method: 'GET' }, TIMEOUT);
  },
  addShopping(input: { items?: ShoppingAdd[]; text?: string }) {
    return request<ShoppingList>('/api/v1/me/shopping', { method: 'POST', body: json(input) }, TIMEOUT);
  },
  setChecked(id: number, checked: boolean) {
    return request<ShoppingList>(`/api/v1/me/shopping/${id}`, { method: 'PATCH', body: json({ checked }) }, TIMEOUT);
  },
  removeShopping(id: number) {
    return request<ShoppingList>(`/api/v1/me/shopping/${id}`, { method: 'DELETE' }, TIMEOUT);
  },
  /** "Aldıklarımı dolaba ekle": checked items leave the list and go into the pantry. */
  moveToPantry() {
    return request<ShoppingList>('/api/v1/me/shopping/move-to-pantry', { method: 'POST' }, TIMEOUT);
  },
};

// ---- queries ----

const KEYS = {
  pantry: ['kitchen', 'pantry'] as const,
  shopping: ['kitchen', 'shopping'] as const,
  matches: ['kitchen', 'matches'] as const,
  suggestions: ['kitchen', 'suggestions'] as const,
  check: ['kitchen', 'check'] as const,
};

/** Everything computed from the pantry (badges, suggestions, the recipe page) is fetched again. */
export function refreshKitchenMatches(client: QueryClient) {
  client.invalidateQueries({ queryKey: KEYS.matches });
  client.invalidateQueries({ queryKey: KEYS.suggestions });
  client.invalidateQueries({ queryKey: KEYS.check });
}

function useReady() {
  return useSession().status === 'ready';
}

export function usePantry() {
  return useQuery({ queryKey: KEYS.pantry, queryFn: kitchenApi.pantry, enabled: useReady() });
}

export function pantryItems(list: PantryList | undefined): PantryItem[] {
  return list?.groups.flatMap((g) => g.items) ?? [];
}

/**
 * A change to the pantry or the shopping list. `apply` shows it at once in the cached list (ticks
 * feel instant); the server's list replaces it when the last change in flight is done, so quick taps
 * do not flicker. A failed change is rolled back.
 */
function useListMutation<V, L>(
  key: readonly string[],
  mutationFn: (v: V) => Promise<L>,
  options: { apply?: (list: L, v: V) => L; after?: (client: QueryClient) => void } = {},
) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: key,
    mutationFn,
    onMutate: async (v: V) => {
      if (!options.apply) return { before: undefined };
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<L>(key);
      if (before) client.setQueryData(key, options.apply(before, v));
      return { before };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.before) client.setQueryData(key, ctx.before);
    },
    onSettled: (list) => {
      // This mutation still counts as running here.
      if (client.isMutating({ mutationKey: key }) <= 1) {
        if (list) client.setQueryData(key, list);
        else client.invalidateQueries({ queryKey: key });
      }
      options.after?.(client);
    },
  });
}

function withoutItem<T extends { id: number }>(groups: AisleGroup<T>[], id: number): AisleGroup<T>[] {
  return groups.map((g) => ({ ...g, items: g.items.filter((i) => i.id !== id) })).filter((g) => g.items.length > 0);
}

/** True while a pantry change is on its way to the server. */
export function pantryChanging(client: QueryClient): boolean {
  return client.isMutating({ mutationKey: KEYS.pantry }) > 0;
}

export function useAddPantry() {
  return useListMutation(KEYS.pantry, kitchenApi.addPantry, { after: refreshKitchenMatches });
}

/** Removes at once on screen; puts the item back if the server says no. */
export function useRemovePantry() {
  return useListMutation(KEYS.pantry, (item: PantryItem) => kitchenApi.removePantry(item.id), {
    apply: (list: PantryList, item) => ({ ...list, count: list.count - 1, groups: withoutItem(list.groups, item.id) }),
    after: refreshKitchenMatches,
  });
}

export function useShopping() {
  return useQuery({ queryKey: KEYS.shopping, queryFn: kitchenApi.shopping, enabled: useReady() });
}

export function shoppingItems(list: ShoppingList | undefined): ShoppingItem[] {
  return list?.groups.flatMap((g) => g.items) ?? [];
}

export function useAddShopping() {
  return useListMutation(KEYS.shopping, kitchenApi.addShopping);
}

export function useToggleShopping() {
  return useListMutation(KEYS.shopping, (v: { item: ShoppingItem; checked: boolean }) => kitchenApi.setChecked(v.item.id, v.checked), {
    apply: (list: ShoppingList, v) => {
      const groups = list.groups.map((g) => ({ ...g, items: g.items.map((i) => (i.id === v.item.id ? { ...i, checked: v.checked } : i)) }));
      const checked = groups.reduce((n, g) => n + g.items.filter((i) => i.checked).length, 0);
      return { ...list, groups, checked };
    },
  });
}

export function useRemoveShopping() {
  return useListMutation(KEYS.shopping, (item: ShoppingItem) => kitchenApi.removeShopping(item.id), {
    apply: (list: ShoppingList, item) => ({
      ...list,
      groups: withoutItem(list.groups, item.id),
      count: list.count - 1,
      checked: list.checked - (item.checked ? 1 : 0),
    }),
  });
}

/** "Aldıklarımı dolaba ekle"; the pantry and everything computed from it are fetched again. */
export function useMoveToPantry() {
  return useListMutation(KEYS.shopping, () => kitchenApi.moveToPantry(), {
    after: (client) => {
      client.invalidateQueries({ queryKey: KEYS.pantry });
      refreshKitchenMatches(client);
    },
  });
}

/** Entries the pantry almost covers, for the "Hepsi evde" / "1 eksik" badges. */
export function useKitchenMatches() {
  return useQuery({ queryKey: KEYS.matches, queryFn: kitchenApi.matches, enabled: useReady() });
}

/** The badge of a recipe card: null when the user has no pantry or more than two are missing. */
export function useKitchenBadge(entryId: string): { label: string; tone: 'success' | 'neutral' } | null {
  const data = useKitchenMatches().data;
  const match = data && data.pantryCount > 0 ? data.byEntry[entryId] : undefined;
  if (!match) return null;
  return match.missing.length === 0 ? { label: 'Hepsi evde', tone: 'success' } : { label: `${match.missing.length} eksik`, tone: 'neutral' };
}

/** "Bu akşam yapabileceklerin": recipes with at most one missing ingredient. */
export function useKitchenSuggestions() {
  return useQuery({ queryKey: KEYS.suggestions, queryFn: () => kitchenApi.suggestions(10), enabled: useReady() });
}

/** Ingredient names of a recipe, in order (the key of the pantry check). */
export function ingredientNames(groups: IngredientGroup[]): string[] {
  return groups.flatMap((g) => g.ingredients.map((i) => i.name));
}

/**
 * Whether the pantry covers each ingredient name. The checklist and the bar under it ask with the
 * same names, so they share one request.
 */
export function useIngredientCheck(names: string[]) {
  const enabled = useReady() && names.length > 0;
  return useQuery({
    queryKey: [...KEYS.check, names.join('\n')],
    queryFn: async () => {
      const data = await kitchenApi.check(names);
      const byName: Record<string, CheckedName> = {};
      for (const it of data.items) byName[it.name] = it;
      return { pantryCount: data.pantry_count, byName };
    },
    enabled,
  });
}

// ---- helpers ----

/** The backend's ingredient key for a name: lowercase, Turkish letters folded, single spaces. */
export function kitchenKey(name: string): string {
  return searchKey(name).replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u').trim().replace(/\s+/g, ' ');
}

/** "3 adet", "400 gr", "" when the amount is not known. */
export function shoppingAmount(item: Pick<ShoppingItem, 'quantity' | 'unit'>): string {
  const ing: Ingredient = {
    name: '',
    original_text: '',
    quantity: item.quantity,
    quantity_max: null,
    unit: item.unit,
    unit_text: null,
    preparation: null,
    optional: false,
    to_taste: false,
    notes: null,
  };
  return formatAmount(ing);
}

/** The list as plain text for WhatsApp: what is still to buy, by aisle. */
export function shoppingText(list: ShoppingList): string {
  const open = list.groups.some((g) => g.items.some((i) => !i.checked));
  const lines = ['Alışveriş listesi'];
  for (const g of list.groups) {
    const items = g.items.filter((i) => !open || !i.checked);
    if (!items.length) continue;
    lines.push('', g.title);
    for (const i of items) {
      const amount = shoppingAmount(i);
      lines.push(`- ${capitalize(i.name)}${amount ? ` (${amount})` : ''}`);
    }
  }
  return lines.join('\n');
}
