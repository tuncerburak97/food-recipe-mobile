import type { Category, Difficulty, EstimatedKey, Heat, Ingredient, Recipe, Step, Unit } from '@/lib/types';

export const CATEGORY_LABELS: Record<Category, string> = {
  breakfast: 'Kahvaltı',
  soup: 'Çorba',
  salad: 'Salata',
  main: 'Ana yemek',
  side: 'Garnitür',
  appetizer: 'Meze',
  pasta: 'Makarna',
  rice: 'Pilav',
  bread: 'Ekmek',
  pastry: 'Hamur işi',
  dessert: 'Tatlı',
  snack: 'Atıştırmalık',
  sauce: 'Sos',
  drink: 'İçecek',
  other: 'Diğer',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Kolay',
  medium: 'Orta',
  hard: 'Zor',
};

export const HEAT_LABELS: Record<Heat, string> = {
  low: 'Kısık ateş',
  medium_low: 'Orta-kısık ateş',
  medium: 'Orta ateş',
  medium_high: 'Orta-yüksek ateş',
  high: 'Yüksek ateş',
};

export const DIETARY_LABELS: Record<string, string> = {
  vegetarian: 'Vejetaryen',
  vegan: 'Vegan',
  gluten_free: 'Glutensiz',
  dairy_free: 'Laktozsuz',
  contains_pork: 'Domuz eti içerir',
  contains_alcohol: 'Alkol içerir',
  contains_nuts: 'Kuruyemiş içerir',
  contains_seafood: 'Deniz ürünü içerir',
  high_protein: 'Yüksek protein',
};

const UNIT_LABELS: Record<Unit, string> = {
  g: 'gr',
  kg: 'kg',
  mg: 'mg',
  ml: 'ml',
  l: 'lt',
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
  // Imperial units are converted (see toMetric); these are only seen without a quantity.
  oz: 'ons',
  lb: 'libre',
  fl_oz: 'sıvı ons',
  pint: 'pint',
  quart: 'quart',
  other: '',
};

/**
 * Imperial measures as a Turkish kitchen measures them: grams and millilitres. Newer recipes are
 * converted by the backend already; this keeps older or missed ones readable ("8 oz" -> "230 gr").
 */
const METRIC: Partial<Record<Unit, { unit: 'g' | 'ml'; factor: number }>> = {
  oz: { unit: 'g', factor: 28.35 },
  lb: { unit: 'g', factor: 453.6 },
  fl_oz: { unit: 'ml', factor: 29.57 },
  pint: { unit: 'ml', factor: 473 },
  quart: { unit: 'ml', factor: 946 },
};

function roundMetric(n: number): number {
  if (n < 20) return Math.max(1, Math.round(n));
  if (n < 100) return Math.round(n / 5) * 5;
  return Math.round(n / 10) * 10;
}

function toMetric(ing: Ingredient): Ingredient {
  const m = ing.unit ? METRIC[ing.unit] : undefined;
  if (!m || ing.quantity == null) return ing;
  const max = ing.quantity_max != null ? ing.quantity_max * m.factor : null;
  const big = (max ?? ing.quantity * m.factor) >= 1000;
  const convert = (n: number) => (big ? Math.round(n / 100) / 10 : roundMetric(n));
  return {
    ...ing,
    quantity: convert(ing.quantity * m.factor),
    quantity_max: max != null ? convert(max) : null,
    unit: big ? (m.unit === 'g' ? 'kg' : 'l') : m.unit,
  };
}

/** The unit as a Turkish cook says it. "cup" is a coffee cup (fincan) in Turkish recipes, a cup elsewhere. */
function unitLabel(ing: Ingredient): string {
  if (!ing.unit || ing.unit === 'other') return ing.unit_text ?? '';
  if (ing.unit === 'cup') return /fincan/i.test(ing.unit_text ?? '') ? 'fincan' : 'bardak';
  return UNIT_LABELS[ing.unit];
}

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.50': '½', '0.75': '¾', '0.33': '⅓', '0.67': '⅔' }; // keys match toFixed(2)

function formatNumber(n: number): string {
  const whole = Math.floor(n);
  const frac = (n - whole).toFixed(2);
  if (FRACTIONS[frac]) return whole > 0 ? `${whole}${FRACTIONS[frac]}` : FRACTIONS[frac];
  return Number.isInteger(n) ? String(n) : n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

/** "500 gr", "2–3 yemek kaşığı", "½ su bardağı" or "Göz kararı". */
export function formatAmount(input: Ingredient): string {
  const ing = toMetric(input);
  if (ing.quantity == null) {
    // Without a number the words as written read best ("bir tutam"); translated recipes write them in Turkish.
    const unit = ing.unit_text || unitLabel(ing);
    if (unit) return unit;
    return ing.to_taste ? 'Göz kararı' : '';
  }
  const qty =
    ing.quantity_max != null ? `${formatNumber(ing.quantity)}–${formatNumber(ing.quantity_max)}` : formatNumber(ing.quantity);
  const unit = unitLabel(ing);
  return unit ? `${qty} ${unit}` : qty;
}

/** A moment in the video as a clock: 12.4 -> "0:12", 75 -> "1:15". */
export function videoClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'İngilizce',
  de: 'Almanca',
  fr: 'Fransızca',
  es: 'İspanyolca',
  it: 'İtalyanca',
  pt: 'Portekizce',
  nl: 'Felemenkçe',
  ru: 'Rusça',
  uk: 'Ukraynaca',
  pl: 'Lehçe',
  el: 'Yunanca',
  ar: 'Arapça',
  fa: 'Farsça',
  az: 'Azerice',
  ka: 'Gürcüce',
  hi: 'Hintçe',
  ur: 'Urduca',
  ja: 'Japonca',
  ko: 'Korece',
  zh: 'Çince',
  th: 'Tayca',
  vi: 'Vietnamca',
  id: 'Endonezce',
  sv: 'İsveççe',
  ro: 'Romence',
  bg: 'Bulgarca',
  he: 'İbranice',
};

/**
 * One quiet line for a recipe written from a source in another language:
 * "İngilizce videodan çevrildi · ölçüler Türk mutfağına uyarlandı". Null for Turkish recipes.
 */
export function translatedLine(recipe: Recipe, fromVideo: boolean): string | null {
  const lang = (recipe.language ?? '').trim().toLocaleLowerCase('en-US');
  if (!recipe.is_recipe || !lang || /^(tr|turk|türk)/.test(lang)) return null;
  const code = lang.split(/[-_]/)[0];
  const source = fromVideo ? 'videodan' : 'tariften';
  const name = code.length === 2 ? LANGUAGE_NAMES[code] : undefined;
  return `${name ? `${name} ${source}` : `Yabancı dildeki ${source}`} çevrildi · ölçüler Türk mutfağına uyarlandı`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} saat ${m} dk` : `${h} saat`;
}

export function isEstimated(recipe: Recipe, key: EstimatedKey): boolean {
  return recipe.estimated?.includes(key) ?? false;
}

/** "45 dk", or "yaklaşık 45 dk" when the AI estimated it. */
export function timeLabel(recipe: Recipe): string | null {
  const min = totalMinutes(recipe);
  if (min == null) return null;
  return isEstimated(recipe, 'total_minutes') ? `yaklaşık ${formatMinutes(min)}` : formatMinutes(min);
}

export function servingsLabel(recipe: Recipe): string | null {
  const s = servingsText(recipe);
  if (!s) return null;
  return isEstimated(recipe, 'servings') ? `yaklaşık ${s}` : s;
}

export function difficultyLabel(recipe: Recipe): string | null {
  return recipe.difficulty ? DIFFICULTY_LABELS[recipe.difficulty] : null;
}

/** Short line under a recipe title in lists: "40 dk · 4 kişilik". */
export function metaLine(recipe: Recipe): string {
  const min = totalMinutes(recipe);
  return [min != null ? formatMinutes(min) : null, servingsText(recipe)].filter(Boolean).join(' · ');
}

export function totalMinutes(recipe: Recipe): number | null {
  const t = recipe.times;
  if (t.total_minutes) return t.total_minutes;
  const sum = (t.prep_minutes ?? 0) + (t.cook_minutes ?? 0) + (t.rest_minutes ?? 0);
  return sum > 0 ? sum : null;
}

export function servingsText(recipe: Recipe): string | null {
  if (recipe.servings.amount) return `${formatNumber(recipe.servings.amount)} kişilik`;
  return recipe.servings.text;
}

export function ingredientCount(recipe: Recipe): number {
  return recipe.ingredient_groups.reduce((n, g) => n + g.ingredients.length, 0);
}

/** 15420 -> "15,4B", 482113 -> "482B", 1250000 -> "1,3Mn" */
export function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}Mn`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: n >= 100_000 ? 0 : 1 })}B`;
  return String(n);
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'şimdi';
  if (min < 60) return `${min} dk önce`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} saat önce`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} gün önce`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w} hafta önce`;
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1) : s;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('');
}

/** Lowercased, accent-folded text for search. */
export function searchKey(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/** Time, temperature and heat of a step in plain words: ["yaklaşık 15 dk", "200°C", "Kısık ateş"]. */
export function stepHints(recipe: Recipe, step: Step): string[] {
  const out: string[] = [];
  if (step.duration_minutes != null) {
    const t = formatMinutes(step.duration_minutes);
    out.push(isEstimated(recipe, 'step_durations') ? `yaklaşık ${t}` : t);
  }
  if (step.temperature_c != null) out.push(`${step.temperature_c}°C`);
  if (step.heat) out.push(HEAT_LABELS[step.heat]);
  return out;
}

/** Rounds a scaled amount to something a cook can measure: ¼ steps below 3, halves below 10, whole above. */
function niceAmount(n: number): number {
  if (n < 3) return Math.max(0.25, Math.round(n * 4) / 4);
  if (n < 10) return Math.round(n * 2) / 2;
  return Math.round(n);
}

/** The ingredient with its quantities multiplied by `factor` (used by the servings stepper). */
export function scaleIngredient(ing: Ingredient, factor: number): Ingredient {
  if (factor === 1 || ing.quantity == null) return ing;
  return {
    ...ing,
    quantity: niceAmount(ing.quantity * factor),
    quantity_max: ing.quantity_max != null ? niceAmount(ing.quantity_max * factor) : null,
  };
}

/** Turkish uppercase that does not depend on the JS engine's locale data ("pazartesi" -> "PAZARTESİ"). */
export function upperTr(s: string): string {
  return s.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
}
