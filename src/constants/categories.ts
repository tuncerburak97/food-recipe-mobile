import type { IconName } from '@/components/ui/icon';
import type { Category } from '@/lib/types';

/**
 * Every category, in the order cooks usually look for them. Chips show the label only; the Home
 * tiles add the outline icon in a neutral well (never emoji or colored clip-art).
 */
export const CATEGORIES: { value: Category; label: string; icon: IconName }[] = [
  { value: 'main', label: 'Ana yemek', icon: 'restaurant-outline' },
  { value: 'soup', label: 'Çorba', icon: 'flame-outline' },
  { value: 'breakfast', label: 'Kahvaltı', icon: 'egg-outline' },
  { value: 'dessert', label: 'Tatlı', icon: 'ice-cream-outline' },
  { value: 'salad', label: 'Salata', icon: 'leaf-outline' },
  { value: 'pasta', label: 'Makarna', icon: 'layers-outline' },
  { value: 'rice', label: 'Pilav', icon: 'disc-outline' },
  { value: 'pastry', label: 'Hamur işi', icon: 'pizza-outline' },
  { value: 'appetizer', label: 'Meze', icon: 'grid-outline' },
  { value: 'snack', label: 'Atıştırmalık', icon: 'fast-food-outline' },
  { value: 'drink', label: 'İçecek', icon: 'cafe-outline' },
  { value: 'side', label: 'Garnitür', icon: 'nutrition-outline' },
  { value: 'bread', label: 'Ekmek', icon: 'storefront-outline' },
  { value: 'sauce', label: 'Sos', icon: 'water-outline' },
  { value: 'other', label: 'Diğer', icon: 'ellipsis-horizontal-outline' },
];

export function categoryLabel(category: Category): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? 'Diğer';
}

export function categoryIcon(category: Category): IconName {
  return CATEGORIES.find((c) => c.value === category)?.icon ?? 'ellipsis-horizontal-outline';
}

/** Quick filters that work across categories ("30 dk altı", "Kolay", "Vejetaryen"). */
export type QuickFilter = 'quick' | 'easy' | 'vegetarian';

export const QUICK_FILTERS: { value: QuickFilter; label: string }[] = [
  { value: 'quick', label: '30 dk altı' },
  { value: 'easy', label: 'Kolay' },
  { value: 'vegetarian', label: 'Vejetaryen' },
];
