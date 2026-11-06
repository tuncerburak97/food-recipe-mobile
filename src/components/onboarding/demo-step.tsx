import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StickyFooter } from '@/components/ui/layout';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { formatAmount, formatMinutes, ingredientCount, servingsText, totalMinutes, upperTr } from '@/lib/format';
import type { Recipe, RecipeEntry } from '@/lib/types';

const SAMPLES = 3;
/** The "working" moment lasts at least this long, so each stage can be read (ms). */
const STAGE_MS = 850;
const STAGES = ['Video izleniyor', 'Videoda anlatılanlar dinleniyor', 'Malzemeler ayıklanıyor', 'Adımlar yazılıyor'];

type Phase = 'pick' | 'working' | 'done';

/** Videos from Instagram that already have a good recipe: Turkish first, with enough ingredients. */
function pickSamples(items: RecipeEntry[]): RecipeEntry[] {
  const good = items.filter((e) => e.origin === 'instagram' && e.source?.shortcode && e.imageUrl && ingredientCount(e.recipe) >= 5);
  const ranked = [...good.filter((e) => e.recipe.language === 'tr'), ...good.filter((e) => e.recipe.language !== 'tr')];
  // One video per account first, so the samples look like different creators.
  const owners = new Set<string>();
  const varied = ranked.filter((e) => {
    const owner = e.source?.ownerUsername ?? '';
    if (owners.has(owner)) return false;
    owners.add(owner);
    return true;
  });
  return [...varied, ...ranked.filter((e) => !varied.includes(e))].slice(0, SAMPLES);
}

/**
 * Onboarding's first real moment: the user picks a sample Instagram video and watches it turn into
 * the recipe the app made from it. The recipe is then added to the user's book, so "Tariflerim" is
 * not empty on the first visit.
 */
export function DemoStep({ onNext }: { onNext: () => void }) {
  const insets = useSafeAreaInsets();
  const samples = useQuery({
    queryKey: ['onboarding', 'samples'],
    queryFn: async () => pickSamples((await api.listRecipes({ scope: 'all', limit: 60 })).items),
    staleTime: 10 * 60_000,
  });
  const [chosen, setChosen] = useState(0);
  const [phase, setPhase] = useState<Phase>('pick');
  const [stage, setStage] = useState(0);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [saved, setSaved] = useState(false);
  const list = samples.data ?? [];
  const entry = list[chosen];

  const run = async () => {
    if (!entry?.source) return;
    setPhase('working');
    setStage(0);
    const shortcode = entry.source.shortcode;
    const timers = STAGES.map((_, i) =>
      setTimeout(() => {
        setStage(i + 1);
        Haptics.selectionAsync();
      }, STAGE_MS * (i + 1)),
    );
    // The sample's recipe was made from this video by the same pipeline; asking the server again
    // could start a slow re-extraction, so the stages only pace the reveal.
    await new Promise((r) => setTimeout(r, STAGE_MS * STAGES.length + 400));
    const r: Recipe = entry.recipe;
    timers.forEach(clearTimeout);
    setStage(STAGES.length);
    setRecipe(r);
    setPhase('done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Into the user's book; a failure here only means the line below stays hidden.
    api
      .saveRecipe(shortcode)
      .then(() => setSaved(true))
      .catch(() => {});
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 28 }]} showsVerticalScrollIndicator={false}>
        {phase === 'pick' && (
          <Animated.View entering={FadeIn.duration(260)} style={styles.block}>
            <View style={styles.header}>
              <Text variant="overline" color="accentText">
                {upperTr('Canlı deneme · 20 saniye')}
              </Text>
              <Text variant="display" accessibilityRole="header">
                Önce sihri kendin gör
              </Text>
              <Text variant="body" color="textSecondary">
                Instagram’dan ya da YouTube’dan bir yemek videosu seç. Malzemeleri ve adımlarıyla tarife dönüşmesini izle.
              </Text>
            </View>
            {samples.isPending ? (
              <SampleSkeleton />
            ) : list.length ? (
              <>
                <View style={styles.samples}>
                  {list.map((e, i) => (
                    <ReelCard key={e.id} entry={e} index={i} selected={i === chosen} onPress={() => setChosen(i)} />
                  ))}
                </View>
                <Outcome />
              </>
            ) : (
              <Text variant="callout" color="textSecondary">
                Örnek videolara şu an ulaşılamadı. Bu adımı geçip hemen başlayabilirsin.
              </Text>
            )}
          </Animated.View>
        )}

        {phase === 'working' && entry && <Working entry={entry} stage={stage} />}
        {phase === 'done' && entry && recipe && <Reveal entry={entry} recipe={recipe} saved={saved} />}
      </ScrollView>

      <StickyFooter style={styles.footer}>
        {phase === 'pick' && list.length > 0 && (
          <Button title="Bu videoyu tarife çevir" icon="sparkles" onPress={run} disabled={!entry} />
        )}
        {phase === 'pick' && (
          <Button title={list.length || samples.isPending ? 'Şimdilik geç' : 'Devam'} variant={list.length || samples.isPending ? 'ghost' : 'primary'} size="md" onPress={onNext} />
        )}
        {phase === 'working' && <Button title="Tarif hazırlanıyor" loading disabled onPress={() => {}} />}
        {phase === 'done' && <Button title="Harika! Şimdi seni tanıyalım" trailingIcon="arrow-forward" onPress={onNext} />}
      </StickyFooter>
    </View>
  );
}

const OUTCOME = [
  { emoji: '🧺', text: 'Ölçüleriyle malzemeler' },
  { emoji: '👣', text: 'Adım adım yapılış' },
  { emoji: '⏱', text: 'Süre, porsiyon ve ipuçları' },
];

/** What the user gets from a video, under the samples. */
function Outcome() {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(320).duration(340)} style={[styles.outcome, { backgroundColor: colors.surfaceMuted }]}>
      <Text variant="overline" color="textTertiary">
        {upperTr('Videodan çıkanlar')}
      </Text>
      {OUTCOME.map((o) => (
        <View key={o.text} style={styles.outcomeRow}>
          <Text style={styles.outcomeEmoji}>{o.emoji}</Text>
          <Text variant="callout" weight="600">
            {o.text}
          </Text>
        </View>
      ))}
    </Animated.View>
  );
}

function SampleSkeleton() {
  return (
    <SkeletonPulse style={styles.samples}>
      {Array.from({ length: SAMPLES }, (_, i) => (
        <SkeletonBlock key={i} height={210} radius={Radius.lg} style={styles.sampleSlot} />
      ))}
    </SkeletonPulse>
  );
}

/** A sample video as a small, tall reel: the photo, the account and the dish name. */
function ReelCard({ entry, index, selected, onPress }: { entry: RecipeEntry; index: number; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 70).duration(340)} style={styles.sampleSlot}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected, checked: selected }}
        accessibilityLabel={`${entry.recipe.title}, @${entry.source?.ownerUsername} videosu`}
        style={[styles.reel, { borderColor: selected ? colors.accent : 'transparent' }]}>
        <Image source={entry.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        <LinearGradient colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.75)']} style={StyleSheet.absoluteFill} />
        <View style={styles.reelTop}>
          <View style={styles.igBadge}>
            <Icon name="logo-instagram" size={13} color="#fff" />
          </View>
          {selected && (
            <Animated.View entering={ZoomIn.duration(200)} style={[styles.check, { backgroundColor: colors.accent }]}>
              <Icon name="checkmark" size={13} color="#fff" />
            </Animated.View>
          )}
        </View>
        <View style={styles.reelBottom}>
          <Text variant="caption" tint="rgba(255,255,255,0.8)" numberOfLines={1}>
            @{entry.source?.ownerUsername}
          </Text>
          <Text variant="footnote" weight="700" tint="#fff" numberOfLines={3}>
            {entry.recipe.title}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** The chosen video with a scanning light over it, and the stages ticking off below. */
function Working({ entry, stage }: { entry: RecipeEntry; stage: number }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(200, width * 0.46);
  const cardHeight = cardWidth * 1.5;
  const scan = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    scan.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true);
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
  }, [scan, glow]);

  const scanStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scan.value * (cardHeight - 60) }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.25 + glow.value * 0.45, transform: [{ scale: 1 + glow.value * 0.04 }] }));

  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.working}>
      <View style={{ width: cardWidth, height: cardHeight }}>
        <Animated.View style={[styles.glow, { backgroundColor: colors.accent, borderRadius: Radius.xl + 6 }, glowStyle]} />
        <View style={[styles.workingReel, { borderRadius: Radius.xl }]}>
          <Image source={entry.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,12,16,0.25)' }]} />
          <Animated.View style={[styles.scan, scanStyle]}>
            <LinearGradient colors={['rgba(236,122,78,0)', 'rgba(236,122,78,0.55)', 'rgba(255,255,255,0.9)']} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      </View>

      <View style={styles.header}>
        <Text variant="title" align="center" accessibilityRole="header">
          Video tarife dönüşüyor
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          @{entry.source?.ownerUsername} videosu inceleniyor
        </Text>
      </View>

      <View style={[styles.stages, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLiveRegion="polite">
        {STAGES.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <View key={label} style={[styles.stageRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={styles.stageMark}>
                {done ? (
                  <Animated.View entering={ZoomIn.springify().damping(12)}>
                    <Icon name="checkmark-circle" size={22} color={colors.success} />
                  </Animated.View>
                ) : active ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <View style={[styles.stageDot, { borderColor: colors.border }]} />
                )}
              </View>
              <Text variant="callout" weight={done || active ? '600' : '500'} color={done ? 'text' : active ? 'textSecondary' : 'textTertiary'}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

/** The finished recipe, revealed piece by piece: title, facts, ingredients, the first steps. */
function Reveal({ entry, recipe, saved }: { entry: RecipeEntry; recipe: Recipe; saved: boolean }) {
  const { colors } = useTheme();
  const ingredients = recipe.ingredient_groups.flatMap((g) => g.ingredients);
  const shown = ingredients.slice(0, 10);
  const steps = recipe.steps.slice(0, 3);
  const minutes = totalMinutes(recipe);
  const facts = [
    minutes ? `⏱  ${formatMinutes(minutes)}` : null,
    servingsText(recipe) ? `🍽  ${servingsText(recipe)}` : null,
    `🧺  ${ingredients.length} malzeme`,
    `👣  ${recipe.steps.length} adım`,
  ].filter(Boolean) as string[];

  return (
    <View style={styles.block}>
      <Animated.View entering={FadeInDown.duration(320)} style={styles.from}>
        <Image source={entry.imageUrl} style={styles.thumb} contentFit="cover" />
        <View style={styles.flex}>
          <Text variant="overline" color="success">
            {upperTr('Tarif hazır')}
          </Text>
          <Text variant="subhead" color="textSecondary" numberOfLines={1}>
            @{entry.source?.ownerUsername} videosundan
          </Text>
        </View>
        <Animated.View entering={ZoomIn.delay(150).springify().damping(10)} style={[styles.doneBadge, { backgroundColor: colors.successSoft }]}>
          <Icon name="checkmark" size={18} color={colors.success} />
        </Animated.View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(340)} style={styles.header}>
        <Text variant="display" accessibilityRole="header">
          {recipe.title}
        </Text>
        <View style={styles.facts}>
          {facts.map((f) => (
            <View key={f} style={[styles.fact, { backgroundColor: colors.surfaceMuted }]}>
              <Text variant="footnote" weight="600">
                {f}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={styles.section}>
        <Animated.View entering={FadeIn.delay(260)}>
          <Text variant="title3">Malzemeler</Text>
        </Animated.View>
        <View style={styles.ingredients}>
          {shown.map((ing, i) => {
            const amount = formatAmount(ing);
            return (
              <Animated.View
                key={`${ing.name}-${i}`}
                entering={ZoomIn.delay(320 + i * 70).springify().damping(14)}
                style={[styles.ingredient, { backgroundColor: colors.accentSoft }]}>
                <Text variant="subhead" weight="600" color="accentText">
                  {amount ? `${amount} ` : ''}
                </Text>
                <Text variant="subhead" weight="600">
                  {ing.name}
                </Text>
              </Animated.View>
            );
          })}
          {ingredients.length > shown.length && (
            <Animated.View entering={ZoomIn.delay(320 + shown.length * 70)} style={[styles.ingredient, { backgroundColor: colors.surfaceMuted }]}>
              <Text variant="subhead" weight="600" color="textSecondary">
                +{ingredients.length - shown.length}
              </Text>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Animated.View entering={FadeIn.delay(400 + shown.length * 70)}>
          <Text variant="title3">Adımlar</Text>
        </Animated.View>
        {steps.map((s, i) => (
          <Animated.View key={s.order} entering={FadeInDown.delay(480 + shown.length * 70 + i * 140).duration(320)} style={styles.step}>
            <View style={[styles.stepNo, { backgroundColor: colors.ink }]}>
              <Text variant="footnote" weight="700" color="onInk">
                {i + 1}
              </Text>
            </View>
            <Text variant="callout" numberOfLines={3} style={styles.flex}>
              {s.text}
            </Text>
          </Animated.View>
        ))}
      </View>

      {saved && (
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.saved, { backgroundColor: colors.successSoft }]}>
          <Icon name="bookmark" size={16} color={colors.success} />
          <Text variant="subhead" weight="600" color="success" style={styles.flex}>
            Bu tarif Tariflerim’e eklendi. Uygulamada seni bekliyor.
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: 28 },
  block: { gap: 22 },
  header: { gap: 10 },
  footer: { borderTopWidth: 0, gap: 6 },
  samples: { flexDirection: 'row', gap: 10 },
  outcome: { borderRadius: Radius.lg, padding: 16, gap: 10 },
  outcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  outcomeEmoji: { fontSize: 18, lineHeight: 22 },
  sampleSlot: { flex: 1 },
  reel: { aspectRatio: 9 / 16, borderRadius: Radius.lg, overflow: 'hidden', borderWidth: 2.5, backgroundColor: '#111' },
  reelTop: { flexDirection: 'row', justifyContent: 'space-between', padding: 8 },
  igBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reelBottom: { position: 'absolute', left: 8, right: 8, bottom: 8, gap: 2 },
  working: { alignItems: 'center', gap: 24, paddingTop: 12 },
  glow: { ...StyleSheet.absoluteFill, margin: -6 },
  workingReel: { flex: 1, overflow: 'hidden', backgroundColor: '#111' },
  scan: { position: 'absolute', left: 0, right: 0, top: 0, height: 60 },
  stages: { alignSelf: 'stretch', borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16 },
  stageMark: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  stageDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5 },
  from: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 44, height: 56, borderRadius: 10 },
  doneBadge: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fact: { paddingHorizontal: 12, height: 32, borderRadius: Radius.pill, justifyContent: 'center' },
  section: { gap: 12 },
  ingredients: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingredient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 34, borderRadius: Radius.pill },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNo: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: Radius.md },
});
