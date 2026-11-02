// The cooking profile collected in onboarding. Codes mirror recipe-backend internal/store/profile.go
// and the AI chef's directive (internal/chef/prompt.go): change them together.

export type Household = 'solo' | 'couple' | 'family' | 'crowd';
export type CookingFrequency = 'rarely' | 'weekly' | 'most_days' | 'daily';
export type Skill = 'beginner' | 'home' | 'confident' | 'chef';
export type Diet = 'vegetarian' | 'vegan' | 'pescatarian' | 'gluten_free' | 'dairy_free' | 'low_carb' | 'high_protein' | 'halal';
export type Allergy = 'nuts' | 'peanuts' | 'dairy' | 'egg' | 'seafood' | 'gluten' | 'sesame' | 'soy';
export type Cuisine = 'turkish' | 'mediterranean' | 'italian' | 'asian' | 'mexican' | 'indian' | 'middle_eastern' | 'french' | 'street';
export type Spice = 'none' | 'mild' | 'medium' | 'hot';
export type Equipment = 'oven' | 'airfryer' | 'microwave' | 'blender' | 'mixer' | 'pressure_cooker' | 'grill' | 'cast_iron';
export type Goal = 'quick' | 'healthy' | 'budget' | 'explore' | 'lose_weight' | 'build_muscle' | 'less_waste' | 'family';
export type Budget = 'low' | 'medium' | 'high';

export interface CookProfile {
  household?: Household;
  cooking_frequency?: CookingFrequency;
  skill?: Skill;
  weeknight_minutes?: number;
  diet: Diet[];
  allergies: Allergy[];
  dislikes: string[];
  cuisines: Cuisine[];
  spice?: Spice;
  equipment: Equipment[];
  goals: Goal[];
  budget?: Budget;
  /** The fun title shown at the end of onboarding ("Pratik Lezzet Avcısı"). */
  persona?: string;
}

export const emptyProfile = (): CookProfile => ({ diet: [], allergies: [], dislikes: [], cuisines: [], equipment: [], goals: [] });

export interface Option<T extends string | number> {
  value: T;
  label: string;
  emoji: string;
  hint?: string;
}

export const HOUSEHOLD: Option<Household>[] = [
  { value: 'solo', label: 'Sadece kendim', emoji: '🙋', hint: '1 kişi' },
  { value: 'couple', label: 'İki kişiyiz', emoji: '👫', hint: '2 kişi' },
  { value: 'family', label: 'Aile sofrası', emoji: '👨‍👩‍👧', hint: '3–4 kişi' },
  { value: 'crowd', label: 'Kalabalığız', emoji: '🎉', hint: '5+ kişi' },
];

export const FREQUENCY: Option<CookingFrequency>[] = [
  { value: 'rarely', label: 'Ara sıra', emoji: '🌙' },
  { value: 'weekly', label: 'Haftada birkaç kez', emoji: '📅' },
  { value: 'most_days', label: 'Neredeyse her gün', emoji: '🔥' },
  { value: 'daily', label: 'Her gün', emoji: '👩‍🍳' },
];

export const SKILL: Option<Skill>[] = [
  { value: 'beginner', label: 'Yeni başlıyorum', emoji: '🐣', hint: 'Basit ve adım adım tarifler' },
  { value: 'home', label: 'Ev yemeklerini yaparım', emoji: '🍳', hint: 'Günlük yemeklerde rahatım' },
  { value: 'confident', label: 'Deneyimliyim', emoji: '🔪', hint: 'Yeni teknikleri denerim' },
  { value: 'chef', label: 'Çok deneyimliyim', emoji: '👨‍🍳', hint: 'Zorlu tariflerden çekinmem' },
];

export const MINUTES: Option<number>[] = [
  { value: 15, label: '15 dakika', emoji: '⚡' },
  { value: 30, label: '30 dakika', emoji: '⏱️' },
  { value: 45, label: '45 dakika', emoji: '🍲' },
  { value: 60, label: '1 saat ve üstü', emoji: '🕰️' },
];

export const DIET: Option<Diet>[] = [
  { value: 'vegetarian', label: 'Vejetaryen', emoji: '🥦' },
  { value: 'vegan', label: 'Vegan', emoji: '🌱' },
  { value: 'pescatarian', label: 'Pesketaryen', emoji: '🐟' },
  { value: 'halal', label: 'Helal', emoji: '☪️' },
  { value: 'gluten_free', label: 'Glutensiz', emoji: '🌾' },
  { value: 'dairy_free', label: 'Laktozsuz', emoji: '🥛' },
  { value: 'low_carb', label: 'Düşük karbonhidrat', emoji: '🥩' },
  { value: 'high_protein', label: 'Yüksek protein', emoji: '💪' },
];

export const ALLERGY: Option<Allergy>[] = [
  { value: 'nuts', label: 'Kuruyemiş', emoji: '🌰' },
  { value: 'peanuts', label: 'Yer fıstığı', emoji: '🥜' },
  { value: 'dairy', label: 'Süt ürünleri', emoji: '🧀' },
  { value: 'egg', label: 'Yumurta', emoji: '🥚' },
  { value: 'seafood', label: 'Deniz ürünleri', emoji: '🦐' },
  { value: 'gluten', label: 'Gluten', emoji: '🍞' },
  { value: 'sesame', label: 'Susam', emoji: '🫘' },
  { value: 'soy', label: 'Soya', emoji: '🫛' },
];

/** Common dislikes offered as quick picks; the user can also type their own. */
export const DISLIKE_SUGGESTIONS = ['Mantar', 'Patlıcan', 'Kişniş', 'Zeytin', 'Sakatat', 'Bamya', 'Kereviz', 'Soğan', 'Sarımsak', 'Acı biber', 'Ciğer', 'Brokoli'];

export const CUISINE: Option<Cuisine>[] = [
  { value: 'turkish', label: 'Türk ev yemekleri', emoji: '🫕' },
  { value: 'mediterranean', label: 'Akdeniz', emoji: '🫒' },
  { value: 'italian', label: 'İtalyan', emoji: '🍝' },
  { value: 'asian', label: 'Uzak Doğu', emoji: '🍜' },
  { value: 'mexican', label: 'Meksika', emoji: '🌮' },
  { value: 'indian', label: 'Hint', emoji: '🍛' },
  { value: 'middle_eastern', label: 'Orta Doğu', emoji: '🧆' },
  { value: 'french', label: 'Fransız', emoji: '🥐' },
  { value: 'street', label: 'Sokak lezzetleri', emoji: '🌯' },
];

export const SPICE: Option<Spice>[] = [
  { value: 'none', label: 'Acısız', emoji: '🧊' },
  { value: 'mild', label: 'Az acı', emoji: '🌶️' },
  { value: 'medium', label: 'Orta acı', emoji: '🌶️🌶️' },
  { value: 'hot', label: 'Bol acı', emoji: '🔥' },
];

export const EQUIPMENT: Option<Equipment>[] = [
  { value: 'oven', label: 'Fırın', emoji: '♨️' },
  { value: 'airfryer', label: 'Airfryer', emoji: '🍟' },
  { value: 'microwave', label: 'Mikrodalga', emoji: '📡' },
  { value: 'blender', label: 'Blender', emoji: '🥤' },
  { value: 'mixer', label: 'Mikser', emoji: '🎂' },
  { value: 'pressure_cooker', label: 'Düdüklü tencere', emoji: '🍲' },
  { value: 'grill', label: 'Izgara / mangal', emoji: '🔥' },
  { value: 'cast_iron', label: 'Döküm tava', emoji: '🍳' },
];

export const GOALS: Option<Goal>[] = [
  { value: 'quick', label: 'Pratik ve hızlı', emoji: '⚡' },
  { value: 'healthy', label: 'Sağlıklı beslenmek', emoji: '🥗' },
  { value: 'budget', label: 'Bütçe dostu', emoji: '💸' },
  { value: 'explore', label: 'Yeni tatlar keşfetmek', emoji: '🧭' },
  { value: 'lose_weight', label: 'Kilo vermek', emoji: '⚖️' },
  { value: 'build_muscle', label: 'Kas yapmak', emoji: '🏋️' },
  { value: 'less_waste', label: 'İsrafı azaltmak', emoji: '♻️' },
  { value: 'family', label: 'Aile için yemek', emoji: '🏡' },
];

export const BUDGET: Option<Budget>[] = [
  { value: 'low', label: 'Ekonomik', emoji: '🪙', hint: 'Uygun fiyatlı malzemeler' },
  { value: 'medium', label: 'Dengeli', emoji: '💳', hint: 'Fiyat ve lezzet dengesi' },
  { value: 'high', label: 'Esnek', emoji: '💎', hint: 'Kaliteli malzemeye öncelik' },
];

export function labelOf<T extends string | number>(options: Option<T>[], value: T | undefined): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

/** A playful title from the answers, shown at the end of onboarding. */
export function personaFor(p: CookProfile): { title: string; emoji: string; line: string } {
  const g = new Set(p.goals);
  if (p.skill === 'chef' || (p.skill === 'confident' && g.has('explore')))
    return { title: 'Gurme Kaşif', emoji: '🧭', line: 'Yeni tatların peşindesin; sana cesur ama yapılabilir tarifler getireceğiz.' };
  if (g.has('build_muscle') || p.diet.includes('high_protein'))
    return { title: 'Protein Avcısı', emoji: '💪', line: 'Doyurucu, proteini bol ve pratik tabaklar seni bekliyor.' };
  if (g.has('healthy') || g.has('lose_weight'))
    return { title: 'Hafif ve Lezzetli', emoji: '🥗', line: 'Sağlıklı ama asla sıkıcı olmayan tarifler hazırlayacağız.' };
  if (p.household === 'family' || p.household === 'crowd' || g.has('family'))
    return { title: 'Sofra Kurucu', emoji: '🏡', line: 'Kalabalık sofralar için herkesin seveceği tarifler senden.' };
  if (g.has('budget') || g.has('less_waste'))
    return { title: 'Akıllı Mutfak Ustası', emoji: '♻️', line: 'Elindekini en iyi şekilde değerlendiren, cebi yormayan tarifler.' };
  if (g.has('quick') || (p.weeknight_minutes ?? 60) <= 15)
    return { title: 'Pratik Lezzet Avcısı', emoji: '⚡', line: 'Az zamanda çok lezzet: hızlı, tek tavalık tarifler senin için.' };
  if (p.skill === 'beginner')
    return { title: 'Mutfağın Yeni Yıldızı', emoji: '🌟', line: 'Adım adım, korkmadan; ilk tariflerin harika olacak.' };
  return { title: 'Ev Lezzetleri Sever', emoji: '🫕', line: 'Sıcacık, tanıdık ama her seferinde biraz farklı tarifler.' };
}
