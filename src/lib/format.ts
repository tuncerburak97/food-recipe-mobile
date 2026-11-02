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
  oz: 'oz',
  lb: 'lb',
  fl_oz: 'fl oz',
  pint: 'pint',
  quart: 'quart',
  other: '',
};

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.50': '½', '0.75': '¾', '0.33': '⅓', '0.67': '⅔' }; // keys match toFixed(2)

function formatNumber(n: number): string {
  const whole = Math.floor(n);
  const frac = (n - whole).toFixed(2);
  if (FRACTIONS[frac]) return whole > 0 ? `${whole}${FRACTIONS[frac]}` : FRACTIONS[frac];
  return Number.isInteger(n) ? String(n) : n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
}

/** "500 gr", "2–3 yemek kaşığı", "½ su bardağı" or "Damak zevkine göre". */
export function formatAmount(ing: Ingredient): string {
  if (ing.quantity == null) {
    if (ing.unit_text) return ing.unit_text;
    return ing.to_taste ? 'Göz kararı' : '';
  }
  const qty =
    ing.quantity_max != null ? `${formatNumber(ing.quantity)}–${formatNumber(ing.quantity_max)}` : formatNumber(ing.quantity);
  const unit = ing.unit && ing.unit !== 'other' ? UNIT_LABELS[ing.unit] : (ing.unit_text ?? '');
  return unit ? `${qty} ${unit}` : qty;
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
