import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/browse/page-header';
import { AddField } from '@/components/kitchen/add-field';
import { Button } from '@/components/ui/button';
import { Chip, ChipWrap } from '@/components/ui/chip';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { SheetLayout, StickyFooter } from '@/components/ui/layout';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { PANTRY_PICKS } from '@/lib/chef';
import { capitalize, upperTr } from '@/lib/format';
import { kitchenKey, pantryChanging, pantryItems, useAddPantry, usePantry, useRemovePantry, type PantryItem } from '@/lib/kitchen';
import { showToast } from '@/store/toast';

/**
 * "Dolabım": what the user has at home. Type names (comma separated) or tap quick picks; items are
 * calm chips grouped by supermarket aisle and leave with one tap (with "Geri al"). Recipes then show
 * "Hepsi evde" / "1 eksik", and the one main button cooks from the pantry ("Elimde ne var?").
 */
export default function PantryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const pantry = usePantry();
  const add = useAddPantry();
  const remove = useRemovePantry();
  const [draft, setDraft] = useState('');
  // Picks being added, shown as picked until the server's list has them.
  const [adding, setAdding] = useState<string[]>([]);

  const list = pantry.data;
  const items = pantryItems(list);
  const byKey = new Map(items.map((i) => [i.key, i]));
  const count = list?.count ?? 0;

  const failed = (e: unknown) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    showToast({ title: describeError(e).title, message: describeError(e).message });
  };

  // mutateAsync: each tap gets its own answer, even when several are in flight.
  const addText = (text: string) =>
    add
      .mutateAsync({ text })
      .then((res) => {
        setDraft('');
        if (!res.added?.length) showToast({ title: 'Bunlar zaten dolabında' });
      })
      .catch(failed);

  const removeItem = (item: PantryItem) =>
    remove
      .mutateAsync(item)
      .then(() =>
        showToast({
          title: `${capitalize(item.name)} çıkarıldı`,
          action: { label: 'Geri al', onPress: () => void add.mutateAsync({ names: [item.name] }).catch(failed) },
        }),
      )
      .catch(failed);

  // Picking only changes a chip's fill, never its place, so the next tap lands where the eye is.
  const togglePick = (name: string) => {
    const key = kitchenKey(name);
    const have = byKey.get(key);
    if (have) {
      removeItem(have);
      return;
    }
    if (adding.includes(key)) return;
    setAdding((a) => [...a, key]);
    add
      .mutateAsync({ names: [name] })
      .catch((e) => {
        setAdding((a) => a.filter((k) => k !== key));
        failed(e);
      })
      // The final list arrives with the last change in flight.
      .finally(() => {
        if (!pantryChanging(client)) setAdding([]);
      });
  };

  const cook = () => router.push({ pathname: '/chef', params: { pantry: '1' } });

  let body;
  if (!list) {
    const err = describeError(pantry.error);
    body = pantry.isPending ? (
      <PantrySkeleton />
    ) : (
      <ErrorState title={err.title} message={err.message} onRetry={() => void pantry.refetch()} retrying={pantry.isRefetching} />
    );
  } else if (count === 0) {
    body = (
      <EmptyState
        icon="file-tray-stacked-outline"
        title="Dolabın boş"
        message="Evde olanları yaz ya da aşağıdan seç. Tariflerde neyin eksik olduğunu, bu akşam ne yapabileceğini gösterelim."
      />
    );
  } else {
    body = (
      <View style={styles.groups}>
        {list.groups.map((g) => (
          <View key={g.aisle} style={styles.group}>
            <Text variant="overline" color="textTertiary" accessibilityRole="header" style={styles.overline}>
              {upperTr(`${g.title} · ${g.items.length}`)}
            </Text>
            <ChipWrap>
              {g.items.map((item) => (
                <Chip key={item.id} label={capitalize(item.name)} tone="sunken" removable onPress={() => removeItem(item)} />
              ))}
            </ChipWrap>
          </View>
        ))}
      </View>
    );
  }

  const picks = (
    <View style={styles.group}>
      <Text variant="overline" color="textTertiary" accessibilityRole="header" style={styles.overline}>
        {upperTr('Hızlı ekle')}
      </Text>
      <ChipWrap>
        {PANTRY_PICKS.map((p) => {
          const key = kitchenKey(p.name);
          return <Chip key={p.name} label={p.name} tone="sunken" selected={byKey.has(key) || adding.includes(key)} onPress={() => togglePick(p.name)} />;
        })}
      </ChipWrap>
    </View>
  );

  return (
    <SheetLayout
      header={
        <PageHeader
          back
          title="Dolabım"
          subtitle={count > 0 ? `${count} malzeme. Tariflerde eksikleri buna göre gösteririz.` : 'Evde olanları ekle, tariflerde eksikleri gösterelim.'}
        />
      }>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: count > 0 ? Spacing.xxxl : insets.bottom + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={pantry.isRefetching && !pantry.isError}
            onRefresh={() => void pantry.refetch()}
            tintColor={colors.textSecondary}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }>
        <AddField
          label="Dolabına ekle"
          value={draft}
          onChangeText={setDraft}
          onSubmit={addText}
          busy={add.isPending && !adding.length}
          placeholder="ör. domates, yoğurt, kıyma"
          help="Birden fazlasını virgülle ayırarak yazabilirsin."
        />
        {body}
        {list ? picks : null}
      </ScrollView>
      {count > 0 ? (
        <StickyFooter>
          <Text variant="footnote" color="textSecondary" align="center">
            Dolabındakilerle sana bir tarif hazırlayalım
          </Text>
          <Button title="Dolabımla tarif hazırla" icon="sparkles-outline" onPress={cook} />
        </StickyFooter>
      ) : null}
    </SheetLayout>
  );
}

function PantrySkeleton() {
  const widths = [84, 112, 72, 96, 120, 64, 88];
  return (
    <SkeletonPulse style={styles.group}>
      <SkeletonBlock width={90} height={11} radius={5} />
      <View style={styles.skeletonChips}>
        {widths.map((w, i) => (
          <SkeletonBlock key={i} width={w} height={38} radius={19} />
        ))}
      </View>
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: 24, gap: 28 },
  groups: { gap: 24 },
  group: { gap: 12 },
  overline: { paddingHorizontal: 2 },
  skeletonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
