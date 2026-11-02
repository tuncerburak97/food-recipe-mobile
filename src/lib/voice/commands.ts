// Turns one heard sentence into a cook mode command. Pure TypeScript (no React Native), checked by
// `node src/lib/voice/run-self-check.mjs`.
//
// The kitchen is noisy (a reel playing, people talking), so short commands only count when the
// sentence is short and made of command words; long sentences only become questions when they
// sound like one. Everything else is "unknown" and is ignored quietly.

import { hasSeq, ORDINALS, readDuration, readNumber, timeUnit, words } from './text';

export type VoiceCommand =
  | { kind: 'next' }
  | { kind: 'skip' }
  | { kind: 'previous' }
  | { kind: 'repeat' }
  | { kind: 'goto'; to: number | 'last' | 'ingredients' }
  | { kind: 'stop' }
  | { kind: 'off' }
  /** `minutes: null` = use the step's own time. */
  | { kind: 'timer'; minutes: number | null }
  | { kind: 'timerAdd'; minutes: number }
  | { kind: 'timerPause' }
  | { kind: 'timerCancel' }
  | { kind: 'timerLeft' }
  | { kind: 'ingredients' }
  /** "un ne kadardı?": answered from the recipe when the ingredient is found, else asked. */
  | { kind: 'amount'; text: string }
  | { kind: 'question'; text: string }
  | { kind: 'unknown'; text: string };

export interface ParseOptions {
  /** The app just asked "Kaç dakika kurayım?": a bare number is an answer. */
  expectMinutes?: boolean;
}

// Clear command words: they count even with one unrelated word around them.
const NEXT = ['sonraki', 'sonrakine', 'sonrakini', 'siradaki', 'siradakine', 'devam', 'ilerle', 'tamamladim', 'tamamlandi', 'bitirdim', 'hallettim', 'yaptim', 'hazirim', 'basla', 'baslayalim', 'baslayabiliriz', 'gecelim', 'gecebiliriz'];
const PREVIOUS = ['onceki', 'oncekine', 'oncekini', 'geriye'];
const REPEAT = ['tekrar', 'tekrarla', 'tekrarlar', 'tekrarlayalim', 'tekrarlasana', 'neydi', 'anlamadim', 'duyamadim'];
const STOP = ['sus', 'sussana', 'susar', 'sustur', 'yeter', 'sessiz', 'sessizlik', 'durdur'];
const SKIP = ['atla', 'atlayalim', 'atlasana', 'isaretlemeden'];
// Everyday words: they count only when nothing else was said ("tamam" alone, not "tamam geliyorum").
const NEXT_LOOSE = ['tamam', 'tamamdir', 'bitti', 'oldu', 'gec', 'hazir', 'ileri', 'okey', 'ok'];
const PREVIOUS_LOOSE = ['geri'];
const REPEAT_LOOSE = ['yeniden', 'efendim', 'oku', 'okur', 'okusana', 'okuyabilir'];
const STOP_LOOSE = ['dur', 'kes', 'bekle', 'kapat', 'kapa'];

const STOP_PHRASES = [
  ['sesi', 'kes'],
  ['sesini', 'kes'],
];
const REPEAT_PHRASES = [
  ['bir', 'daha'],
  ['ne', 'diyordu'],
  ['ne', 'dedin'],
  ['ne', 'demisti'],
  ['ne', 'diyor'],
  ['ne', 'yaziyor'],
];

const COMMAND_WORDS = new Set([
  ...NEXT,
  ...PREVIOUS,
  ...REPEAT,
  ...STOP,
  ...SKIP,
  ...NEXT_LOOSE,
  ...PREVIOUS_LOOSE,
  ...REPEAT_LOOSE,
  ...STOP_LOOSE,
]);

/** Words that carry no command of their own: "hadi", "lütfen", "bu adımı", "et" (devam et). */
const FILLER = new Set([
  'lutfen', 'hadi', 'haydi', 'simdi', 'evet', 'peki', 'su', 'artik', 'bakalim', 'ya', 'abi', 'abla', 'canim',
  'sef', 'asistan', 'o', 'bu', 'adim', 'adima', 'adimi', 'adimdan', 'bir', 'et', 'edelim', 'ediyorum', 'edin',
  'eder', 'etsene', 'etsin', 'edebilir', 'git', 'gidelim', 'don', 'donelim', 'ama', 'de', 'da', 'ki', 'ben',
  'biz', 'bana', 'soyle', 'soyler', 'misin', 'musun', 'mi', 'mu', 'tane',
]);

const QUESTION_WORDS = new Set(['ne', 'neden', 'niye', 'nicin', 'nasil', 'hangi', 'hangisi', 'kac', 'nerede', 'nereye', 'kim', 'neyle', 'neyi', 'neler', 'nedir']);
/** Question particles (folded): mı, mi, mu, mü and their endings. */
const MARKER = /^(mi|mu)(sin|sun|yim|yum|yiz|yuz|siniz|sunuz|dir|dur|ydi|ydu|ymis|ymus)?$/;
const HELP = /^(soyle|soyler|anlat|acikla|oner|yardim|ogret|bilgi|tavsiye|fikir)/;

const OFF_NOUN = /^(ses|sesi|sesli|dinleme|dinlemeyi|mikrofon|mikrofonu|komut|komutu|komutlar|komutlari)$/;
const OFF_VERB = /^(kapat|kapa$|kapansin|birak|bitir|iptal)/;

const TIMER_NOUN = /^(zamanlayici|sayac|alarm|timer|kronometre|sure$|sureyi$)/;
const SET_VERB = /^(kur|ayarla|baslat|say$|sayar|saysana|tut$|tutar|tutsana|hatirlat|uyar|haber|calistir|koy$|koyar|koysana)/;
const PAUSE_VERB = /^(durdur|duraklat|beklet|dondur)/;
const CANCEL_VERB = /^(iptal|kapat|kapa$|sil$|sifirla|kaldir|bitir|sustur|kes$)/;
const ADD_WORD = /^(daha|ekle|uzat|ilave)/;
const LEFT_WORD = /^kal(di|mis)/;

/** Words after "kaç" / "ne kadar" that make it a time or servings question, not an amount. */
const NOT_AMOUNT_AFTER_KAC = /^(kisilik|kisi|dakika|dk|saat|saniye|derece|adim|kalori|porsiyon|gun)/;
const NOT_AMOUNT_AFTER_KADAR = /^(sur|pis|kayna|bekle|zaman|sure|dinlen|kizar|kavur|demlen|mayala)/;

/** Joins words a recognizer sometimes splits: "sonra ki" -> "sonraki", "zaman layıcı" -> "zamanlayıcı". */
function mend(tokens: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (b && ((a === 'sonra' && b === 'ki') || (a === 'once' && b === 'ki') || (a === 'zaman' && b.startsWith('layici')))) {
      out.push(a + b);
      i += 1;
    } else {
      out.push(a);
    }
  }
  return out;
}

function isMarker(t: string) {
  return MARKER.test(t);
}

/**
 * True when the sentence is a short command made of these words. Clear words allow one unrelated
 * word around them ("sonraki gelsin"); everyday words need the sentence to be only that ("tamam").
 */
function short(tokens: string[], clear: string[], loose: string[], phrases: string[][] = []): boolean {
  const meaningful = tokens.filter((t) => !FILLER.has(t) && !isMarker(t));
  const hitPhrases = phrases.filter((p) => hasSeq(tokens, p));
  const inPhrase = new Set(hitPhrases.flat());
  if (meaningful.filter((t) => !inPhrase.has(t)).length > 4) return false;
  const hitClear = hitPhrases.length > 0 || meaningful.some((t) => clear.includes(t));
  const hitLoose = meaningful.some((t) => loose.includes(t));
  if (!hitClear && !hitLoose) return false;
  const others = meaningful.filter((t) => !COMMAND_WORDS.has(t) && !inPhrase.has(t));
  return hitClear ? others.length <= 1 : others.length === 0;
}

/** Only numbers, time units and filler: "on beş dakika", "yarım saat". */
function onlyDuration(tokens: string[]): boolean {
  return tokens.every((t) => FILLER.has(t) || t === 'bucuk' || timeUnit(t) != null || readNumber([t], 0) != null);
}

function asksQuestion(tokens: string[], raw: string): boolean {
  return raw.includes('?') || tokens.some((t) => QUESTION_WORDS.has(t) || isMarker(t));
}

function timerCommand(tokens: string[], expectMinutes: boolean): VoiceCommand | null {
  const noun = tokens.some((t) => TIMER_NOUN.test(t));
  const setVerb = tokens.some((t) => SET_VERB.test(t));
  const duration = readDuration(tokens);
  const howMuch = hasSeq(tokens, ['ne', 'kadar']) || tokens.includes('kac') || tokens.includes('durumda');

  if (tokens.some((t) => LEFT_WORD.test(t)) && (noun || howMuch || tokens.some((t) => timeUnit(t) != null) || tokens.length <= 3)) {
    return { kind: 'timerLeft' };
  }
  if (noun) {
    if (howMuch && !setVerb) return { kind: 'timerLeft' };
    if (tokens.some((t) => PAUSE_VERB.test(t))) return { kind: 'timerPause' };
    if (tokens.some((t) => CANCEL_VERB.test(t))) return { kind: 'timerCancel' };
    if (setVerb || duration || tokens.length <= 2 || tokens.includes('devam') || tokens.includes('tekrar')) {
      return { kind: 'timer', minutes: duration?.minutes ?? null };
    }
    return null;
  }
  if (duration && !duration.bare) {
    if (tokens.some((t) => ADD_WORD.test(t)) && !setVerb) return { kind: 'timerAdd', minutes: duration.minutes };
    if (setVerb) return { kind: 'timer', minutes: duration.minutes };
    if (onlyDuration(tokens)) {
      // "Bir dakika!" means "hold on", not a one minute timer.
      if (!expectMinutes && (hasSeq(tokens, ['bir', 'dakika']) || hasSeq(tokens, ['bir', 'saniye']))) return { kind: 'stop' };
      return { kind: 'timer', minutes: duration.minutes };
    }
  }
  if (expectMinutes && duration && onlyDuration(tokens)) return { kind: 'timer', minutes: duration.minutes };
  return null;
}

function gotoCommand(tokens: string[]): VoiceCommand | null {
  if (tokens.some((t) => /^malzemeler(e|in)?$/.test(t)) && tokens.some((t) => /^(don|git|gec|gel|ac$|acsana)/.test(t))) {
    return { kind: 'goto', to: 'ingredients' };
  }
  const at = tokens.findIndex((t) => /^adim/.test(t));
  if (at < 0 || tokens.length > 5 || tokens.includes('geri') || tokens.includes('ileri')) return null;
  const before = tokens[at - 1];
  if (before === 'son') return { kind: 'goto', to: 'last' };
  if (before && ORDINALS[before]) return { kind: 'goto', to: ORDINALS[before] };
  if (before && /^\d+$/.test(before)) return { kind: 'goto', to: Number(before) };
  const after = readNumber(tokens, at + 1);
  if (after && Number.isInteger(after.value) && after.value > 0) return { kind: 'goto', to: after.value };
  return null;
}

function ingredientsCommand(tokens: string[]): boolean {
  if (hasSeq(tokens, ['neler', 'lazim']) || hasSeq(tokens, ['neler', 'gerekiyor'])) return true;
  if (!tokens.some((t) => /^malzeme/.test(t))) return false;
  if (tokens.some((t) => /^(oku|neler|nelerdi|liste|say$|soyle|sirala)/.test(t))) return true;
  return tokens.filter((t) => !FILLER.has(t)).length === 1;
}

function asksAmount(tokens: string[]): boolean {
  if (tokens.includes('kadardi') || tokens.some((t) => /^miktar/.test(t))) return true;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === 'kac' && !NOT_AMOUNT_AFTER_KAC.test(tokens[i + 1] ?? '')) return true;
    if (tokens[i] === 'ne' && tokens[i + 1] === 'kadar' && !NOT_AMOUNT_AFTER_KADAR.test(tokens[i + 2] ?? '')) return true;
  }
  return false;
}

function looksLikeQuestion(tokens: string[], raw: string): boolean {
  if (tokens.length < 2) return false;
  if (asksQuestion(tokens, raw)) return true;
  if (tokens.some((t) => HELP.test(t))) return true;
  if (tokens[0] === 'asistan' || tokens[0] === 'sef') return true;
  // "Yerine yoğurt koysam olur" (no question particle).
  return tokens.length >= 3 && tokens.includes('olur');
}

export function parseCommand(input: string, opts: ParseOptions = {}): VoiceCommand {
  const text = input.trim();
  const tokens = mend(words(text));
  if (!tokens.length) return { kind: 'unknown', text };

  if (
    (tokens.length <= 6 && tokens.some((t) => OFF_NOUN.test(t)) && tokens.some((t) => OFF_VERB.test(t))) ||
    hasSeq(tokens, ['beni', 'dinleme']) ||
    hasSeq(tokens, ['dinlemeyi', 'birak']) ||
    hasSeq(tokens, ['dinlemeyi', 'kes']) ||
    hasSeq(tokens, ['dinlemeyi', 'durdur'])
  ) {
    return { kind: 'off' };
  }

  const timer = timerCommand(tokens, !!opts.expectMinutes);
  if (timer) return timer;

  if (short(tokens, STOP, STOP_LOOSE, STOP_PHRASES)) return { kind: 'stop' };
  if (short(tokens, REPEAT, REPEAT_LOOSE, REPEAT_PHRASES)) return { kind: 'repeat' };

  const goto = gotoCommand(tokens);
  if (goto) return goto;

  if (short(tokens, PREVIOUS, PREVIOUS_LOOSE)) return { kind: 'previous' };
  if (ingredientsCommand(tokens)) return { kind: 'ingredients' };
  if (asksAmount(tokens)) return { kind: 'amount', text };

  if (!asksQuestion(tokens, text)) {
    if (short(tokens, SKIP, [])) return { kind: 'skip' };
    if (short(tokens, NEXT, NEXT_LOOSE)) return { kind: 'next' };
  }

  if (looksLikeQuestion(tokens, text)) return { kind: 'question', text };
  return { kind: 'unknown', text };
}

/** Command words the recognizer should expect (iOS / Android biasing). */
export const COMMAND_HINTS = ['sonraki', 'önceki', 'tekrar', 'devam', 'tamamladım', 'sus', 'dur', 'zamanlayıcı kur', 'dakika kur', 'ne kadar', 'kaç gram'];
