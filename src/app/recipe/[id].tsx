import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Linking, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { AdaptChips } from '@/components/recipe/adapt-chips';
import { AiHero } from '@/components/recipe/ai-hero';
import { ChefNote } from '@/components/recipe/chef-note';
import { IngredientChecklist } from '@/components/recipe/ingredient-checklist';
import { JournalNote } from '@/components/recipe/journal-note';
import { KitchenBar } from '@/components/recipe/kitchen-bar';
import { MetaLine } from '@/components/recipe/meta-pills';
import { NotesCard } from '@/components/recipe/notes-card';
import { ServingsStepper } from '@/components/recipe/servings-stepper';
import { SourceCreator } from '@/components/recipe/source-creator';
import { StepList } from '@/components/recipe/step-list';
import { TranslatedNote } from '@/components/recipe/translated-note';
import { VideoHero } from '@/components/recipe/video-hero';
import { VoiceMemo } from '@/components/recipe/voice-memo';
import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { StickyFooter } from '@/components/ui/layout';
import { ListGroup, ListRow } from '@/components/ui/list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { categoryLabel } from '@/constants/categories';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sourceName } from '@/lib/instagram';
import { describeError } from '@/lib/api';
import { ingredientCount, upperTr } from '@/lib/format';
import { useDeleteRecipe, useMe, useRecipe, useResetCustomRecipe, useSaveRecipe } from '@/lib/queries';

const HERO_HEIGHT = 330;
/** How far the white sheet rises over the photo. */
const OVERLAP = 28;
type Tab = 'ingredients' | 'steps' | 'notes';

/**
 * Recipe detail. The photo or reel on top, a white sheet rising over it with the title and the key
 * facts, the source and assistant as two plain rows, then ingredients / steps / tips as tabs so only
 * one list is on screen. One main action at the bottom: "Pişirmeye başla".
 */
export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const query = useRecipe(id);
  const me = useMe().data;
  const save = useSaveRecipe();
  const remove = useDeleteRecipe();
  const reset = useResetCustomRecipe();
  const [tab, setTab] = useState<Tab>('ingredients');
  const [servings, setServings] = useState<number | null>(null);
  const [overPhoto, setOverPhoto] = useState(true);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const fadeAt = HERO_HEIGHT - OVERLAP - 70;
  // A solid bar with the title fades in behind the round buttons once the photo scrolls away.
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [fadeAt - 50, fadeAt], [0, 1], 'clamp'),
  }));
  useAnimatedReaction(
    () => scrollY.get() < fadeAt - 25,
    (now, before) => {
      if (now !== before) scheduleOnRN(setOverPhoto, now);
    },
  );

  const entry = query.data;
  if (!entry) {
    const err = describeError(query.error);
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <ScreenHeader />
        {query.isPending ? <LoadingState label="Tarif yükleniyor" /> : <ErrorState title={err.title} message={err.message} onRetry={() => query.refetch()} />}
      </View>
    );
  }

  const { recipe, source } = entry;
  const mine = entry.addedBy.id === me?.id;
  const baseServings = recipe.servings.amount ? Math.round(recipe.servings.amount) : null;
  const people = servings ?? baseServings;
  const factor = baseServings && people ? people / baseServings : 1;
  const hasNotes = recipe.tips.length + recipe.missing_information.length + recipe.equipment.length > 0;
  const hasSteps = recipe.steps.length > 0;
  const openAssistant = () => router.push(`/assistant/${entry.id}`);

  const addToMine = () => {
    if (!source) return;
    save.mutate(source.shortcode, {
      onSuccess: (saved) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/recipe/${saved.id}`);
      },
      onError: (e) => Alert.alert(describeError(e).title, describeError(e).message),
    });
  };

  const resetToOriginal = () =>
    Alert.alert('Orijinal tarife dön', 'Sana göre yaptığın değişiklikler silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Orijinale dön', style: 'destructive', onPress: () => reset.mutate(entry.id) },
    ]);

  const confirmRemove = () =>
    Alert.alert('Tariflerimden çıkar', `“${recipe.title}” tariflerinden çıkarılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkar',
        style: 'destructive',
        onPress: () =>
          remove.mutate(entry.id, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert(describeError(e).title, describeError(e).message),
          }),
      },
    ]);

  // Everything secondary lives in one "…" menu to keep the screen calm.
  const openMenu = () => {
    const actions: { label: string; run: () => void; destructive?: boolean }[] = [
      { label: 'Paylaş', run: () => Share.share({ message: source ? `${recipe.title}\n${source.url}` : recipe.title }) },
    ];
    if (source) actions.push({ label: `Videoyu ${sourceName(source.shortcode)}’da aç`, run: () => Linking.openURL(source.url) });
    if (mine && entry.customized) actions.push({ label: 'Orijinal tarife dön', run: resetToOriginal });
    if (mine) actions.push({ label: 'Tariflerimden çıkar', run: confirmRemove, destructive: true });

    if (Platform.OS === 'ios') {
      const destructive = actions.findIndex((a) => a.destructive);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...actions.map((a) => a.label), 'Vazgeç'],
          cancelButtonIndex: actions.length,
          destructiveButtonIndex: destructive >= 0 ? destructive : undefined,
        },
        (i) => actions[i]?.run(),
      );
    } else {
      Alert.alert(recipe.title, undefined, [
        ...actions.map((a) => ({ text: a.label, onPress: a.run, style: a.destructive ? ('destructive' as const) : undefined })),
        { text: 'Vazgeç', style: 'cancel' },
      ]);
    }
  };

  const overline = [entry.origin === 'ai' ? 'Sana özel' : null, categoryLabel(recipe.category)].filter(Boolean).join(' · ');

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <StatusBar style={overPhoto || isDark ? 'light' : 'dark'} />
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={{ height: HERO_HEIGHT + insets.top, backgroundColor: colors.peach }}>
          {(entry.origin === 'ai' || entry.origin === 'voice') && !entry.imageUrl ? (
            <AiHero category={recipe.category} pending={entry.imageStatus === 'pending'} style={[StyleSheet.absoluteFill, { paddingTop: insets.top, paddingBottom: OVERLAP }]} />
          ) : (
            <VideoHero
              shortcode={source?.shortcode}
              imageUrl={entry.imageUrl}
              instagramUrl={source?.url}
              bottomInset={OVERLAP}
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>

        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.titleBlock}>
            <Text variant="overline" color="accentText">
              {upperTr(overline)}
            </Text>
            <Text variant="display" accessibilityRole="header">
              {recipe.title}
            </Text>
            {recipe.description ? (
              <Text variant="body" color="textSecondary">
                {recipe.description}
              </Text>
            ) : null}
            <TranslatedNote recipe={recipe} fromVideo={!!source} />
          </View>

          <MetaLine recipe={recipe} />

          <JournalNote entry={entry} />

          {entry.customized && (
            <View style={[styles.custom, { backgroundColor: colors.surfaceMuted }]}>
              <Icon name="color-wand-outline" size={18} color={colors.text} />
              <Text variant="subhead" style={styles.flex}>
                Sana göre uyarlandı{entry.customNote ? `: ${entry.customNote}` : ''}
              </Text>
              {mine && (
                <Pressable onPress={resetToOriginal} hitSlop={10} accessibilityRole="button" accessibilityLabel="Orijinal tarife dön">
                  <Text variant="subhead" weight="700" color="accentText">
                    Orijinal
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {entry.generation && <ChefNote generation={entry.generation} title={recipe.title} mine={mine} />}

          <VoiceMemo entry={entry} />

          <AdaptChips entry={entry} mine={mine} />

          <ListGroup>
            {source && <SourceCreator source={source} first />}
            <ListRow
              first={!source}
              leading={<ChefAvatar size={40} />}
              title="AI Şefe sor"
              subtitle="Eksik malzeme, porsiyon, süre… Tarifi sana göre uyarlar."
              onPress={openAssistant}
            />
          </ListGroup>

          <SegmentedControl
            label="Tarif bölümü"
            segments={[
              { value: 'ingredients' as Tab, label: 'Malzemeler' },
              ...(hasSteps ? [{ value: 'steps' as Tab, label: 'Yapılışı' }] : []),
              ...(hasNotes ? [{ value: 'notes' as Tab, label: 'İpuçları' }] : []),
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'ingredients' && (
            <View style={styles.tab}>
              {people != null && (
                <View style={[styles.servings, { borderColor: colors.border }]}>
                  <View style={styles.flex}>
                    <Text variant="headline">Kaç kişilik?</Text>
                    <Text variant="footnote" color="textSecondary">
                      {ingredientCount(recipe)} malzeme
                    </Text>
                  </View>
                  <ServingsStepper value={people} onChange={setServings} />
                </View>
              )}
              <IngredientChecklist groups={recipe.ingredient_groups} factor={factor} />
              <KitchenBar entry={entry} factor={factor} />
              <Text variant="footnote" color="textTertiary" align="center">
                Hazırladığın malzemeye dokunup işaretleyebilirsin
              </Text>
            </View>
          )}
          {tab === 'steps' && (
            <View style={styles.tab}>
              <Text variant="footnote" color="textSecondary">
                {recipe.steps.length} adım · “Pişirmeye başla” ile adım adım ilerleyebilirsin
              </Text>
              <StepList recipe={recipe} />
            </View>
          )}
          {tab === 'notes' && <NotesCard recipe={recipe} />}
        </View>
      </Animated.ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.bar,
          { height: insets.top + 60, paddingTop: insets.top, backgroundColor: colors.surface, borderBottomColor: colors.border },
          barStyle,
        ]}>
        <Text variant="headline" numberOfLines={1} style={[styles.barTitle, { marginRight: !mine && source ? 176 : 76 }]}>
          {recipe.title}
        </Text>
      </Animated.View>

      <View style={[styles.floating, { top: insets.top + 8 }]} pointerEvents="box-none">
        <IconButton icon="chevron-back" label="Geri" tone="overlay" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <View style={styles.floatingRight}>
          {!mine && source && <SavePill onPress={addToMine} busy={save.isPending} />}
          <IconButton icon="ellipsis-horizontal" label="Diğer seçenekler" tone="overlay" onPress={openMenu} />
        </View>
      </View>

      <StickyFooter style={styles.footer}>
        {hasSteps ? (
          <>
            <Button title="Sor" icon="chatbubble-ellipses-outline" variant="secondary" onPress={openAssistant} style={styles.ask} />
            <Button title="Pişirmeye başla" trailingIcon="arrow-forward" onPress={() => router.push(`/cook/${entry.id}`)} style={styles.flex} />
          </>
        ) : (
          <Button title="AI Şefe sor" icon="chatbubble-ellipses-outline" onPress={openAssistant} style={styles.flex} />
        )}
      </StickyFooter>
    </View>
  );
}

/** "Kaydet" over the photo: a labeled white pill, clearer than a bare bookmark glyph. */
function SavePill({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel="Tariflerime kaydet"
      style={({ pressed }) => [styles.savePill, { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 }]}>
      {busy ? <ActivityIndicator size="small" color={colors.text} /> : <Icon name="bookmark-outline" size={17} color={colors.text} />}
      <Text variant="subhead" weight="700">
        Kaydet
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  sheet: {
    marginTop: -OVERLAP,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: ScreenPadding,
    paddingTop: 26,
    gap: 22,
  },
  titleBlock: { gap: 8 },
  custom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 52, borderRadius: Radius.md },
  tab: { gap: 16 },
  servings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  barTitle: { marginLeft: ScreenPadding + 56 },
  floating: { position: 'absolute', left: ScreenPadding, right: ScreenPadding, flexDirection: 'row', justifyContent: 'space-between' },
  floatingRight: { flexDirection: 'row', gap: 10 },
  savePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    boxShadow: '0 2px 10px rgba(0,0,0,0.16)',
  },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10 },
  ask: { minWidth: 104 },
});
