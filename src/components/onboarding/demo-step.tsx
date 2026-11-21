import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { VideoPlayer } from 'expo-video';
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

import { RecipeImage } from '@/components/recipe/recipe-image';
import { RecipePreview } from '@/components/recipe/recipe-preview';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StickyFooter } from '@/components/ui/layout';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppConfig } from '@/lib/access';
import { api } from '@/lib/api';
import { ingredientCount, upperTr } from '@/lib/format';
import type { RecipeEntry } from '@/lib/types';

const SAMPLES = 3;
/** The "working" moment lasts at least this long, so each stage can be read (ms). */
const STAGE_MS = 850;
const STAGES = ['Video izleniyor', 'Videoda anlatılanlar dinleniyor', 'Malzemeler ayıklanıyor', 'Adımlar yazılıyor'];

type Phase = 'pick' | 'working' | 'done';

/**
 * Videos from Instagram that already have a good recipe. The ones the server names (links or
 * shortcodes, in its order) come first; the rest are Turkish first, with enough ingredients.
 */
function pickSamples(items: RecipeEntry[], wanted: string[]): RecipeEntry[] {
  const usable = items.filter((e) => e.origin === 'instagram' && e.source?.shortcode && e.imageUrl);
  const named = wanted.map((w) => usable.find((e) => w.includes(e.source!.shortcode))).filter((e): e is RecipeEntry => e != null);
  const good = usable.filter((e) => !named.includes(e) && ingredientCount(e.recipe) >= 5);
  const ranked = [...named, ...good.filter((e) => e.recipe.language === 'tr'), ...good.filter((e) => e.recipe.language !== 'tr')];
  // One video per account first, so the samples look like different creators.
  const owners = new Set<string>();
  const varied = ranked.filter((e) => {
    const owner = e.source?.ownerUsername ?? '';
    if (named.includes(e)) return true;
    if (owners.has(owner)) return false;
    owners.add(owner);
    return true;
  });
  return [...varied, ...ranked.filter((e) => !varied.includes(e))].slice(0, SAMPLES);
}

/**
 * The sample videos of the demo. The onboarding screen asks for them as it opens, so the first
 * one's video can load while the questions are answered.
 */
export function useDemoSamples(enabled: boolean) {
  const { demo } = useAppConfig().billing.onboarding;
  const wanted = demo.samples.join('|');
  return useQuery({
    queryKey: ['onboarding', 'samples', wanted],
    queryFn: async () => pickSamples((await api.listRecipes({ scope: 'all', limit: 60 })).items, demo.samples),
    staleTime: 10 * 60_000,
    enabled,
  });
}

interface Props {
  samples: RecipeEntry[];
  loading: boolean;
  /** Which sample is picked; the onboarding screen keeps it, since it loads that one's video. */
  chosen: number;
  onChoose: (index: number) => void;
  /** The picked sample's video, already loading (null where it cannot be played in the app). */
  player: VideoPlayer | null;
  onNext: () => void;
}

/**
 * Onboarding's live demo, after the questions: the user tries the app with a sample link. They
 * pick a sample Instagram video, watch it being worked on, and get the recipe the app made from
 * it, shown as the app shows every recipe (the video on top, playable). The recipe is then added
 * to the user's book, so "Tariflerim" is not empty on the first visit. The wording and which
 * videos are offered come from the server (billing.onboarding.demo).
 */
export function DemoStep({ samples, loading, chosen, onChoose, player, onNext }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { demo } = useAppConfig().billing.onboarding;
  const [phase, setPhase] = useState<Phase>('pick');
  const [stage, setStage] = useState(0);
  const [saved, setSaved] = useState(false);
  const entry = samples[chosen];

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
    timers.forEach(clearTimeout);
    setStage(STAGES.length);
    setPhase('done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Into the user's book; a failure here only changes the line over the recipe's name.
    api
      .saveRecipe(shortcode)
      .then(() => setSaved(true))
      .catch(() => {});
  };

  if (phase === 'done' && entry) {
    return (
      <RecipePreview
        entry={entry}
        player={player}
        banner={
          <View style={[styles.ready, { backgroundColor: colors.successSoft }]}>
            <Icon name="checkmark-circle" size={18} color={colors.success} />
            <Text variant="subhead" weight="600" color="success" style={styles.flex}>
              {saved ? 'Tarif hazır ve Tariflerim’e eklendi.' : 'Tarif hazır. Videodan çıkanların hepsi burada.'}
            </Text>
          </View>
        }
        footer={
          <Button
            title={demo.done_cta}
            trailingIcon="arrow-forward"
            onPress={() => {
              // The video belongs to the onboarding screen and outlives this step: stop it here.
              player?.pause();
              onNext();
            }}
          />
        }
      />
    );
  }

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
                {demo.title}
              </Text>
              <Text variant="body" color="textSecondary">
                {demo.subtitle}
              </Text>
            </View>
            {loading ? (
              <SampleSkeleton />
            ) : samples.length ? (
              <>
                <View style={styles.samples}>
                  {samples.map((e, i) => (
                    <ReelCard key={e.id} entry={e} index={i} selected={i === chosen} onPress={() => onChoose(i)} />
                  ))}
                </View>
                {entry?.source ? <SampleLink shortcode={entry.source.shortcode} /> : null}
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
      </ScrollView>

      <StickyFooter style={styles.footer}>
        {phase === 'pick' && samples.length > 0 && <Button title={demo.cta} icon="sparkles" onPress={run} disabled={!entry} />}
        {phase === 'pick' && (
          <Button title={samples.length || loading ? demo.skip : 'Devam'} variant={samples.length || loading ? 'ghost' : 'primary'} size="md" onPress={onNext} />
        )}
        {phase === 'working' && <Button title="Tarif hazırlanıyor" loading disabled onPress={() => {}} />}
      </StickyFooter>
    </View>
  );
}

/** The chosen sample as the link the user would paste: what goes in is a link, what comes out a recipe. */
function SampleLink({ shortcode }: { shortcode: string }) {
  const { colors } = useTheme();
  const link = `instagram.com/reel/${shortcode}`;
  return (
    <View style={[styles.link, { backgroundColor: colors.surface, borderColor: colors.border }]} accessible accessibilityLabel={`Örnek link: ${link}`}>
      <Icon name="link-outline" size={18} color={colors.textSecondary} />
      <View style={styles.flex}>
        <Text variant="caption" color="textTertiary">
          {upperTr('Örnek link')}
        </Text>
        <Text variant="subhead" numberOfLines={1}>
          {link}
        </Text>
      </View>
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
        <RecipeImage uri={entry.imageUrl} style={StyleSheet.absoluteFill} placeholderSize={56} transition={200} />
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

/** The chosen video's cover with a scanning light over it, and the stages ticking off below. */
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
          <RecipeImage uri={entry.imageUrl} style={StyleSheet.absoluteFill} placeholderSize={72} />
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

const styles = StyleSheet.create({
  page: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: 28 },
  block: { gap: 22 },
  header: { gap: 10 },
  footer: { borderTopWidth: 0, gap: 6 },
  samples: { flexDirection: 'row', gap: 10 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
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
  ready: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: Radius.md },
});
