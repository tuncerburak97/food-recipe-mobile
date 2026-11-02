// Questions of the "Elimde ne var?" flow (codes mirror recipe-backend internal/chef Request).

import type { CookProfile } from '@/lib/profile';
import type { ChefRequest } from '@/lib/types';

export interface ChefOption<T> {
  value: T;
  label: string;
  hint?: string;
}

export const MEALS: ChefOption<ChefRequest['meal']>[] = [
  { value: 'breakfast', label: 'Kahvaltı' },
  { value: 'lunch', label: 'Öğle yemeği' },
  { value: 'dinner', label: 'Akşam yemeği' },
  { value: 'snack', label: 'Atıştırmalık' },
  { value: 'dessert', label: 'Tatlı' },
  { value: 'any', label: 'Fark etmez' },
];

export const TASTES: ChefOption<ChefRequest['taste']>[] = [
  { value: 'savory', label: 'Tuzlu', hint: 'Yemek, kahvaltılık, atıştırmalık' },
  { value: 'sweet', label: 'Tatlı', hint: 'Tatlı, tatlı kahvaltılık, ara öğün' },
  { value: 'any', label: 'Fark etmez' },
];

/** What the dish is for. Serves people on a diet, people who train and people who just love food. */
export const GOALS: ChefOption<ChefRequest['goal']>[] = [
  { value: 'indulgent', label: 'Keyif için', hint: 'Lezzet öncelikli, kendimi şımartmak istiyorum' },
  { value: 'balanced', label: 'Dengeli', hint: 'Her gün yenecek, sağlıklı bir tabak' },
  { value: 'light', label: 'Hafif, düşük kalorili', hint: 'Diyetteyim ya da kalorimi izliyorum' },
  { value: 'high_protein', label: 'Yüksek proteinli', hint: 'Spor yapıyorum, protein önemli' },
  { value: 'any', label: 'Fark etmez' },
];

/** Calorie limit per serving, asked when the goal is light. */
export const CALORIE_LIMITS: ChefOption<number>[] = [
  { value: 300, label: '≈ 300 kcal' },
  { value: 500, label: '≈ 500 kcal' },
  { value: 700, label: '≈ 700 kcal' },
  { value: 0, label: 'Sınır yok' },
];

export const EFFORTS: ChefOption<ChefRequest['effort']>[] = [
  { value: 'quick', label: 'Çok pratik', hint: 'Az adım, az bulaşık' },
  { value: 'normal', label: 'Normal' },
  { value: 'project', label: 'Uğraşmaya hazırım', hint: 'Bugün mutfakta vakit geçirmek istiyorum' },
];

export const MOODS: ChefOption<ChefRequest['mood']>[] = [
  { value: 'hearty', label: 'Doyurucu', hint: 'Karnım çok aç' },
  { value: 'comfort', label: 'Ev sıcaklığında', hint: 'Anne yemeği gibi' },
  { value: 'light', label: 'Ferah', hint: 'İçimi şişirmesin' },
  { value: 'surprise', label: 'Şaşırt beni', hint: 'Aklıma gelmeyecek bir şey' },
  { value: 'any', label: 'Fark etmez' },
];

export const TIMES: ChefOption<number>[] = [
  { value: 15, label: '15 dk' },
  { value: 30, label: '30 dk' },
  { value: 45, label: '45 dk' },
  { value: 60, label: '1 saat' },
  { value: 0, label: 'Fark etmez' },
];

export const PANTRY_MODES: ChefOption<ChefRequest['pantry_mode']>[] = [
  { value: 'strict', label: 'Sadece bunlar', hint: 'Tuz, yağ, baharat dışında ekleme yok' },
  { value: 'flexible', label: 'Birkaç temel şey eklenebilir', hint: 'Soğan, sarımsak, salça gibi 1–3 şey' },
  { value: 'shopping', label: 'Markete uğrayabilirim', hint: 'Lezzet için birkaç malzeme alırım' },
];

/** Quick notes to the chef. */
export const NOTE_IDEAS = ['Tek tava olsun', 'Az bulaşık', 'Çocuklar da yiyecek', 'Misafir gelecek', 'Ertesi güne de kalsın', 'Diyetteyim'];

/** Common things people have at home, as quick picks. */
export const PANTRY_PICKS: { name: string }[] = [
  { name: 'Yumurta' },
  { name: 'Domates' },
  { name: 'Soğan' },
  { name: 'Patates' },
  { name: 'Tavuk' },
  { name: 'Kıyma' },
  { name: 'Peynir' },
  { name: 'Yoğurt' },
  { name: 'Makarna' },
  { name: 'Pirinç' },
  { name: 'Biber' },
  { name: 'Kabak' },
  { name: 'Ispanak' },
  { name: 'Mercimek' },
  { name: 'Nohut' },
  { name: 'Havuç' },
  { name: 'Mantar' },
  { name: 'Limon' },
  { name: 'Sarımsak' },
  { name: 'Ton balığı' },
  { name: 'Ekmek' },
  { name: 'Un' },
  { name: 'Süt' },
  { name: 'Muz' },
];

/** A sensible meal for the time of day. */
export function mealForNow(date = new Date()): ChefRequest['meal'] {
  const h = date.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 22) return 'dinner';
  return 'snack';
}

/** Today's answers, prefilled from the cooking profile. */
export function defaultRequest(profile?: CookProfile): ChefRequest {
  const servings = { solo: 1, couple: 2, family: 4, crowd: 6 }[profile?.household ?? 'couple'];
  const minutes = profile?.weeknight_minutes;
  const goals = profile?.goals ?? [];
  const goal: ChefRequest['goal'] = goals.includes('lose_weight')
    ? 'light'
    : goals.includes('build_muscle') || profile?.diet.includes('high_protein')
      ? 'high_protein'
      : goals.includes('healthy')
        ? 'balanced'
        : 'any';
  return {
    ingredients: [],
    meal: mealForNow(),
    taste: 'any',
    goal,
    calorie_limit: goal === 'light' ? 500 : 0,
    effort: goals.includes('quick') ? 'quick' : 'normal',
    mood: 'any',
    servings,
    max_minutes: minutes ? Math.min(60, minutes) : 30,
    pantry_mode: profile?.goals.includes('less_waste') ? 'strict' : 'flexible',
    note: '',
    avoid_titles: [],
  };
}
