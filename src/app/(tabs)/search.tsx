import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { PageHeader } from '@/components/browse/page-header';
import { CategoryChips } from '@/components/home/category-chips';
import { RecipeFeed } from '@/components/recipe/recipe-feed';
import { Button } from '@/components/ui/button';
import { Chip, ChipRow } from '@/components/ui/chip';
import { SheetLayout } from '@/components/ui/layout';
import { SearchField } from '@/components/ui/search-field';
import { QUICK_FILTERS, type QuickFilter } from '@/constants/categories';
import { useDebounced } from '@/hooks/use-debounced';
import type { FeedParams } from '@/lib/api';
import { useCategories } from '@/lib/queries';
import type { Category } from '@/lib/types';

/** Search tab: every recipe, searchable by name / ingredient / person / Instagram account, filterable by category. */
export default function SearchScreen() {
  const params = useLocalSearchParams<{ category?: Category }>();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | 'all'>(params.category ?? 'all');
  const [filters, setFilters] = useState<QuickFilter[]>([]);
  const q = useDebounced(query.trim(), 300);
  const counts = useCategories().data;

  // Opening Search from a category tile on Home selects that category, also when the tab is already open.
  const [lastParam, setLastParam] = useState(params.category);
  if (params.category !== lastParam) {
    setLastParam(params.category);
    if (params.category) setCategory(params.category);
  }

  const toggle = (f: QuickFilter) => setFilters((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  const filtered = category !== 'all' || filters.length > 0;
  const clear = () => {
    setQuery('');
    setCategory('all');
    setFilters([]);
  };

  const feed: FeedParams = {
    scope: 'all',
    q: q || undefined,
    category: category === 'all' ? undefined : category,
    maxMinutes: filters.includes('quick') ? 30 : undefined,
    difficulty: filters.includes('easy') ? 'easy' : undefined,
    dietary: filters.includes('vegetarian') ? 'vegetarian' : undefined,
  };

  const empty =
    q || filtered
      ? {
          icon: 'search' as const,
          title: 'Tarif bulunamadı',
          message: filtered ? 'Başka bir kelime dene ya da filtreleri kaldır.' : 'Başka bir kelime ya da malzeme dene.',
          action: <Button title={filtered ? 'Filtreleri temizle' : 'Aramayı temizle'} variant="secondary" onPress={clear} />,
        }
      : {
          icon: 'book-outline' as const,
          title: 'Henüz tarif yok',
          message: 'Instagram’da beğendiğin bir yemek videosunu ekle, tarifi burada bulursun.',
          action: <Button title="Videodan tarif ekle" onPress={() => router.push('/add')} />,
        };

  return (
    <SheetLayout
      header={
        <PageHeader title="Tarif ara" subtitle={counts?.total ? `${counts.total} tarif arasında ara` : 'Yemek, malzeme ya da hesap adıyla bul'}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Yemek, malzeme ya da @hesap ara" tone="prominent" />
          <CategoryChips value={category} onChange={setCategory} counts={counts?.items} total={counts?.total} />
          <ChipRow>
            {QUICK_FILTERS.map((f) => {
              const on = filters.includes(f.value);
              return <Chip key={f.value} label={f.label} icon={on ? 'checkmark' : undefined} selected={on} onPress={() => toggle(f.value)} />;
            })}
          </ChipRow>
        </PageHeader>
      }>
      <RecipeFeed params={feed} empty={empty} placement="tab" />
    </SheetLayout>
  );
}

