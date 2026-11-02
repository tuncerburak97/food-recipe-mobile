import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { FadeInDown, FadeInLeft, FadeInRight, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Celebration, FinishedFooter, FinishedSummary } from '@/components/cook/cook-done';
import { VoiceControl } from '@/components/cook/voice-control';
import { StepIngredients } from '@/components/cook/step-ingredients';
import { StepRail } from '@/components/cook/step-rail';
import { StepTimer } from '@/components/cook/step-timer';
import { TimerTray } from '@/components/cook/timer-tray';
import { DishPlaceholder } from '@/components/recipe/ai-hero';
import { IngredientChecklist } from '@/components/recipe/ingredient-checklist';
import { VideoHero } from '@/components/recipe/video-hero';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { StickyFooter } from '@/components/ui/layout';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { companionLine } from '@/lib/companion';
import { formatMinutes, HEAT_LABELS, isEstimated } from '@/lib/format';
import { useMe, useRecipe } from '@/lib/queries';
import { stepClip } from '@/lib/step-clip';
import type { Recipe, Step } from '@/lib/types';
import { markStepDone, resetProgress, startCooking, undoStep, useCookProgress } from '@/store/cook-progress';
import { removeTimer, timerId } from '@/store/timers';

const PHOTO_HEIGHT = 240;
/** How far the white sheet rises over the video / photo. */
const OVERLAP = 28;
const CELEBRATE_MS = 700;
const UNDO_MS = 8000;
/** Height of the main button and the round controls beside it. */
const CONTROL = 56;

/**
 * Cooking mode, like a friend in the kitchen. The reel stays on top so it can be watched while
 * cooking; a white sheet rises over it with the road through the recipe and one page at a time:
 * the ingredients first, then one step per page. Each step is completed with "Tamamladım" (a short
 * celebration, then the next step); done steps stay marked on the road and can be undone at any
 * time. Nothing moves on by itself, and the screen stays on while cooking.
 */
export default function CookScreen() {
  useKeepAwake();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const query = useRecipe(id);
  const entry = query.data;
  const first = useMe().data?.name?.trim().split(' ')[0];
  const name = first && first !== 'Misafir' ? first : undefined;
  const progress = useCookProgress(entry?.id);
  const [page, setPage] = useState(0); // 0 = ingredients, 1..n = steps, n + 1 = finished
  const [forward, setForward] = useState(true);
  const [celebrating, setCelebrating] = useState<number | null>(null);
  const [undo, setUndo] = useState<{ order: number; page: number } | null>(null);
  const [overMedia, setOverMedia] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scroller = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(0);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (!entry) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.surface }]}>
        <ScreenHeader leading="close" tone="muted" />
        {query.isError ? (
          <ErrorState
            title="Tarif açılamadı"
            message="Bağlantını kontrol edip tekrar dene."
            onRetry={() => query.refetch()}
            retrying={query.isFetching}
          />
        ) : (
          <LoadingState label="Tarif yükleniyor" />
        )}
      </View>
    );
  }

  const { recipe } = entry;
  const total = recipe.steps.length;
  const finished = page > total;
  const step = page > 0 && !finished ? recipe.steps[page - 1] : undefined;
  const last = page === total;
  const isDone = step ? progress.done.includes(step.order) : false;
  const group = step?.group_id ? recipe.ingredient_groups.find((g) => g.id === step.group_id) : undefined;
  const timed = step?.duration_minutes != null && step.duration_minutes > 0;
  const hasMedia = !!(entry.source || entry.imageUrl);
  const busy = celebrating != null;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  // A new page starts with the road and the step's first line in view, not where the last one was
  // scrolled to. A strip of the video stays above the sheet so the close button never covers the road.
  const showStepTop = () => {
    const sheetY = PHOTO_HEIGHT - OVERLAP - 64;
    if (scrollY.current > sheetY) scroller.current?.scrollTo({ y: sheetY, animated: true });
  };
  const go = (next: number) => {
    Haptics.selectionAsync();
    setForward(next >= page);
    setPage(next);
    showStepTop();
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const complete = () => {
    if (busy) return;
    if (page === 0) {
      startCooking(entry.id);
      go(1);
      return;
    }
    if (!step) return;
    if (isDone) {
      go(page + 1);
      return;
    }
    markStepDone(entry.id, step.order, last);
    // A step finished early needs no timer any more: stop it, its alarm and the lock screen countdown.
    removeTimer(timerId(entry.id, step.order));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCelebrating(page);
    const from = page;
    later(() => {
      setCelebrating(null);
      setForward(true);
      setPage(from + 1);
      showStepTop();
      if (from < total) {
        setUndo({ order: step.order, page: from });
        later(() => setUndo((u) => (u?.page === from ? null : u)), UNDO_MS);
      }
    }, CELEBRATE_MS);
  };

  const revert = (order: number, at: number) => {
    Haptics.selectionAsync();
    undoStep(entry.id, order);
    setUndo(null);
    setForward(false);
    setPage(at);
    showStepTop();
  };

  const minutes =
    progress.startedAt && progress.finishedAt ? Math.max(1, Math.round((progress.finishedAt - progress.startedAt) / 60_000)) : null;
  const mainLabel = page === 0 ? 'Hazırım, başlayalım' : isDone ? (last ? 'Bitir' : 'Sıradaki adım') : last ? 'Tamamladım, bitir' : 'Tamamladım';
  const hints = step ? stepFacts(recipe, step, timed) : [];

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <StatusBar style={(overMedia && hasMedia) || isDark ? 'light' : 'dark'} />
      {/* Shown only when the page is pulled down past the top: the media color, not the white sheet. */}
      <View style={[styles.backdrop, { height: PHOTO_HEIGHT + insets.top, backgroundColor: colors.peach }]} />

      <ScrollView
        ref={scroller}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollY.current = y;
          const over = y < PHOTO_HEIGHT - OVERLAP - 40;
          if (over !== overMedia) setOverMedia(over);
        }}
        scrollEventThrottle={32}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={{ height: PHOTO_HEIGHT + insets.top, backgroundColor: colors.peach }}>
          {entry.source ? (
            // The reel stays at the top so it can be watched while cooking; it stops above the sheet.
            <VideoHero
              shortcode={entry.source.shortcode}
              imageUrl={entry.imageUrl}
              instagramUrl={entry.source.url}
              bottomInset={OVERLAP}
              clip={stepClip(step)}
              style={StyleSheet.absoluteFill}
            />
          ) : entry.imageUrl ? (
            <Image source={entry.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            // Centered in the visible part: below the status bar, above the sheet.
            <View style={[styles.placeholder, { top: insets.top }]}>
              <DishPlaceholder category={recipe.category} size={64} />
            </View>
          )}
        </View>

        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <StepRail steps={recipe.steps.map((s) => s.order)} done={progress.done} page={page} onOpen={(p) => !busy && go(p)} />

          <Animated.View key={page} entering={(forward ? FadeInRight : FadeInLeft).duration(240)} style={styles.body}>
            {finished ? (
              <FinishedSummary entry={entry} name={name} total={total} doneCount={progress.done.length} minutes={minutes} />
            ) : step ? (
              <>
                <View style={styles.stepTop}>
                  <View style={styles.stepHead}>
                    <Text variant="numeral" color="accentText" accessibilityLabel={`Adım ${page}, toplam ${total}`}>
                      {page}
                    </Text>
                    <Text variant="title2" weight="600" color="textTertiary" style={styles.of} importantForAccessibility="no" accessibilityElementsHidden>
                      / {total}
                    </Text>
                    <View style={styles.flex} />
                    {isDone && <Tag tone="success" icon="checkmark-circle" label="Tamamlandı" style={styles.doneTag} />}
                  </View>

                  <Text variant="title" weight="500" color={isDone ? 'textSecondary' : 'text'} style={styles.instruction}>
                    {step.text}
                  </Text>

                  {hints.length > 0 && (
                    <View style={styles.tags}>
                      {hints.map((h) => (
                        <Tag key={h.label} icon={h.icon} label={h.label} />
                      ))}
                    </View>
                  )}
                </View>

                {isDone ? (
                  <Card tone="muted" style={styles.doneCard}>
                    <View style={styles.doneRow}>
                      <Icon name="checkmark-circle" size={22} color={colors.success} />
                      <Text variant="headline" style={styles.flex}>
                        Bu adımı tamamladın.
                      </Text>
                      <Button
                        title="Geri al"
                        icon="arrow-undo-outline"
                        variant="outline"
                        size="md"
                        onPress={() => revert(step.order, page)}
                        accessibilityHint="Tamamlandı işaretini kaldırır"
                      />
                    </View>
                  </Card>
                ) : (
                  <Card tone="warm">
                    <Text variant="body">{companionLine({ step, index: page, total, doneCount: progress.done.length, name })}</Text>
                  </Card>
                )}

                {timed && (
                  <StepTimer
                    key={step.order}
                    entryId={entry.id}
                    recipeTitle={recipe.title}
                    stepOrder={step.order}
                    stepText={step.text}
                    minutes={step.duration_minutes ?? 0}
                    estimated={isEstimated(recipe, 'step_durations')}
                  />
                )}

                {group && <StepIngredients group={group} />}
              </>
            ) : (
              <>
                <View style={styles.stepTop}>
                  <Text variant="display" accessibilityRole="header">
                    Malzemeleri hazırla
                  </Text>
                  <Text variant="body" color="textSecondary">
                    {total} adım seni bekliyor.
                  </Text>
                </View>
                <Card tone="warm">
                  <Text variant="body">
                    {name ? `Hoş geldin ${name}. ` : ''}Önce her şeyi tezgaha çıkaralım. Hazırladıklarına dokunup işaretleyebilirsin.
                  </Text>
                </Card>
                <IngredientChecklist groups={recipe.ingredient_groups} />
              </>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      <VoiceControl entryId={entry.id} recipe={recipe} page={page} onGo={(p) => !busy && go(p)} onComplete={complete} />

      <IconButton
        icon="close"
        label="Pişirme modunu kapat"
        tone="overlay"
        onPress={close}
        style={[styles.close, { top: insets.top + 8 }]}
      />

      {finished ? (
        // Cook journal: "Günlüğe kaydet" is the main action once something is entered on the page.
        <FinishedFooter
          entry={entry}
          onClose={close}
          onReview={() => go(1)}
          onRestart={() => {
            resetProgress(entry.id);
            go(0);
          }}
        />
      ) : (
        <StickyFooter>
          {undo && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              exiting={FadeOutDown.duration(200)}
              accessibilityLiveRegion="polite"
              style={[styles.undo, { backgroundColor: colors.ink }]}>
              <Icon name="checkmark-circle" size={20} color={colors.onInk} />
              <Text variant="headline" tint={colors.onInk} style={styles.flex} numberOfLines={1}>
                Adım {undo.page} tamamlandı
              </Text>
              <Pressable
                onPress={() => revert(undo.order, undo.page)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Adım ${undo.page} işaretini geri al`}
                style={({ pressed }) => [styles.undoAction, { borderColor: `${colors.onInk}59`, opacity: pressed ? 0.7 : 1 }]}>
                <Text variant="subhead" weight="700" tint={colors.onInk}>
                  Geri al
                </Text>
              </Pressable>
            </Animated.View>
          )}
          <TimerTray
            entryId={entry.id}
            currentStep={step?.order}
            onOpen={(order) => !busy && go(recipe.steps.findIndex((s) => s.order === order) + 1)}
          />
          <View style={styles.row}>
            <IconButton
              icon="chevron-back"
              label="Önceki adım"
              tone="muted"
              size={CONTROL}
              disabled={page === 0}
              onPress={() => !busy && go(page - 1)}
            />
            <Button
              title={mainLabel}
              icon={step && !isDone ? 'checkmark' : undefined}
              trailingIcon={page === 0 || isDone ? 'arrow-forward' : null}
              onPress={complete}
              style={styles.main}
            />
            <IconButton
              icon="play-skip-forward-outline"
              label="İşaretlemeden sonraki adıma geç"
              tone="muted"
              size={CONTROL}
              disabled={page === 0}
              onPress={() => !busy && go(page + 1)}
            />
          </View>
        </StickyFooter>
      )}

      {celebrating != null && <Celebration index={celebrating} total={total} />}
    </View>
  );
}

/**
 * Temperature and heat of a step (and its time when there is no timer card to show it), each with
 * its own glyph: ["200°C", "Kısık ateş"].
 */
function stepFacts(recipe: Recipe, step: Step, timed: boolean): { icon: IconName; label: string }[] {
  const out: { icon: IconName; label: string }[] = [];
  if (!timed && step.duration_minutes != null && step.duration_minutes > 0) {
    const t = formatMinutes(step.duration_minutes);
    out.push({ icon: 'time-outline', label: isEstimated(recipe, 'step_durations') ? `yaklaşık ${t}` : t });
  }
  if (step.temperature_c != null) out.push({ icon: 'thermometer-outline', label: `${step.temperature_c}°C` });
  if (step.heat) out.push({ icon: 'flame-outline', label: HEAT_LABELS[step.heat] });
  return out;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0 },
  placeholder: { position: 'absolute', left: 0, right: 0, bottom: OVERLAP },
  content: { flexGrow: 1 },
  sheet: {
    flexGrow: 1,
    marginTop: -OVERLAP,
    paddingTop: 18,
    paddingBottom: 32,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
  },
  body: { paddingHorizontal: ScreenPadding, paddingTop: 20, gap: 20 },
  stepTop: { gap: 12 },
  stepHead: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  of: { fontVariant: ['tabular-nums'] },
  doneTag: { alignSelf: 'center' },
  // Read from arm's length: large, medium weight, generous lines.
  instruction: { fontSize: 22, lineHeight: 31, letterSpacing: -0.2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  doneCard: { paddingVertical: 12 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  close: { position: 'absolute', right: ScreenPadding },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  main: { flex: 1, minHeight: CONTROL },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingLeft: 16, paddingRight: 8, borderRadius: Radius.lg },
  undoAction: { minHeight: 40, paddingHorizontal: 16, borderRadius: Radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
