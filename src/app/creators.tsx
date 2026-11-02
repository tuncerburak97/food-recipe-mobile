import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { PageHeader } from '@/components/browse/page-header';
import { RowSkeleton } from '@/components/browse/row-skeleton';
import { ListLabel, RowDivider, useListBottomPadding } from '@/components/browse/sheet-list';
import { CreatorRow } from '@/components/creator/creator-row';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { SheetLayout } from '@/components/ui/layout';
import { SearchField } from '@/components/ui/search-field';
import { useDebounced } from '@/hooks/use-debounced';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { useCreators } from '@/lib/queries';

/** "Hesaplar": the Instagram accounts the recipes came from, the one with the most recipes first. */
export default function CreatorsScreen() {
  const { colors } = useTheme();
  const bottom = useListBottomPadding('stack');
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim(), 300);
  const creators = useCreators(q || undefined);
  const items = creators.data ?? [];

  let empty;
  if (creators.isPending) empty = <RowSkeleton count={7} trailing />;
  else if (creators.isError) {
    const err = describeError(creators.error);
    empty = <ErrorState title={err.title} message={err.message} onRetry={() => void creators.refetch()} retrying={creators.isRefetching} />;
  } else if (q) {
    empty = (
      <EmptyState icon="search" title="Hesap bulunamadı" message="Başka bir isim ya da @kullanıcı adı dene.">
        <Button title="Aramayı temizle" variant="secondary" onPress={() => setQuery('')} />
      </EmptyState>
    );
  } else {
    empty = (
      <EmptyState icon="people-outline" title="Henüz hesap yok" message="Instagram’dan tarif ekledikçe hesaplar burada listelenir.">
        <Button title="Videodan tarif ekle" onPress={() => router.push('/add')} />
      </EmptyState>
    );
  }

  const subtitle = items.length > 0 && !q ? `Tariflerin geldiği ${items.length} Instagram hesabı` : 'Tariflerin geldiği Instagram hesapları';

  return (
    <SheetLayout
      header={
        <PageHeader back title="Hesaplar" subtitle={subtitle}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Hesap ara" tone="raised" />
        </PageHeader>
      }>
      <FlatList
        data={items}
        keyExtractor={(c) => c.username}
        renderItem={({ item, index }) => <CreatorRow creator={item} rank={q ? undefined : index + 1} />}
        ItemSeparatorComponent={RowDivider}
        ListHeaderComponent={items.length > 0 ? <ListLabel first label={q ? 'Sonuçlar' : 'En çok tarifi olan önce'} /> : undefined}
        ListEmptyComponent={empty}
        refreshControl={
          <RefreshControl
            refreshing={creators.isRefetching && !creators.isError}
            onRefresh={() => void creators.refetch()}
            tintColor={colors.textSecondary}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
      />
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 6 },
});
