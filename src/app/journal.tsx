import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, RefreshControl, SectionList, StyleSheet } from 'react-native';

import { PageHeader } from '@/components/browse/page-header';
import { ListLabel, RowDivider, useListBottomPadding } from '@/components/browse/sheet-list';
import { JournalRow } from '@/components/journal/journal-row';
import { NoteSheet } from '@/components/journal/note-sheet';
import { RecipeRowSkeleton } from '@/components/recipe/recipe-row-skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { SheetLayout } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { journalErrorText, monthLabel, useDeleteCookLog, useJournal, useUpdateCookLog, type CookLog } from '@/lib/journal';
import { showToast } from '@/store/toast';

type Section = { key: string; title: string; data: CookLog[] };

/** Groups the logs (newest first) by month, keeping their order. */
function byMonth(items: CookLog[]): Section[] {
  const sections: Section[] = [];
  for (const log of items) {
    const d = new Date(log.cookedAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const last = sections[sections.length - 1];
    if (last?.key === key) last.data.push(log);
    else sections.push({ key, title: monthLabel(log.cookedAt), data: [log] });
  }
  return sections;
}

/** Asks before deleting; the web has no native alert buttons, so it uses the browser's confirm. */
function confirmDelete(onConfirm: () => void) {
  const title = 'Bu kayıt silinsin mi?';
  const message = 'Notun ve fotoğrafın da silinir.';
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: onConfirm },
  ]);
}

/**
 * "Pişirdiklerim": everything the user cooked, as a timeline grouped by month, with their photo,
 * verdict and note. `?entryId=` shows one recipe's cooks (opened from the recipe page).
 */
export default function JournalScreen() {
  const { entryId } = useLocalSearchParams<{ entryId?: string }>();
  const { colors } = useTheme();
  const bottom = useListBottomPadding('stack');
  const journal = useJournal(entryId || undefined);
  const update = useUpdateCookLog();
  const remove = useDeleteCookLog();
  // The log being edited stays set while the sheet slides away, so its content does not flash.
  const [editing, setEditing] = useState<CookLog | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const items = journal.data?.pages.flatMap((p) => p.items) ?? [];
  const total = journal.data?.pages[0]?.total ?? 0;
  const sections = byMonth(items);
  const filtered = !!entryId;
  const recipeTitle = filtered ? items[0]?.recipeTitle : undefined;

  const deleteLog = (log: CookLog) =>
    confirmDelete(() =>
      remove.mutate(log.id, {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setSheetOpen(false);
          showToast({ title: 'Kayıt silindi' });
        },
        onError: (e) => showToast({ title: 'Silinemedi', message: journalErrorText(e) }),
      }),
    );

  const openEdit = (log: CookLog) => {
    update.reset();
    setEditing(log);
    setSheetOpen(true);
  };

  // The web has no action sheet: the edit page there also holds "Bu kaydı sil".
  const openMenu = (log: CookLog) => {
    if (Platform.OS === 'web') {
      openEdit(log);
      return;
    }
    Haptics.selectionAsync();
    const actions = [
      { label: log.note ? 'Notu düzenle' : 'Not ekle', run: () => openEdit(log) },
      { label: 'Sil', run: () => deleteLog(log), destructive: true },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: log.recipeTitle, options: [...actions.map((a) => a.label), 'Vazgeç'], cancelButtonIndex: actions.length, destructiveButtonIndex: 1 },
        (i) => actions[i]?.run(),
      );
    } else {
      Alert.alert(log.recipeTitle, undefined, [
        { text: 'Vazgeç', style: 'cancel' },
        ...actions.map((a) => ({ text: a.label, onPress: a.run, style: a.destructive ? ('destructive' as const) : undefined })),
      ]);
    }
  };

  const saveEdit = (v: { note: string; rating?: CookLog['rating'] }) => {
    if (!editing) return;
    update.mutate(
      { id: editing.id, note: v.note, rating: v.rating ?? null },
      {
        onSuccess: (log) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setEditing(log);
          setSheetOpen(false);
        },
      },
    );
  };

  let empty;
  if (journal.isPending) empty = <RecipeRowSkeleton count={5} inset />;
  else if (journal.isError) {
    const err = describeError(journal.error);
    empty = <ErrorState title={err.title} message={err.message} onRetry={() => void journal.refetch()} retrying={journal.isRefetching} />;
  } else if (filtered) {
    empty = (
      <EmptyState icon="journal-outline" title="Bu tarif için kayıt yok" message="Bu tarifi pişirip “Nasıl oldu?” kısmını doldurduğunda burada görünür.">
        <Button title="Tüm kayıtlar" variant="secondary" onPress={() => router.replace('/journal')} />
      </EmptyState>
    );
  } else {
    empty = (
      <EmptyState
        icon="journal-outline"
        title="Pişirdiklerin burada görünür"
        message="Bir tarifi pişirme modunda bitirdiğinde nasıl olduğunu, fotoğrafını ve bir dahaki sefere notunu buraya ekleyebilirsin.">
        <Button title="Tariflerime git" onPress={() => router.push('/my-recipes')} />
      </EmptyState>
    );
  }

  const subtitle = filtered
    ? [recipeTitle, total ? `${total} kez pişirdin` : null].filter(Boolean).join(' · ') || 'Bu tarifi pişirdiğin zamanlar'
    : total
      ? `${total} kayıt · notların ve fotoğrafların`
      : 'Pişirdiklerin, notların ve fotoğrafların';

  return (
    <SheetLayout
      header={
        <PageHeader
          back
          title="Pişirdiklerim"
          subtitle={subtitle}
          right={filtered ? <AllLink /> : undefined}
        />
      }>
      <SectionList
        sections={sections}
        keyExtractor={(l) => l.id}
        renderItem={({ item }) => <JournalRow log={item} onMenu={openMenu} showTitle={!filtered} />}
        renderSectionHeader={({ section }) => <ListLabel label={section.title} first={section.key === sections[0]?.key} />}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={RowDivider}
        ListEmptyComponent={empty}
        ListFooterComponent={journal.isFetchingNextPage ? <ActivityIndicator color={colors.textSecondary} style={styles.footer} /> : undefined}
        onEndReached={() => journal.hasNextPage && !journal.isFetchingNextPage && journal.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={journal.isRefetching && !journal.isFetchingNextPage && !journal.isError}
            onRefresh={() => void journal.refetch()}
            tintColor={colors.textSecondary}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
      />

      <NoteSheet
        visible={sheetOpen}
        title="Kaydı düzenle"
        subtitle={editing?.recipeTitle}
        withRating
        initialRating={editing?.rating}
        initialNote={editing?.note}
        submitLabel="Kaydet"
        busy={update.isPending || remove.isPending}
        error={update.isError ? journalErrorText(update.error) : null}
        onSubmit={saveEdit}
        onClose={() => setSheetOpen(false)}
        onDelete={editing ? () => deleteLog(editing) : undefined}
      />
    </SheetLayout>
  );
}

/** "Tümü ›" next to the back button of one recipe's journal: every cook. */
function AllLink() {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.replace('/journal')}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Tüm kayıtları göster"
      style={({ pressed }) => [styles.all, pressed && styles.pressed]}>
      <Text variant="subhead" weight="700" color="accentText">
        Tümü
      </Text>
      <Icon name="chevron-forward" size={14} color={colors.accentText} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 6 },
  footer: { marginVertical: 20 },
  all: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 44, paddingHorizontal: 4 },
  pressed: { opacity: 0.6 },
});
