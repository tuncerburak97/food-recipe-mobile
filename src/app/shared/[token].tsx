import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IngredientChecklist } from '@/components/recipe/ingredient-checklist';
import { MetaLine } from '@/components/recipe/meta-pills';
import { RecipeImage } from '@/components/recipe/recipe-image';
import { StepList } from '@/components/recipe/step-list';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { StickyFooter } from '@/components/ui/layout';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { categoryLabel } from '@/constants/categories';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { api, describeError } from '@/lib/api';
import { upperTr } from '@/lib/format';

const HERO = 300;
const OVERLAP = 28;

/**
 * A recipe someone sent with a link (https://<server>/t/<token>, opened in the app). The whole
 * recipe is readable, it never counts against the day's recipes, and one button adds it to the
 * user's own book.
 */
export default function SharedRecipeScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['shared', token], queryFn: () => api.getShared(token), enabled: !!token });
  const save = useMutation({
    mutationFn: () => api.saveShared(token),
    onSuccess: (entry) => {
      track('shared_recipe_saved', { origin: entry.origin });
      client.setQueryData(['recipe', entry.id], entry);
      client.invalidateQueries({ queryKey: ['recipes'] });
      client.invalidateQueries({ queryKey: ['me'] });
      client.invalidateQueries({ queryKey: ['shared', token] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/recipe/${entry.id}`);
    },
    onError: (e) => Alert.alert(describeError(e).title, describeError(e).message),
  });
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const data = query.data;
  if (!data) {
    const err = describeError(query.error);
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScreenHeader onBack={close} />
        {query.isPending ? <LoadingState label="Tarif yükleniyor" /> : <ErrorState title={err.title} message={err.message} onRetry={() => query.refetch()} />}
      </View>
    );
  }

  const { entry, sharedBy, myEntryId } = data;
  const { recipe } = entry;
  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <RecipeImage uri={entry.imageUrl} style={{ height: HERO + insets.top }} placeholderSize={110} transition={200} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.titleBlock}>
            <Text variant="overline" color="accentText">
              {upperTr(sharedBy ? `${sharedBy} seninle paylaştı` : 'Seninle paylaşıldı')}
            </Text>
            <Text variant="display" accessibilityRole="header">
              {recipe.title}
            </Text>
            {recipe.description ? (
              <Text variant="body" color="textSecondary">
                {recipe.description}
              </Text>
            ) : (
              <Text variant="footnote" color="textTertiary">
                {categoryLabel(recipe.category)}
              </Text>
            )}
          </View>
          <MetaLine recipe={recipe} />
          <View style={styles.section}>
            <Text variant="title2" accessibilityRole="header">
              Malzemeler
            </Text>
            <IngredientChecklist groups={recipe.ingredient_groups} checkable={false} />
          </View>
          {recipe.steps.length > 0 ? (
            <View style={styles.section}>
              <Text variant="title2" accessibilityRole="header">
                Yapılışı
              </Text>
              <StepList recipe={recipe} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.floating, { top: insets.top + 8 }]} pointerEvents="box-none">
        <IconButton icon="close" label="Kapat" tone="overlay" onPress={close} />
      </View>

      <StickyFooter style={styles.footer}>
        {myEntryId ? (
          <Button title="Defterimde aç" trailingIcon="arrow-forward" onPress={() => router.replace(`/recipe/${myEntryId}`)} />
        ) : (
          <Button title="Defterime ekle" icon="bookmark-outline" onPress={() => save.mutate()} loading={save.isPending} />
        )}
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  sheet: {
    marginTop: -OVERLAP,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: ScreenPadding,
    paddingTop: 26,
    gap: 24,
  },
  titleBlock: { gap: 8 },
  section: { gap: 14 },
  floating: { position: 'absolute', left: ScreenPadding, right: ScreenPadding, flexDirection: 'row' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
