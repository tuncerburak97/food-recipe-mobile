import {
  ALLERGY,
  BUDGET,
  CUISINE,
  DIET,
  EQUIPMENT,
  FREQUENCY,
  GOALS,
  HOUSEHOLD,
  MINUTES,
  SKILL,
  SPICE,
  type CookProfile,
  type Option,
} from '@/lib/profile';

/** Every screen of the onboarding, in order. One route, one state object, internal step index. */
export const STEPS = [
  'hero',
  'name',
  'household',
  'frequency',
  'skill',
  'minutes',
  'diet',
  'allergies',
  'dislikes',
  'cuisines',
  'spice',
  'equipment',
  'goals',
  'budget',
  'preparing',
  'summary',
] as const;

export type StepId = (typeof STEPS)[number];

export const FIRST_QUESTION = STEPS.indexOf('name');
export const LAST_QUESTION = STEPS.indexOf('budget');

export const MAX_DISLIKES = 15;
export const MAX_GOALS = 3;

export type SingleField = 'household' | 'cooking_frequency' | 'skill' | 'weeknight_minutes' | 'spice' | 'budget';
export type MultiField = 'diet' | 'allergies' | 'cuisines' | 'equipment' | 'goals';

export interface StepCopy {
  title: string;
  /** Why we ask, in one line. */
  subtitle: string;
}

export interface SingleQuestion extends StepCopy {
  kind: 'single';
  field: SingleField;
  options: Option<string | number>[];
}

export interface MultiQuestion extends StepCopy {
  kind: 'multi';
  field: MultiField;
  options: Option<string>[];
  /** "Nothing applies" answer that clears the selection. */
  none?: { label: string; hint?: string };
  max?: number;
  /** Reassurance shown above the options. */
  note?: string;
  noteIcon?: 'shield-checkmark' | 'information-circle';
}

export const COPY = {
  name: { title: 'Sana nasıl hitap edelim?', subtitle: 'İstersen boş bırakabilirsin.' },
  dislikes: { title: 'Sevmediğin malzemeler var mı?', subtitle: 'Bunları tariflerinde kullanmayız.' },
} satisfies Record<string, StepCopy>;

export const QUESTIONS: Partial<Record<StepId, SingleQuestion | MultiQuestion>> = {
  household: {
    kind: 'single',
    field: 'household',
    options: HOUSEHOLD,
    title: 'Genellikle kaç kişilik yemek yapıyorsun?',
    subtitle: 'Porsiyonları buna göre ayarlarız.',
  },
  frequency: {
    kind: 'single',
    field: 'cooking_frequency',
    options: FREQUENCY,
    title: 'Ne sıklıkla yemek yaparsın?',
    subtitle: 'Önerileri alışkanlığına göre düzenleriz.',
  },
  skill: {
    kind: 'single',
    field: 'skill',
    options: SKILL,
    title: 'Mutfakta kendini nasıl tanımlarsın?',
    subtitle: 'Tariflerin zorluğunu ve anlatımını buna göre seçeriz.',
  },
  minutes: {
    kind: 'single',
    field: 'weeknight_minutes',
    options: MINUTES,
    title: 'Hafta içi yemeğe genellikle ne kadar vakit ayırırsın?',
    subtitle: 'Bu süreye uygun tarifleri öne çıkarırız.',
  },
  diet: {
    kind: 'multi',
    field: 'diet',
    options: DIET,
    none: { label: 'Özel bir tercihim yok' },
    title: 'Beslenme tercihin var mı?',
    subtitle: 'Birden fazla seçebilirsin. Tarifler bunlara uyar.',
  },
  allergies: {
    kind: 'multi',
    field: 'allergies',
    options: ALLERGY,
    none: { label: 'Alerjim yok' },
    note: 'Her tarif bu listeye göre kontrol edilir; uymayan bir tarif sana gösterilmez.',
    noteIcon: 'shield-checkmark',
    title: 'Alerjin ya da hassasiyetin var mı?',
    subtitle: 'Bu malzemeler tariflerinde kullanılmaz.',
  },
  cuisines: {
    kind: 'multi',
    field: 'cuisines',
    options: CUISINE,
    title: 'Hangi mutfakları seversin?',
    subtitle: 'Önerilerde bunlara öncelik veririz.',
  },
  spice: {
    kind: 'single',
    field: 'spice',
    options: SPICE,
    title: 'Acı tercihin nedir?',
    subtitle: 'Baharat ve biber miktarını buna göre ayarlarız.',
  },
  equipment: {
    kind: 'multi',
    field: 'equipment',
    options: EQUIPMENT,
    none: { label: 'Sadece ocak kullanıyorum' },
    note: 'Ocak her mutfakta var sayılır. Hiçbirini seçmezsen yalnızca ocakta yapılabilen tarifler önerilir.',
    noteIcon: 'information-circle',
    title: 'Mutfağında hangi aletler var?',
    subtitle: 'Tarifler sadece sahip olduğun aletleri kullanır.',
  },
  goals: {
    kind: 'multi',
    field: 'goals',
    options: GOALS,
    max: MAX_GOALS,
    title: 'Önceliğin nedir?',
    subtitle: `En fazla ${MAX_GOALS} tane seçebilirsin.`,
  },
  budget: {
    kind: 'single',
    field: 'budget',
    options: BUDGET,
    title: 'Market bütçen nasıl?',
    subtitle: 'Malzeme önerilerini buna göre yaparız.',
  },
};

function labelsOf<T extends string | number>(options: Option<T>[], values: readonly T[]): string {
  return values
    .map((v) => options.find((o) => o.value === v)?.label)
    .filter(Boolean)
    .join(', ');
}

/** The answers as plain rows for the summary screen ("Kaç kişi": "2 kişi"). Unanswered ones are left out. */
export function summaryRows(p: CookProfile): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const add = (label: string, value: string | undefined) => {
    if (value) rows.push({ label, value });
  };
  add('Kaç kişi', HOUSEHOLD.find((o) => o.value === p.household)?.hint);
  add('Sıklık', labelsOf(FREQUENCY, p.cooking_frequency ? [p.cooking_frequency] : []));
  add('Deneyim', labelsOf(SKILL, p.skill ? [p.skill] : []));
  add('Süre', labelsOf(MINUTES, p.weeknight_minutes ? [p.weeknight_minutes] : []));
  add('Beslenme', labelsOf(DIET, p.diet));
  add('Alerjiler', labelsOf(ALLERGY, p.allergies));
  add('Sevmedikleri', p.dislikes.join(', '));
  add('Mutfaklar', labelsOf(CUISINE, p.cuisines));
  add('Acı', labelsOf(SPICE, p.spice ? [p.spice] : []));
  add('Aletler', labelsOf(EQUIPMENT, p.equipment));
  add('Öncelikler', labelsOf(GOALS, p.goals));
  add('Bütçe', labelsOf(BUDGET, p.budget ? [p.budget] : []));
  return rows;
}
