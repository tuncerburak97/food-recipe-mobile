import { ALLERGY, BUDGET, CUISINE, DIET, EQUIPMENT, FREQUENCY, GOALS, HOUSEHOLD, MINUTES, SKILL, SPICE, type Option } from '@/lib/profile';

/**
 * Every screen of the onboarding, in order. One route, one state object, internal step index.
 * The demo comes first so the user sees a video turn into a recipe before any question. Spice,
 * equipment, budget and cooking frequency are not asked here; they stay editable in Profil.
 */
export const STEPS = ['hero', 'demo', 'name', 'goals', 'household', 'minutes', 'skill', 'cuisines', 'avoid', 'preparing'] as const;

/** Every question id, the onboarding ones and those only on the profile screen. */
export type StepId =
  | (typeof STEPS)[number]
  | 'frequency'
  | 'diet'
  | 'allergies'
  | 'dislikes'
  | 'spice'
  | 'equipment'
  | 'budget';

export const FIRST_QUESTION = STEPS.indexOf('name');
export const LAST_QUESTION = STEPS.indexOf('avoid');

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
  name: { title: 'Mutfakta sana nasıl seslenelim?', subtitle: 'AI Şef seni adınla karşılasın. İstersen boş bırak.' },
  dislikes: { title: 'Sevmediğin malzemeler var mı?', subtitle: 'AI Şef bunları tariflerine koymaz.' },
  avoid: {
    title: 'Tabağına girmesin dediklerin',
    subtitle: 'AI Şef yazdığı her tarifte bunlara uyar. Hiçbiri yoksa doğrudan devam et.',
  },
} satisfies Record<string, StepCopy>;

export const QUESTIONS: Partial<Record<StepId, SingleQuestion | MultiQuestion>> = {
  household: {
    kind: 'single',
    field: 'household',
    options: HOUSEHOLD,
    title: 'Sofrana genelde kaç tabak koyuyorsun?',
    subtitle: 'Tarifler bu porsiyonla gelir; her tarifte tek dokunuşla değiştirirsin.',
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
    title: 'Mutfaktaki halin hangisi?',
    subtitle: 'AI Şef anlatımını ve tariflerin zorluğunu sana göre ayarlar.',
  },
  minutes: {
    kind: 'single',
    field: 'weeknight_minutes',
    options: MINUTES,
    title: 'Hafta içi bir akşam, yemeğe ne kadar vaktin var?',
    subtitle: 'Bu süreye sığan tarifleri öne çıkarırız.',
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
    title: 'Hangi lezzetler seni çağırıyor?',
    subtitle: 'Birkaç tane seç; AI Şef önerilerinde bunlara öncelik verir.',
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
    title: 'Bu uygulamadan en çok ne bekliyorsun?',
    subtitle: `En fazla ${MAX_GOALS} tane seç; tarifler ve öneriler buna göre şekillenir.`,
  },
  budget: {
    kind: 'single',
    field: 'budget',
    options: BUDGET,
    title: 'Market bütçen nasıl?',
    subtitle: 'Malzeme önerilerini buna göre yaparız.',
  },
};
