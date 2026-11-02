// What the voice says for each cook mode page. Pure TypeScript.

import { ingredientCount, isEstimated } from '@/lib/format';
import type { Recipe } from '@/lib/types';

import { fold, spokenDuration } from './text';

/** Spoken on first use, so the cook learns the words without reading anything. */
export const INTRO_LINE = 'Sesli komutlar açık. “Sonraki”, “tekrar” ya da “10 dakika kur” diyebilirsin.';

/**
 * The page read aloud: page 0 = ingredients, 1..n = steps, n + 1 = finished. `teachTimer` adds
 * how to start the step's timer (said once per session, on the first timed step); `listening:
 * false` (read aloud only) leaves out what to say.
 */
export function pageLine(recipe: Recipe, page: number, opts: { teachTimer?: boolean; listening?: boolean } = {}): string {
  const total = recipe.steps.length;
  if (page <= 0) {
    const count = ingredientCount(recipe);
    const what = count ? `${count} malzeme var.` : '';
    const next = opts.listening === false ? '' : 'Hazır olunca “başla” de.';
    return `Önce malzemeleri hazırlayalım. ${what} ${next}`.replace(/\s+/g, ' ').trim();
  }
  if (page > total) return 'Tebrikler, tarif tamam. Afiyet olsun.';

  const step = recipe.steps[page - 1];
  const head = page === total && total > 1 ? 'Son adım.' : `Adım ${page}.`;
  const parts = [head, step.text.trim()];
  const minutes = step.duration_minutes ?? 0;
  const text = fold(step.text);
  if (minutes > 0 && !/(dakika|\bdk\b|saat|saniye)/.test(text)) {
    parts.push(`${isEstimated(recipe, 'step_durations') ? 'Yaklaşık ' : ''}${spokenDuration(minutes)} sürer.`);
  }
  if (step.temperature_c != null && !/(derece|°)/.test(text)) parts.push(`${step.temperature_c} derece.`);
  if (minutes > 0 && opts.teachTimer) parts.push('Zamanlayıcı için “zamanlayıcı kur” de.');
  return parts.map((p) => (/[.!?…:]$/.test(p) ? p : `${p}.`)).join(' ');
}
