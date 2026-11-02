import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, RefreshControl, SectionList, Share, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/browse/page-header';
import { RowSkeleton } from '@/components/browse/row-skeleton';
import { ListLabel, RowDivider, useListBottomPadding } from '@/components/browse/sheet-list';
import { AddField } from '@/components/kitchen/add-field';
import { ShoppingRow } from '@/components/kitchen/shopping-row';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { SheetLayout, StickyFooter } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { capitalize } from '@/lib/format';
import {
  shoppingText,
  useAddShopping,
  useMoveToPantry,
  useRemoveShopping,
  useShopping,
  useToggleShopping,
  type ShoppingItem,
} from '@/lib/kitchen';
import { showToast } from '@/store/toast';

/**
 * "Alışveriş listesi": what to buy, grouped by supermarket aisle, with big rows to tick off in the
 * shop. When something is ticked, the one main button moves it into "Dolabım". The list can be sent
 * as plain text (WhatsApp) with the share button.
 */
export default function ShoppingScreen() {
  const { colors } = useTheme();
  const bottom = useListBottomPadding('stack');
  const shopping = useShopping();
  const add = useAddShopping();
  const toggle = useToggleShopping();
  const remove = useRemoveShopping();
  const move = useMoveToPantry();
  const [draft, setDraft] = useState('');

  const list = shopping.data;
  const count = list?.count ?? 0;
  const checked = list?.checked ?? 0;
  const sections = (list?.groups ?? []).map((g) => ({ key: g.aisle, title: g.title, data: g.items }));

  const failed = (e: unknown) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    showToast({ title: describeError(e).title, message: describeError(e).message });
  };

  // mutateAsync: each tap gets its own answer, even when several are in flight.
  const addText = (text: string) =>
    add
      .mutateAsync({ text })
      .then(() => setDraft(''))
      .catch(failed);

  const onToggle = (item: ShoppingItem) => {
    Haptics.selectionAsync();
    toggle.mutateAsync({ item, checked: !item.checked }).catch(failed);
  };

  const undoRemove = (item: ShoppingItem) =>
    add
      .mutateAsync({ items: [{ name: item.name, quantity: item.quantity, unit: item.unit, entry_ids: item.recipes.map((r) => r.entry_id) }] })
      .catch(failed);

  const onRemove = (item: ShoppingItem) =>
    remove
      .mutateAsync(item)
      .then(() =>
        showToast({ title: `${capitalize(item.name)} listeden çıkarıldı`, action: { label: 'Geri al', onPress: () => void undoRemove(item) } }),
      )
      .catch(failed);

  const moveToPantry = () =>
    move
      .mutateAsync(undefined)
      .then((res) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const n = res.moved?.length ?? 0;
        showToast({ title: `${n} ürün dolabına eklendi`, action: { label: 'Dolabım', onPress: () => router.push('/pantry') } });
      })
      .catch(failed);

  // Plain text so it reads well in WhatsApp; browsers without a share sheet copy it instead.
  const share = async () => {
    if (!list) return;
    const message = shoppingText(list);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !('share' in navigator)) throw new Error('no share sheet');
      await Share.share({ message });
    } catch {
      await Clipboard.setStringAsync(message).catch(() => {});
      showToast({ title: 'Liste kopyalandı', message: 'İstediğin yere yapıştırabilirsin.' });
    }
  };

  let empty;
  if (!list) {
    const err = describeError(shopping.error);
    empty = shopping.isPending ? (
      <RowSkeleton count={5} leading={26} />
    ) : (
      <ErrorState title={err.title} message={err.message} onRetry={() => void shopping.refetch()} retrying={shopping.isRefetching} />
    );
  } else {
    empty = (
      <EmptyState
        icon="cart-outline"
        title="Listen boş"
        message="Bir tarifte eksik olanları tek dokunuşla buraya ekleyebilirsin. Ya da yukarıya yazarak ekle.">
        <Button title="Tariflerime göz at" variant="secondary" onPress={() => router.navigate('/my-recipes')} />
      </EmptyState>
    );
  }

  const left = count - checked;
  const subtitle =
    count === 0 ? 'Tariflerde eksik olanlar burada toplanır.' : checked > 0 ? `${left} ürün alınacak · ${checked} alındı` : `${count} ürün alınacak`;

  return (
    <SheetLayout
      header={
        <PageHeader
          back
          title="Alışveriş listesi"
          subtitle={subtitle}
          right={count > 0 ? <IconButton icon="share-outline" label="Listeyi paylaş" onPress={() => void share()} /> : undefined}
        />
      }>
      <SectionList
        sections={sections}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => <ShoppingRow item={item} onToggle={() => onToggle(item)} onRemove={() => onRemove(item)} />}
        renderSectionHeader={({ section }) => <ListLabel label={section.title} first={section.key === sections[0]?.key} />}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={RowDivider}
        ListHeaderComponent={
          <View style={styles.add}>
            <AddField
              label="Listeye ekle"
              value={draft}
              onChangeText={setDraft}
              onSubmit={addText}
              busy={add.isPending}
              placeholder="ör. ekmek, süt, maydanoz"
              help={count === 0 ? 'Birden fazlasını virgülle ayırarak yazabilirsin.' : undefined}
            />
          </View>
        }
        ListEmptyComponent={empty}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={shopping.isRefetching && !shopping.isError}
            onRefresh={() => void shopping.refetch()}
            tintColor={colors.textSecondary}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerStyle={[styles.content, { paddingBottom: checked > 0 ? Spacing.xxxl : bottom }]}
      />
      {checked > 0 ? (
        <StickyFooter>
          <Text variant="footnote" color="textSecondary" align="center">
            {checked} ürün listeden çıkıp Dolabım’a eklenecek
          </Text>
          <Button title="Aldıklarımı dolaba ekle" icon="file-tray-stacked-outline" loading={move.isPending} onPress={moveToPantry} />
        </StickyFooter>
      ) : null}
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
  add: { paddingHorizontal: ScreenPadding, paddingTop: 24, paddingBottom: 4 },
});
