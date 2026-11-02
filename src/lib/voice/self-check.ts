// Self-check for the voice parser and answers (the app has no test runner).
// Run: node src/lib/voice/run-self-check.mjs

import type { Ingredient, IngredientGroup, Recipe } from '@/lib/types';

import { parseCommand, type VoiceCommand } from './commands';
import { amountAnswer, findIngredients, ingredientsLine } from './ingredients';
import { pageLine } from './lines';
import { brief, firstSentence, plain, readDuration, spokenClock, spokenDuration, toSpeech, words } from './text';

type Expect = Partial<VoiceCommand> & { kind: VoiceCommand['kind'] };

const COMMANDS: [string, Expect, { expectMinutes?: boolean }?][] = [
  // next
  ['Sonraki', { kind: 'next' }],
  ['sonraki adıma geç', { kind: 'next' }],
  ['bir sonraki adım', { kind: 'next' }],
  ['Devam et.', { kind: 'next' }],
  ['devam edelim', { kind: 'next' }],
  ['geç', { kind: 'next' }],
  ['Tamam', { kind: 'next' }],
  ['bitti', { kind: 'next' }],
  ['Tamamladım', { kind: 'next' }],
  ['TAMAMLADIM', { kind: 'next' }],
  ['hadi başlayalım', { kind: 'next' }],
  ['sonra ki', { kind: 'next' }],
  // previous
  ['önceki', { kind: 'previous' }],
  ['Önceki adım', { kind: 'previous' }],
  ['onceki', { kind: 'previous' }],
  ['geri', { kind: 'previous' }],
  ['geri dön', { kind: 'previous' }],
  ['bir önceki adıma dön', { kind: 'previous' }],
  // repeat
  ['tekrar', { kind: 'repeat' }],
  ['Tekrarla', { kind: 'repeat' }],
  ['bir daha', { kind: 'repeat' }],
  ['bir daha oku', { kind: 'repeat' }],
  ['ne diyordu', { kind: 'repeat' }],
  ['Ne diyordu?', { kind: 'repeat' }],
  ['tekrar eder misin', { kind: 'repeat' }],
  ['adımı oku', { kind: 'repeat' }],
  ['anlamadım', { kind: 'repeat' }],
  ['Okur musun?', { kind: 'repeat' }],
  ['Sıradaki', { kind: 'next' }],
  ['Sonraki adım lütfen.', { kind: 'next' }],
  ['Kaç gram şeker vardı', { kind: 'amount' }],
  ['Şekerin miktarı ne', { kind: 'amount' }],
  ['zamanlayıcı on dakika', { kind: 'timer', minutes: 10 }],
  ['şimdi 10 dakika pişiriyoruz', { kind: 'unknown' }],
  ['10 dakika fırında kalsın', { kind: 'unknown' }],
  // stop
  ['sus', { kind: 'stop' }],
  ['Dur', { kind: 'stop' }],
  ['tamam sus', { kind: 'stop' }],
  ['yeter', { kind: 'stop' }],
  ['sesi kes', { kind: 'stop' }],
  ['bir dakika', { kind: 'stop' }],
  // off
  ['sesli komutları kapat', { kind: 'off' }],
  ['sesi kapat', { kind: 'off' }],
  ['mikrofonu kapat', { kind: 'off' }],
  ['dinlemeyi bırak', { kind: 'off' }],
  ['beni dinleme artık', { kind: 'off' }],
  // timer
  ['10 dakika kur', { kind: 'timer', minutes: 10 }],
  ['on dakika kur', { kind: 'timer', minutes: 10 }],
  ['On beş dakika kur', { kind: 'timer', minutes: 15 }],
  ['15 dk kur', { kind: 'timer', minutes: 15 }],
  ['yirmi beş dakikalık zamanlayıcı kur', { kind: 'timer', minutes: 25 }],
  ['zamanlayıcıyı 10 dakikaya kur', { kind: 'timer', minutes: 10 }],
  ["zamanlayıcıyı 10'a kur", { kind: 'timer', minutes: 10 }],
  ['yarım saat kur', { kind: 'timer', minutes: 30 }],
  ['bir saat kur', { kind: 'timer', minutes: 60 }],
  ['bir buçuk saat kur', { kind: 'timer', minutes: 90 }],
  ['1 saat 20 dakika kur', { kind: 'timer', minutes: 80 }],
  ['çeyrek saat kur', { kind: 'timer', minutes: 15 }],
  ['beş dakika say', { kind: 'timer', minutes: 5 }],
  ['iki dakika ayarla', { kind: 'timer', minutes: 2 }],
  ['30 saniye kur', { kind: 'timer', minutes: 0.5 }],
  ['10 dakika sonra haber ver', { kind: 'timer', minutes: 10 }],
  ['on dakika', { kind: 'timer', minutes: 10 }],
  ['zamanlayıcı kur', { kind: 'timer', minutes: null }],
  ['Zamanlayıcıyı başlat', { kind: 'timer', minutes: null }],
  ['zaman layıcı kur', { kind: 'timer', minutes: null }],
  ['beş', { kind: 'timer', minutes: 5 }, { expectMinutes: true }],
  ['12', { kind: 'timer', minutes: 12 }, { expectMinutes: true }],
  ['bir dakika', { kind: 'timer', minutes: 1 }, { expectMinutes: true }],
  ['bir dakika daha', { kind: 'timerAdd', minutes: 1 }],
  ['5 dakika ekle', { kind: 'timerAdd', minutes: 5 }],
  ['ne kadar kaldı', { kind: 'timerLeft' }],
  ['kaç dakika kaldı', { kind: 'timerLeft' }],
  ['süre ne kadar', { kind: 'timerLeft' }],
  ['zamanlayıcıyı durdur', { kind: 'timerPause' }],
  ['zamanlayıcıyı iptal et', { kind: 'timerCancel' }],
  ['alarmı kapat', { kind: 'timerCancel' }],
  // goto
  ['3. adıma git', { kind: 'goto', to: 3 }],
  ['adım üç', { kind: 'goto', to: 3 }],
  ['üçüncü adıma geç', { kind: 'goto', to: 3 }],
  ['ilk adım', { kind: 'goto', to: 1 }],
  ['son adıma git', { kind: 'goto', to: 'last' }],
  ['malzemelere dön', { kind: 'goto', to: 'ingredients' }],
  ['atla', { kind: 'skip' }],
  // ingredients and amounts
  ['malzemeler neler', { kind: 'ingredients' }],
  ['malzemeleri oku', { kind: 'ingredients' }],
  ['un ne kadardı?', { kind: 'amount' }],
  ['Un ne kadardı', { kind: 'amount' }],
  ['kaç gram şeker', { kind: 'amount' }],
  ['ne kadar tuz koyuyorduk', { kind: 'amount' }],
  ['kaç yumurta', { kind: 'amount' }],
  ['şeker kaç kaşık', { kind: 'amount' }],
  // questions
  ['tuz yerine ne kullanabilirim', { kind: 'question' }],
  ['bunu fırında yapabilir miyim', { kind: 'question' }],
  ['ne kadar sürer', { kind: 'question' }],
  ['fırını kaç dereceye ayarlayayım', { kind: 'question' }],
  ['kaç kişilik', { kind: 'question' }],
  ['hazır mı', { kind: 'question' }],
  ['yerine yoğurt koysam olur', { kind: 'question' }],
  // ignored chatter
  ['', { kind: 'unknown' }],
  ['evet', { kind: 'unknown' }],
  ['tamam kızım geliyorum birazdan', { kind: 'unknown' }],
  ['şimdi soğanları ekliyoruz ve güzelce karıştırıyoruz', { kind: 'unknown' }],
  ['beş', { kind: 'unknown' }],
];

const ing = (name: string, quantity: number | null, unit: Ingredient['unit'], extra: Partial<Ingredient> = {}): Ingredient => ({
  name,
  original_text: name,
  quantity,
  quantity_max: null,
  unit,
  unit_text: null,
  preparation: null,
  optional: false,
  to_taste: false,
  notes: null,
  ...extra,
});

const group = (id: string, name: string, ingredients: Ingredient[]): IngredientGroup => ({ id, name, component: name, source: 'author', ingredients });

const RECIPE = {
  title: 'Kakaolu kek',
  steps: [
    { order: 1, text: 'Yumurta ve şekeri çırpın.', group_id: 'kek', duration_minutes: 5, temperature_c: null, heat: null },
    { order: 2, text: 'Fırında pişirin.', group_id: 'kek', duration_minutes: 35, temperature_c: 180, heat: null },
    { order: 3, text: 'Sosu kaynatın.', group_id: 'sos', duration_minutes: null, temperature_c: null, heat: null },
  ],
  estimated: [],
  ingredient_groups: [
    group('kek', 'Kek', [
      ing('Un', 3, 'water_glass'),
      ing('Toz şeker', 1.5, 'water_glass'),
      ing('Yumurta', 3, 'piece'),
      ing('Zeytinyağı', 0.5, 'tea_glass'),
      ing('Kabartma tozu', 1, 'pack'),
      ing('Tuz', null, null, { to_taste: true }),
      ing('Su', 1, 'water_glass'),
    ]),
    group('sos', 'Sos için', [ing('Un', 2, 'tbsp'), ing('Pudra şekeri', 2, 'tbsp', { quantity_max: 3 }), ing('Kabak', 1, 'piece')]),
  ],
} as unknown as Recipe;

/** Returns the failures; empty means all good. */
export function runSelfCheck(): string[] {
  const fails: string[] = [];
  const eq = (label: string, got: unknown, want: unknown) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`${label}\n    got:  ${JSON.stringify(got)}\n    want: ${JSON.stringify(want)}`);
  };

  for (const [text, want, opts] of COMMANDS) {
    const got = parseCommand(text, opts);
    const picked = Object.fromEntries(Object.keys(want).map((k) => [k, (got as Record<string, unknown>)[k]]));
    eq(`parse "${text}"${opts?.expectMinutes ? ' (expecting minutes)' : ''}`, picked, want);
  }

  eq('words', words("10'luk Zamanlayıcı KUR, İki şey."), ['10luk', 'zamanlayici', 'kur', 'iki', 'sey']);
  eq('duration 1,5 saat', readDuration(words('1,5 saat')), { minutes: 90, bare: false });
  eq('spoken 10', spokenDuration(10), '10 dakika');
  eq('spoken 0.5', spokenDuration(0.5), '30 saniye');
  eq('spoken 90', spokenDuration(90), '1 saat 30 dakika');
  eq('clock', spokenClock(252_000), '4 dakika 12 saniye');
  eq('speech', toSpeech('Fırını 180°C’ye ısıt, 2–3 dk pişir. ½ su bardağı, 1½ kaşık, 200 gr un.'), 'Fırını 180 dereceye ısıt, 2 ila 3 dakika pişir. yarım su bardağı, 1 buçuk kaşık, 200 gram un.');
  eq('speech markdown', toSpeech('**Evet**, olur:\n- az tuz\n- biraz su'), 'Evet, olur: az tuz. biraz su');
  eq('plain', plain('**Evet**, olur:\n- az tuz\n- biraz su 🙂'), 'Evet, olur: az tuz. biraz su');
  eq('first sentence', firstSentence('Evet, olur. Biraz su ekle.'), ['Evet, olur.', 'Biraz su ekle.']);
  eq('brief', brief('Birinci cümle. İkinci cümle biraz daha uzun. Üçüncü.', 30), 'Birinci cümle.');

  const names = (text: string, groupId?: string) => findIngredients(RECIPE, text, groupId).map((h) => `${h.group.id}:${h.ingredient.name}`);
  eq('find un', names('un ne kadardı'), ['kek:Un', 'sos:Un']);
  eq('find un in sos step', names('unu ne kadar koyuyorduk', 'sos'), ['sos:Un', 'kek:Un']);
  eq('find şeker (partial)', names('kaç gram şeker'), ['kek:Toz şeker', 'sos:Pudra şekeri']);
  eq('find toz şeker (full)', names('toz şeker ne kadar'), ['kek:Toz şeker']);
  eq('find zeytin yağı', names('zeytin yağı ne kadar'), ['kek:Zeytinyağı']);
  eq('find su bardağı is a measure', names('kaç su bardağı un'), ['kek:Un', 'sos:Un']);
  eq('find yumurtayı', names('kaç tane yumurta'), ['kek:Yumurta']);
  eq('find kabağı (soft k)', names('kabağı ne kadar'), ['sos:Kabak']);
  eq('find nothing', names('tavuk ne kadar'), []);
  eq('find no false "un"', names('unuttum ne kadardı'), []);

  eq('answer un', amountAnswer(RECIPE, 'un ne kadardı')?.spoken, 'Kek için 3 su bardağı un, sos için 2 yemek kaşığı un.');
  eq('answer yumurta', amountAnswer(RECIPE, 'kaç yumurta'), { spoken: '3 adet yumurta.', lines: ['Yumurta: 3 adet'] });
  eq('answer toz şeker', amountAnswer(RECIPE, 'toz şeker ne kadar')?.spoken, '1 buçuk su bardağı toz şeker.');
  eq('answer tuz', amountAnswer(RECIPE, 'tuz ne kadar')?.spoken, 'Tuz göz kararı.');
  eq('answer pudra', amountAnswer(RECIPE, 'pudra şekeri ne kadar')?.spoken, '2 ila 3 yemek kaşığı pudra şekeri.');
  eq('answer zeytinyağı', amountAnswer(RECIPE, 'zeytinyağı ne kadar')?.spoken, 'Yarım çay bardağı zeytinyağı.');
  eq('ingredients line', ingredientsLine(RECIPE).startsWith('10 malzeme var. Kek için: 3 su bardağı un, 1 buçuk su bardağı toz şeker'), true);

  eq('page 0', pageLine(RECIPE, 0), 'Önce malzemeleri hazırlayalım. 10 malzeme var. Hazır olunca “başla” de.');
  eq('page 0 read only', pageLine(RECIPE, 0, { listening: false }), 'Önce malzemeleri hazırlayalım. 10 malzeme var.');
  eq('page 1', pageLine(RECIPE, 1, { teachTimer: true }), 'Adım 1. Yumurta ve şekeri çırpın. 5 dakika sürer. Zamanlayıcı için “zamanlayıcı kur” de.');
  eq('page 2', pageLine(RECIPE, 2), 'Adım 2. Fırında pişirin. 35 dakika sürer. 180 derece.');
  eq('page last', pageLine(RECIPE, 3), 'Son adım. Sosu kaynatın.');
  eq('page done', pageLine(RECIPE, 4), 'Tebrikler, tarif tamam. Afiyet olsun.');
  return fails;
}
