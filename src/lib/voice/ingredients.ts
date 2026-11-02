// Answers "un ne kadardı?" from the recipe itself, with no network. Pure TypeScript.

import { formatAmount } from '@/lib/format';
import type { Ingredient, IngredientGroup, Recipe, Unit } from '@/lib/types';

import { fold, spokenNumber, words } from './text';

export interface IngredientHit {
  ingredient: Ingredient;
  group: IngredientGroup;
}

export interface AmountAnswer {
  /** What the voice says: "3 su bardağı un." */
  spoken: string;
  /** What the screen shows, one line per match: "Un: 3 su bardağı". */
  lines: string[];
}

const SPOKEN_UNITS: Record<Unit, string> = {
  g: 'gram',
  kg: 'kilo',
  mg: 'miligram',
  ml: 'mililitre',
  l: 'litre',
  tsp: 'çay kaşığı',
  dessertspoon: 'tatlı kaşığı',
  tbsp: 'yemek kaşığı',
  cup: 'bardak',
  tea_glass: 'çay bardağı',
  water_glass: 'su bardağı',
  bowl: 'kase',
  piece: 'adet',
  clove: 'diş',
  slice: 'dilim',
  pinch: 'tutam',
  handful: 'avuç',
  bunch: 'demet',
  sprig: 'dal',
  leaf: 'yaprak',
  can: 'kutu',
  jar: 'kavanoz',
  pack: 'paket',
  box: 'kutu',
  bottle: 'şişe',
  drop: 'damla',
  stick: 'çubuk',
  cube: 'küp',
  oz: 'ons',
  lb: 'libre',
  fl_oz: 'sıvı ons',
  pint: 'pint',
  quart: 'quart',
  other: '',
};

/** Endings allowed after a short name, so "un" finds "unu" / "undan" but not "unuttum". */
const SHORT_ENDINGS = new Set([
  '', 'i', 'u', 'in', 'un', 'e', 'a', 'den', 'dan', 'ten', 'tan', 'de', 'da', 'yi', 'yu', 'yla', 'yle', 'la',
  'le', 'ler', 'lar', 'leri', 'lari', 'nu', 'ni', 'nun', 'nin', 'ya', 'ye', 'di', 'du', 'ydi', 'ydu',
]);
/** Soft consonants at the end of a stem: "kabak" -> "kabağı", "dolap" -> "dolabı". */
const SOFTEN: Record<string, string> = { k: 'g', p: 'b', t: 'd' };

/** Question and measure words that must not be taken for an ingredient. */
const SKIP_WORDS = new Set([
  'ne', 'kadar', 'kadardi', 'kac', 'miktar', 'miktari', 'gram', 'gr', 'kilo', 'kg', 'ml', 'litre', 'adet', 'tane',
  'kasik', 'kasigi', 'bardak', 'bardagi', 'fincan', 'fincani', 'tutam', 'avuc', 'dilim', 'dis', 'paket', 'kutu',
  'bir', 've', 'ile', 'icin', 'lazim', 'gerekiyor', 'koyuyorduk', 'koyacagim', 'koyuyoruz', 'koymam', 'mi', 'mu',
]);
/** Measure phrases whose first word is also an ingredient: "su bardağı", "çay kaşığı". */
const MEASURE_HEADS = /^(su|cay|tatli|yemek|kahve)$/;
const MEASURE_TAILS = /^(bardag|kasig|fincan)/;

function wordMatches(word: string, name: string): boolean {
  if (word === name) return true;
  const stems = [name];
  const soft = SOFTEN[name.slice(-1)];
  if (soft && name.length > 2) stems.push(name.slice(0, -1) + soft);
  return stems.some((stem) => {
    if (!word.startsWith(stem)) return false;
    const rest = word.slice(stem.length);
    return name.length <= 3 ? SHORT_ENDINGS.has(rest) : rest.length <= 6;
  });
}

/** The words of a question that could name an ingredient ("kaç su bardağı un" -> ["un"]). */
function queryWords(text: string): string[] {
  const tokens = words(text);
  return tokens.filter((t, i) => {
    if (SKIP_WORDS.has(t) || /^\d/.test(t)) return false;
    if (MEASURE_HEADS.test(t) && MEASURE_TAILS.test(tokens[i + 1] ?? '')) return false;
    return true;
  });
}

/**
 * The ingredients the question is about. Full name matches win over partial ones ("toz şeker"
 * beats "şeker" for "toz şeker ne kadar"); a partial match returns every candidate ("şeker" finds
 * "toz şeker" and "pudra şekeri"). The current step's group comes first.
 */
export function findIngredients(recipe: Recipe, text: string, groupId?: string | null): IngredientHit[] {
  const query = queryWords(text);
  if (!query.length) return [];
  const joined = query.join('');
  const scored: { hit: IngredientHit; score: number }[] = [];
  for (const group of recipe.ingredient_groups) {
    for (const ingredient of group.ingredients) {
      const name = words(ingredient.name).filter((w) => w.length > 1 && !SKIP_WORDS.has(w));
      if (!name.length) continue;
      const nameJoined = name.join('');
      // Either side may carry the ending: "şekeri" asked for "şeker", or "şeker" asked for "şekeri".
      const hit = (n: string) => query.some((q) => wordMatches(q, n) || (q.length >= 3 && wordMatches(n, q)));
      let score = name.filter(hit).length / name.length;
      // "zeytin yağı" vs "zeytinyağı".
      if (score < 1 && nameJoined.length >= 4 && (joined.includes(nameJoined) || query.some((q) => wordMatches(q, nameJoined)))) score = 1;
      if (score > 0) scored.push({ hit: { ingredient, group }, score });
    }
  }
  if (!scored.length) return [];
  const best = Math.max(...scored.map((s) => s.score));
  const hits = scored.filter((s) => s.score === best).map((s) => s.hit);
  return groupId ? [...hits.filter((h) => h.group.id === groupId), ...hits.filter((h) => h.group.id !== groupId)] : hits;
}

/** "3 su bardağı", "yarım çay kaşığı", "2 ila 3 adet"; empty when the recipe gives no amount. */
export function spokenAmount(ing: Ingredient): string {
  if (ing.quantity == null) return ing.unit_text ?? '';
  const qty = ing.quantity_max != null ? `${spokenNumber(ing.quantity)} ila ${spokenNumber(ing.quantity_max)}` : spokenNumber(ing.quantity);
  const unit = ing.unit && ing.unit !== 'other' ? SPOKEN_UNITS[ing.unit] : (ing.unit_text ?? '');
  return unit ? `${qty} ${unit}` : qty;
}

function lower(s: string) {
  return s.trim().toLocaleLowerCase('tr-TR');
}

function cap(s: string) {
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}

function forGroup(group: IngredientGroup): string {
  const name = lower(group.name);
  return fold(name).endsWith('icin') ? name : `${name} için`;
}

/** The spoken and shown answer for an amount question, or null when no ingredient matches. */
export function amountAnswer(recipe: Recipe, text: string, groupId?: string | null): AmountAnswer | null {
  const hits = findIngredients(recipe, text, groupId);
  if (!hits.length) return null;
  const groups = new Set(hits.map((h) => h.group.id));
  const byGroup = groups.size > 1 && recipe.ingredient_groups.length > 1;

  const spoken = hits.map(({ ingredient: ing, group }) => {
    const amount = spokenAmount(ing);
    const part = amount ? `${amount} ${lower(ing.name)}` : ing.to_taste ? `${ing.name.trim()} göz kararı` : `${ing.name.trim()} için miktar yazmıyor`;
    return byGroup ? `${forGroup(group)} ${part}` : part;
  });
  const lines = hits.map(({ ingredient: ing, group }) => {
    const amount = formatAmount(ing) || 'Miktar yazmıyor';
    return `${byGroup ? `${group.name.trim()} · ` : ''}${ing.name.trim()}: ${amount}`;
  });
  return { spoken: `${cap(spoken.join(', '))}.`, lines };
}

/** The whole list, for "malzemeler neler": "8 malzeme var. Hamur için: 3 su bardağı un, …". */
export function ingredientsLine(recipe: Recipe): string {
  const groups = recipe.ingredient_groups.filter((g) => g.ingredients.length);
  const count = groups.reduce((n, g) => n + g.ingredients.length, 0);
  if (!count) return 'Bu tarifte malzeme listesi yok.';
  const item = (ing: Ingredient) => {
    const amount = spokenAmount(ing);
    return amount ? `${amount} ${lower(ing.name)}` : lower(ing.name);
  };
  const parts = groups.map((g) => {
    const list = g.ingredients.map(item).join(', ');
    return groups.length > 1 ? `${cap(forGroup(g))}: ${list}.` : `${list}.`;
  });
  return `${count} malzeme var. ${parts.join(' ')}`;
}
