import { router } from 'expo-router';
import { useState } from 'react';

import { PageHeader } from '@/components/browse/page-header';
import { RecipeFeed } from '@/components/recipe/recipe-feed';
import { Button } from '@/components/ui/button';
import { SheetLayout } from '@/components/ui/layout';
import { SearchField } from '@/components/ui/search-field';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useDebounced } from '@/hooks/use-debounced';
import { useMe } from '@/lib/queries';

type Tab = 'ai' | 'saved';

/**
 * "Tariflerim" tab, in two parts: recipes saved from Instagram ("Kaydettiklerim") and the ones
 * prepared from what the user had ("Hazırladıklarım").
 */
export default function MyRecipesScreen() {
  const me = useMe().data;
  const [tab, setTab] = useState<Tab>('saved');
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim(), 300);

  const empty = q
    ? {
        icon: 'search' as const,
        title: 'Tarif bulunamadı',
        message: tab === 'ai' ? 'Hazırladıklarında bu kelime geçmiyor. Başka bir kelime dene.' : 'Kaydettiklerinde bu kelime geçmiyor. Başka bir kelime dene.',
        action: <Button title="Aramayı temizle" variant="secondary" onPress={() => setQuery('')} />,
      }
    : tab === 'ai'
      ? {
          icon: 'basket-outline' as const,
          title: 'Henüz hazırladığın tarif yok',
          message: 'Elindeki malzemeleri yaz, sana uygun bir tarif hazırlayalım.',
          action: <Button title="Elimde ne var?" onPress={() => router.push('/chef')} />,
        }
      : {
          icon: 'bookmark-outline' as const,
          title: 'Kaydettiğin tarif yok',
          message: 'Instagram’da beğendiğin bir yemek videosunu ekle, tarifi burada dursun.',
          action: <Button title="Videodan tarif ekle" onPress={() => router.push('/add')} />,
        };

  return (
    <SheetLayout
      header={
        <PageHeader title="Tariflerim" subtitle={me?.recipeCount ? `Toplam ${me.recipeCount} tarif` : 'Kaydettiklerin ve hazırladıkların'}>
          <SegmentedControl
            label="Tariflerim bölümü"
            tone="raised"
            segments={[
              { value: 'saved' as Tab, label: 'Kaydettiklerim' },
              { value: 'ai' as Tab, label: 'Hazırladıklarım' },
            ]}
            value={tab}
            onChange={setTab}
          />
          <SearchField value={query} onChangeText={setQuery} placeholder={tab === 'ai' ? 'Hazırladıklarımda ara' : 'Kaydettiklerimde ara'} tone="raised" />
        </PageHeader>
      }>
      <RecipeFeed key={tab} params={{ scope: 'mine', origin: tab, q: q || undefined }} empty={empty} placement="tab" />
    </SheetLayout>
  );
}
