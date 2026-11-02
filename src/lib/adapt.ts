// One-tap adaptations of a recipe ("Airfryer’a çevir", "Fırınsız yap"...). The backend rewrites the
// original recipe for the user's allergies and diet and saves it as their personal version
// (recipe-backend internal/assistant/adapt.go, POST /api/v1/recipes/:entryId/adapt).

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api, ApiError, describeError, request } from '@/lib/api';
import { searchKey, totalMinutes } from '@/lib/format';
import type { CookProfile } from '@/lib/profile';
import type { Recipe, RecipeEntry } from '@/lib/types';

export type AdaptKind = 'airfryer' | 'no_oven' | 'lighter' | 'vegetarian' | 'quicker' | 'kid_friendly';

export interface AdaptOption {
  kind: AdaptKind;
  label: string;
}

export interface AdaptResult {
  /** The user's entry with the new version; a new id when the recipe was someone else's. */
  entry: RecipeEntry;
  note: string;
  changes: string[];
}

/** The user's version before an adaptation, so "Geri al" can bring it back. */
export interface PreviousVersion {
  recipe: Recipe;
  note?: string;
}

interface AdaptResponse {
  id: number;
  adaptation: { kind: AdaptKind; note: string; changes: string[] };
}

// The server may ask the model twice (a safety fix), each call up to about a minute.
const ADAPT_TIMEOUT_MS = 160_000;

/** Notes the backend stores per kind (internal/assistant/adapt_prompt.go). Used to mark the applied chip. */
const NOTES: Record<string, AdaptKind> = {
  'Airfryer’a uyarlandı': 'airfryer',
  'Fırınsız yapıldı': 'no_oven',
  'Daha hafif yapıldı': 'lighter',
  'Vejetaryen yapıldı': 'vegetarian',
  'Vegan yapıldı': 'vegetarian',
  'Daha pratik yapıldı': 'quicker',
  'Çocuklar için uyarlandı': 'kid_friendly',
};

/** The kind behind the entry's personal version, if a one-tap adaptation made it. */
export function appliedKind(entry: RecipeEntry): AdaptKind | undefined {
  return entry.customized && entry.customNote ? NOTES[entry.customNote] : undefined;
}

export async function adaptRecipe(entryId: string, kind: AdaptKind): Promise<AdaptResult> {
  const data = await request<AdaptResponse>(
    `/api/v1/recipes/${encodeURIComponent(entryId)}/adapt`,
    { method: 'POST', body: JSON.stringify({ kind }) },
    ADAPT_TIMEOUT_MS,
  );
  // Read the entry back through the shared mapper so it has exactly the shape the app uses.
  const entry = await api.getRecipe(String(data.id));
  return { entry, note: data.adaptation.note, changes: data.adaptation.changes };
}

/** Puts the entry in the cache and refreshes the lists, like the other recipe mutations in queries.ts. */
function store(client: QueryClient, entry: RecipeEntry) {
  client.setQueryData(['recipe', entry.id], entry);
  for (const key of ['recipes', 'me', 'creators', 'creator', 'categories']) {
    client.invalidateQueries({ queryKey: [key] });
  }
}

/** Adapts a recipe; the result is in the cache even if the screen was left meanwhile. */
export function useAdaptRecipe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: { entryId: string; kind: AdaptKind }) => adaptRecipe(v.entryId, v.kind),
    onSuccess: (res) => store(client, res.entry),
  });
}

/**
 * Undo: restores the version the user had before, or the original recipe. A plain function (not a
 * hook) because it runs from a toast, possibly after the screen that adapted is gone.
 */
export async function restoreVersion(client: QueryClient, entryId: string, previous?: PreviousVersion): Promise<RecipeEntry> {
  const entry = previous
    ? await api.saveCustomRecipe(entryId, previous.recipe, previous.note)
    : await api.resetCustomRecipe(entryId);
  store(client, entry);
  return entry;
}

// ---- which adaptations fit a recipe ----

// Word lists are folded like searchKey(): "tavuğu" -> "tavugu". Stems cover the k->ğ change ("balığı").
const MEAT_FISH = [
  'et', 'dana', 'kuzu', 'koyun', 'kiyma', 'tavuk', 'tavug', 'hindi', 'pilic', 'ordek', 'sucuk', 'pastirma', 'salam',
  'sosis', 'jambon', 'bacon', 'kavurma', 'ciger', 'bonfile', 'antrikot', 'biftek', 'kusbasi', 'kofte', 'doner',
  'jelatin', 'bulyon', 'balik', 'balig', 'somon', 'ton', 'levrek', 'cupra', 'hamsi', 'sardalya', 'uskumru', 'palamut',
  'lufer', 'alabalik', 'morina', 'karides', 'midye', 'kalamar', 'ahtapot', 'yengec', 'ancuez',
];
/** An ingredient with one of these is not meat even if it names one ("soya kıyması", "mercimek köftesi"). */
const NOT_MEAT = ['sebze', 'soya', 'vegan', 'bitkisel', 'mercimek', 'nohut', 'bulgur', 'patates'];
const RICH = ['yag', 'zeytinyag', 'tereyag', 'krema', 'kaymak', 'mayonez', 'seker', 'cikolata', 'peynir', 'kasar', 'sucuk', 'kizartma'];
/** What a children's version changes: heat, alcohol and whole nuts. */
const KID_UNFRIENDLY = ['pul biber', 'pulbiber', 'aci biber', 'isot', 'aci sos', 'chili', 'jalapeno', 'sarap', 'bira', 'likor', 'konyak', 'ceviz', 'findik', 'fistik'];

/** Whole-word match on folded text; words of 3+ letters may carry a short Turkish suffix ("tavuğu"). */
function hasWord(text: string, word: string): boolean {
  const hay = text.split(/[^a-z0-9]+/).filter(Boolean);
  const needle = word.split(/[^a-z0-9]+/).filter(Boolean);
  for (let i = 0; i + needle.length <= hay.length; i++) {
    const ok = needle.every((w, j) => {
      const h = hay[i + j];
      return h === w || (w.length >= 3 && h.startsWith(w) && h.length - w.length <= 3);
    });
    if (ok) return true;
  }
  return false;
}

function ingredientTexts(recipe: Recipe): string[] {
  return recipe.ingredient_groups.flatMap((g) => g.ingredients.map((i) => searchKey(`${i.name} ${i.original_text}`)));
}

/** Frying the food itself, not just softening onions or garlic in a little oil. */
function fries(recipe: Recipe): boolean {
  if (hasWord(searchKey(recipe.title), 'kizartma')) return true;
  const deep = /(kizgin|derin|bol|kizartma) yag|fritoz|kizartmak icin/;
  if (ingredientTexts(recipe).some((t) => deep.test(t))) return true;
  return recipe.steps.some((s) => {
    const t = searchKey(s.text);
    if (deep.test(t)) return true;
    return /kizart/.test(t) && !/sogan|sarimsak|salca/.test(t);
  });
}

function usesAirfryer(recipe: Recipe): boolean {
  const text = searchKey([recipe.title, ...recipe.equipment, ...recipe.steps.map((s) => s.text)].join(' '));
  return /air ?fryer|airfrayer/.test(text);
}

function usesOven(recipe: Recipe): boolean {
  const text = searchKey([recipe.title, ...recipe.equipment, ...recipe.steps.map((s) => s.text)].join(' '));
  if (/firin(?!siz)/.test(text)) return true;
  // A temperature on a step that is not frying or airfryer is an oven temperature.
  return recipe.steps.some((s) => s.temperature_c != null && !/yag|kizart|air ?fryer/.test(searchKey(s.text)));
}

function hasMeatOrFish(recipe: Recipe): boolean {
  return ingredientTexts(recipe).some((t) => !NOT_MEAT.some((w) => hasWord(t, w)) && MEAT_FISH.some((w) => hasWord(t, w)));
}

/**
 * The adaptations that make sense for this recipe, in display order. `applied` stays in the list
 * even when the new version no longer matches its rule (an airfryer version already uses an airfryer).
 */
export function adaptOptions(recipe: Recipe, profile: CookProfile | undefined, applied?: AdaptKind): AdaptOption[] {
  if (recipe.steps.length === 0) return [];
  const oven = usesOven(recipe);
  const airfryer = usesAirfryer(recipe);
  const vegan = profile?.diet.includes('vegan') ?? false;
  const family = profile?.household === 'family' || profile?.household === 'crowd' || (profile?.goals.includes('family') ?? false);
  const texts = ingredientTexts(recipe);
  const minutes = totalMinutes(recipe);

  const fits: Record<AdaptKind, boolean> = {
    airfryer: !airfryer && (oven || fries(recipe)),
    no_oven: oven || airfryer,
    lighter: recipe.category !== 'drink' && (fries(recipe) || texts.some((t) => RICH.some((w) => hasWord(t, w)))),
    vegetarian: !recipe.dietary.includes('vegetarian') && !recipe.dietary.includes('vegan') && hasMeatOrFish(recipe),
    quicker: minutes != null && minutes > 30,
    kid_friendly: family && texts.some((t) => KID_UNFRIENDLY.some((w) => hasWord(t, w))),
  };
  const labels: Record<AdaptKind, string> = {
    airfryer: 'Airfryer’a çevir',
    no_oven: 'Fırınsız yap',
    lighter: 'Daha hafif',
    vegetarian: vegan ? 'Vegan yap' : 'Vejetaryen yap',
    quicker: 'Daha pratik',
    kid_friendly: 'Çocuklar için',
  };
  const order: AdaptKind[] = ['airfryer', 'no_oven', 'lighter', 'vegetarian', 'quicker', 'kid_friendly'];
  return order.filter((k) => fits[k] || k === applied).map((kind) => ({ kind, label: labels[kind] }));
}

/** Toast text for a failed adaptation; `retry` is false when trying again cannot help. */
export function describeAdaptError(err: unknown): { title: string; message: string; retry: boolean } {
  const code = err instanceof ApiError ? err.code : 'UNKNOWN';
  switch (code) {
    case 'ADAPT_NOT_POSSIBLE':
      return { title: 'Bu tarife uymuyor', message: err instanceof Error ? err.message : 'Bu uyarlama bu tarif için uygun değil.', retry: false };
    case 'ADAPT_UNSAFE':
      return { title: 'Uygun bir sürüm çıkmadı', message: 'Alerji ve beslenme tercihlerine uymayan bir şey çıktı, kaydetmedik.', retry: true };
    case 'RECIPE_AGENT_ERROR':
    case 'RECIPE_AGENT_AUTH_FAILED':
      return { title: 'Tarif uyarlanamadı', message: 'Yapay zeka şu an tarifi uyarlayamadı.', retry: true };
    case 'ASSISTANT_NOT_CONFIGURED':
    case 'RECIPE_AGENT_NOT_CONFIGURED':
      return { title: 'Uyarlama şu an kapalı', message: 'Sunucuda yapay zeka ayarlı değil.', retry: false };
    default: {
      const { title, message } = describeError(err);
      return { title, message, retry: code !== 'RECIPE_NOT_FOUND' };
    }
  }
}
