import type { Category } from '@/lib/types';

/**
 * Every category, in the order cooks usually look for them. Categories are shown as text only:
 * food clip-art icons and emoji read as noise next to real photos.
 */
export const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'main', label: 'Ana yemek' },
  { value: 'soup', label: 'Çorba' },
  { value: 'breakfast', label: 'Kahvaltı' },
  { value: 'dessert', label: 'Tatlı' },
  { value: 'salad', label: 'Salata' },
  { value: 'pasta', label: 'Makarna' },
  { value: 'rice', label: 'Pilav' },
  { value: 'pastry', label: 'Hamur işi' },
  { value: 'appetizer', label: 'Meze' },
  { value: 'snack', label: 'Atıştırmalık' },
  { value: 'drink', label: 'İçecek' },
  { value: 'side', label: 'Garnitür' },
  { value: 'bread', label: 'Ekmek' },
  { value: 'sauce', label: 'Sos' },
  { value: 'other', label: 'Diğer' },
];

export function categoryLabel(category: Category): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? 'Diğer';
}

/** Quick filters that work across categories ("30 dk altı", "Kolay", "Vejetaryen"). */
export type QuickFilter = 'quick' | 'easy' | 'vegetarian';

export const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'quick', label: '30 dk altı' },
  { value: 'easy', label: 'Kolay' },
  { value: 'vegetarian', label: 'Vejetaryen' },
];
