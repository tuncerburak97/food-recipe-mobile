// Text helpers for voice: folding what the recognizer heard, Turkish numbers and durations, and
// turning app text into something a speech voice reads well. Pure TypeScript (no React Native).

import { searchKey } from '@/lib/format';

/** Lowercased and accent-folded: "Un ne kadardı?" -> "un ne kadardi?". */
export function fold(s: string): string {
  return (
    searchKey(s)
      // "İ" lowercases to "i" + a combining dot where the engine ignores the Turkish locale.
      .replace(/̇/g, '')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/û/g, 'u')
  );
}

/** Folded words without punctuation: "10'luk zamanlayıcı kur." -> ["10luk", "zamanlayici", "kur"]. */
export function words(s: string): string[] {
  return fold(s)
    .replace(/['’`]/g, '')
    .replace(/(\d)[.,](\d)/g, '$1#$2')
    .replace(/[^a-z0-9#]+/g, ' ')
    .replace(/#/g, '.')
    .split(' ')
    .filter(Boolean);
}

/** True when `seq` appears in `tokens` as consecutive words. */
export function hasSeq(tokens: string[], seq: string[]): boolean {
  for (let i = 0; i + seq.length <= tokens.length; i++) {
    if (seq.every((w, j) => tokens[i + j] === w)) return true;
  }
  return false;
}

// ---- numbers ----

const ONES: Record<string, number> = { bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9 };
const TENS: Record<string, number> = { on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90 };

export const ORDINALS: Record<string, number> = {
  ilk: 1,
  birinci: 1,
  ikinci: 2,
  ucuncu: 3,
  dorduncu: 4,
  besinci: 5,
  altinci: 6,
  yedinci: 7,
  sekizinci: 8,
  dokuzuncu: 9,
  onuncu: 10,
};

type TimeUnit = 'sec' | 'min' | 'hour';
const UNIT_MINUTES: Record<TimeUnit, number> = { sec: 1 / 60, min: 1, hour: 60 };

/** "dakika", "dakikalik", "dk" -> min; "saat", "saatlik" -> hour; "saniye", "sn" -> sec. */
export function timeUnit(token: string | undefined): TimeUnit | null {
  if (!token) return null;
  if (/^(dakika|dakka|dk$|dkl)/.test(token)) return 'min';
  if (/^saat/.test(token)) return 'hour';
  if (/^(saniye|sn$)/.test(token)) return 'sec';
  return null;
}

/**
 * Reads a number starting at tokens[i]: "15", "1.5", "on bes", "iki bucuk", "yarim", "ceyrek".
 * A unit glued to digits ("10dk") is returned too. `end` is the index after the number.
 */
export function readNumber(tokens: string[], i: number): { value: number; end: number; unit?: TimeUnit } | null {
  const first = tokens[i];
  if (first == null) return null;
  const digits = /^(\d+(?:\.\d+)?)([a-z]*)$/.exec(first);
  if (digits) {
    let value = Number(digits[1]);
    let end = i + 1;
    if (tokens[end] === 'bucuk') {
      value += 0.5;
      end += 1;
    }
    const unit = timeUnit(digits[2]) ?? undefined;
    return { value, end, unit };
  }
  if (first === 'yarim') return { value: 0.5, end: i + 1 };
  if (first === 'ceyrek') return { value: 0.25, end: i + 1 };

  let j = i;
  let value = 0;
  if (tokens[j] === 'yuz') {
    value += 100;
    j += 1;
  }
  if (TENS[tokens[j]] != null) {
    value += TENS[tokens[j]];
    j += 1;
  }
  if (ONES[tokens[j]] != null) {
    value += ONES[tokens[j]];
    j += 1;
  }
  if (j === i) return null;
  if (tokens[j] === 'bucuk') {
    value += 0.5;
    j += 1;
  }
  return { value, end: j };
}

/**
 * A spoken duration in minutes: "10 dakika", "on bes dakikaya", "yarim saat", "1 saat 20 dakika",
 * "45 saniye". A number without a unit ("10a kur") comes back with `bare: true`.
 */
export function readDuration(tokens: string[]): { minutes: number; bare: boolean } | null {
  let total = 0;
  let found = false;
  let bare: number | null = null;
  for (let i = 0; i < tokens.length; ) {
    const n = readNumber(tokens, i);
    if (!n) {
      i += 1;
      continue;
    }
    const unit = n.unit ?? timeUnit(tokens[n.end]);
    if (unit) {
      total += n.value * UNIT_MINUTES[unit];
      found = true;
      i = n.unit ? n.end : n.end + 1;
      continue;
    }
    if (bare == null) bare = n.value;
    i = n.end;
  }
  if (found && total > 0) return { minutes: Math.round(total * 600) / 600, bare: false };
  if (bare != null && bare > 0) return { minutes: bare, bare: true };
  return null;
}

// ---- speaking ----

/** 10 -> "10 dakika", 0.5 -> "30 saniye", 90 -> "1 saat 30 dakika". */
export function spokenDuration(minutes: number): string {
  return spokenClock(Math.round(minutes * 60) * 1000);
}

/** Milliseconds in words: 252000 -> "4 dakika 12 saniye". */
export function spokenClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h} saat`);
  if (m) parts.push(`${m} dakika`);
  if (s && !h) parts.push(`${s} saniye`);
  return parts.length ? parts.join(' ') : '0 saniye';
}

/** 0.5 -> "yarım", 1.5 -> "1 buçuk", 0.25 -> "çeyrek", 2 -> "2". */
export function spokenNumber(n: number): string {
  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 100) / 100;
  const prefix = whole > 0 ? `${whole} ` : '';
  if (frac === 0) return String(whole);
  if (frac === 0.5) return whole > 0 ? `${whole} buçuk` : 'yarım';
  if (frac === 0.25) return `${prefix}çeyrek`;
  if (frac === 0.75) return `${prefix}üç çeyrek`;
  if (frac === 0.33) return `${prefix}üçte bir`;
  if (frac === 0.67) return `${prefix}üçte iki`;
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

const FRACTION_WORDS: Record<string, string> = { '½': 'buçuk', '¼': 'çeyrek', '¾': 'üç çeyrek', '⅓': 'üçte bir', '⅔': 'üçte iki' };

/** Reply text without markdown, list marks or emoji, on one line: for the screen and for speech. */
export function plain(text: string): string {
  return text
    .replace(/\*\*|__|`|#+\s/g, '')
    .replace(/^\s*[-•*]\s+/gm, '')
    .replace(/([^.!?:;,\s])\s*\n+/g, '$1. ')
    .replace(/\n+/g, ' ')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "Evet, olur. Biraz su ekle." -> ["Evet, olur.", "Biraz su ekle."] */
export function firstSentence(text: string): [string, string] {
  const first = /^[^.!?]+[.!?]*/.exec(text)?.[0] ?? text;
  return [first.trim(), text.slice(first.length).trim()];
}

/**
 * App text made easy for a speech voice: units and symbols in words, no markdown, no emoji.
 * "Fırını 180°C'ye ısıt, 2–3 dk." -> "Fırını 180 dereceye ısıt, 2 ila 3 dakika."
 */
export function toSpeech(text: string): string {
  return (
    plain(text)
      .replace(/[“”"«»]/g, '')
      .replace(/(\d)\s*°\s*C?['’]?/g, '$1 derece')
      .replace(/(\d)([½¼¾⅓⅔])/g, (_, d: string, f: string) => `${d} ${f === '½' ? 'buçuk' : FRACTION_WORDS[f]}`)
      .replace(/½/g, 'yarım')
      .replace(/[¼¾⅓⅔]/g, (f) => FRACTION_WORDS[f])
      .replace(/(\d)\s*[-–—]\s*(\d)/g, '$1 ila $2')
      .replace(/(\d)\s*(dk|dak)\.?(?![a-zçğıöşü])/gi, '$1 dakika')
      .replace(/(\d)\s*sn\.?(?![a-zçğıöşü])/gi, '$1 saniye')
      .replace(/(\d)\s*(gr|g)\.?(?![a-zçğıöşü])/gi, '$1 gram')
      .replace(/(\d)\s*kg\.?(?![a-zçğıöşü])/gi, '$1 kilo')
      .replace(/(\d)\s*ml\.?(?![a-zçğıöşü])/gi, '$1 mililitre')
      .replace(/(\d)\s*(lt|l)\.?(?![a-zçğıöşü])/gi, '$1 litre')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/** The first sentences of a reply, up to about `max` characters (always at least one sentence). */
export function brief(text: string, max = 240): string {
  const clean = toSpeech(text);
  const sentences = clean.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  let out = '';
  for (const s of sentences) {
    if (out && out.length + s.length + 1 > max) break;
    out = out ? `${out} ${s}` : s;
  }
  if (!out) return clean.slice(0, max);
  return out.length > max * 1.6 ? `${out.slice(0, max).trimEnd()}…` : out;
}
