import type { IconName } from '@/components/ui/icon';

/**
 * What the assistant can do, as tiles (Home, the empty chat, the composer's shortcut). A tile opens a
 * guide: a card in the chat that asks for the one missing piece with real choices (ingredients,
 * accounts, categories) and then sends the finished question. No model call until then.
 */
export type GuideKind = 'ingredient' | 'creator' | 'category' | 'pantry' | 'menu' | 'write';

export interface Capability {
  kind: GuideKind;
  icon: IconName;
  title: string;
  hint: string;
}

export const CAPABILITIES: Capability[] = [
  { kind: 'ingredient', icon: 'leaf-outline', title: 'Malzemeyle', hint: 'İçinde ne olsun?' },
  { kind: 'creator', icon: 'people-outline', title: 'Şefe göre', hint: 'Bir hesabın tarifleri' },
  { kind: 'category', icon: 'grid-outline', title: 'Kategori', hint: 'Tatlı, çorba, pilav…' },
  { kind: 'pantry', icon: 'cube-outline', title: 'Dolabımla', hint: 'Evdekilerle ne çıkar?' },
  { kind: 'menu', icon: 'calendar-outline', title: 'Menü planla', hint: 'Günlük ya da haftalık' },
  { kind: 'write', icon: 'sparkles-outline', title: 'Tarif yazdır', hint: 'AI Şef sana yazsın' },
];

/** The four Home shows (the chat has them all): the jobs people start with most. */
export const HOME_CAPABILITIES = CAPABILITIES.filter((c) => ['ingredient', 'creator', 'pantry', 'menu'].includes(c.kind));

/** Things to ask that need no guide: the kitchen, a recipe, the profile, screens. */
export const MORE_EXAMPLES = [
  'Sütsüz tatlılar',
  'Dolabıma yumurta ve domates ekle',
  'Alışveriş listemde ne var?',
  'Artık vejetaryenim',
  'Bu hafta ne pişirdim?',
];

/** "a", "a ve b", "a, b ve c". */
export function listTr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} ve ${items[items.length - 1]}`;
}
