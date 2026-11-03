import * as Haptics from 'expo-haptics';
import { useEffect, useEffectEvent, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { capitalize, upperTr } from '@/lib/format';
import { ALLERGY, CUISINE, DIET, HOUSEHOLD, personaFor, type CookProfile } from '@/lib/profile';

const ITEM_MS = 1100;
/** How long the persona stays on screen before the app opens (ms). */
const PERSONA_MS = 1600;
const ORBIT = ['🍅', '🧄', '🌿', '🍋', '🧀', '🌶️'];

/** Four lines that say what is being set up, from the user's own answers. */
function itemsFor(p: CookProfile): string[] {
  const labels = (opts: { value: string; label: string }[], vs: string[]) =>
    vs.map((v) => opts.find((o) => o.value === v)?.label).filter(Boolean).slice(0, 2).join(' ve ');
  const household = HOUSEHOLD.find((o) => o.value === p.household)?.hint;
  const minutes = p.weeknight_minutes;
  const cuisines = labels(CUISINE, p.cuisines);
  const diet = labels(DIET, p.diet);
  const allergy = labels(ALLERGY, p.allergies).toLocaleLowerCase('tr');
  return [
    household ? `Porsiyonlar ${household} için ayarlanıyor` : 'Porsiyonlar ayarlanıyor',
    !minutes ? 'Vaktine uygun tarifler seçiliyor' : minutes < 60 ? `${minutes} dakikaya sığan tarifler seçiliyor` : 'Uzun ve keyifli tarifler de seçiliyor',
    allergy ? `${capitalize(allergy)} her tarifte gözetilecek` : diet ? `${diet} beslenmen AI Şef’e öğretiliyor` : 'AI Şef damak zevkini öğreniyor',
    cuisines ? `${cuisines} mutfağından öneriler hazırlanıyor` : 'Sana özel öneriler hazırlanıyor',
  ];
}

interface Props {
  name: string;
  profile: CookProfile;
  /** Saves the profile; on success the session opens the app by itself. */
  onFinish: () => Promise<void>;
}

/**
 * The last onboarding screen: the AI chef with ingredients circling it while the user's answers are
 * set up line by line, then the persona they earned. Saving starts with the persona; when it is
 * done the app opens on its own. Only a failed save waits for a tap.
 */
export function PreparingStep({ name, profile, onFinish }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items] = useState(() => itemsFor(profile));
  const [persona] = useState(() => personaFor(profile));
  const [ticked, setTicked] = useState(0);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const done = ticked >= items.length;

  const progress = useSharedValue(0);
  const spin = useSharedValue(0);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await Promise.all([onFinish(), new Promise((r) => setTimeout(r, PERSONA_MS))]);
    } catch (e) {
      setError(describeError(e));
      setSaving(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  // The timer below calls the latest save without restarting the animation.
  const saveFromTimer = useEffectEvent(() => {
    save();
  });

  useEffect(() => {
    progress.value = withTiming(1, { duration: ITEM_MS * items.length, easing: Easing.inOut(Easing.cubic) });
    spin.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1);
    const timers = items.map((_, i) =>
      setTimeout(() => {
        setTicked(i + 1);
        Haptics.selectionAsync();
        if (i === items.length - 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          saveFromTimer();
        }
      }, ITEM_MS * (i + 1)),
    );
    return () => timers.forEach(clearTimeout);
  }, [items, progress, spin]);

  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View style={[styles.page, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.stage}>
        <Ring delay={0} color={colors.accent} />
        <Ring delay={900} color={colors.accent} />
        {ORBIT.map((emoji, i) => (
          <Orbiter key={emoji} emoji={emoji} index={i} count={ORBIT.length} spin={spin} />
        ))}
        {done ? (
          <Animated.View entering={ZoomIn.springify().damping(9)} style={[styles.persona, { backgroundColor: colors.surface, shadowColor: colors.accent }]}>
            <Text style={styles.personaEmoji}>{persona.emoji}</Text>
          </Animated.View>
        ) : (
          <Animated.View entering={ZoomIn.duration(400)}>
            <ChefAvatar size={112} ring />
          </Animated.View>
        )}
      </View>

      <View style={styles.copy} accessibilityLiveRegion="polite">
        {done ? (
          <Animated.View key="done" entering={FadeInUp.springify().damping(14)} style={styles.copy}>
            <Text variant="overline" color="accentText" align="center">
              {upperTr(name ? `${name}, mutfaktaki unvanın` : 'Mutfaktaki unvanın')}
            </Text>
            <Text variant="display" align="center" accessibilityRole="header">
              {persona.title}
            </Text>
            <Text variant="body" color="textSecondary" align="center">
              {persona.line}
            </Text>
          </Animated.View>
        ) : (
          <Animated.View key="working" entering={FadeIn.duration(300)} style={styles.copy}>
            <Text variant="overline" color="textTertiary" align="center">
              {upperTr('AI Şef hazırlanıyor')}
            </Text>
            <Text variant="display" align="center" accessibilityRole="header">
              {name ? `${name}, mutfağın kuruluyor` : 'Mutfağın kuruluyor'}
            </Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.bottom}>
        <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]} accessibilityRole="progressbar" accessibilityLabel="Hazırlanıyor">
          <Animated.View style={[styles.fill, { backgroundColor: colors.accent }, bar]} />
        </View>
        <View style={styles.items}>
          {items.map((item, i) =>
            i <= ticked ? (
              <Animated.View key={item} entering={FadeInDown.duration(320)} style={styles.item}>
                <View style={styles.mark}>
                  {i < ticked ? (
                    <Animated.View entering={ZoomIn.springify().damping(12)}>
                      <Icon name="checkmark-circle" size={20} color={colors.success} />
                    </Animated.View>
                  ) : (
                    <ActivityIndicator size="small" color={colors.accent} />
                  )}
                </View>
                <Text variant="callout" weight="600" color={i < ticked ? 'text' : 'textSecondary'} style={styles.flex}>
                  {item}
                </Text>
              </Animated.View>
            ) : null,
          )}
        </View>
        {error ? (
          <Animated.View entering={FadeInDown} style={styles.error}>
            <Text variant="footnote" color="danger" align="center">
              {error.title}. {error.message}
            </Text>
            <Button title="Tekrar dene" icon="refresh" onPress={save} loading={saving} />
          </Animated.View>
        ) : done ? (
          <Animated.View entering={FadeIn.delay(300)} style={styles.opening}>
            <ActivityIndicator size="small" color={colors.textTertiary} />
            <Text variant="subhead" color="textTertiary">
              Uygulama açılıyor
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const STAGE = 240;

/** A soft ring that grows out of the chef and fades. */
function Ring({ delay, color }: { delay: number; color: string }) {
  const local = useSharedValue(0);
  useEffect(() => {
    local.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1));
  }, [local, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - local.value),
    transform: [{ scale: 0.55 + local.value * 0.6 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: color }, style]} />;
}

/** One ingredient circling the chef. */
function Orbiter({ emoji, index, count, spin }: { emoji: string; index: number; count: number; spin: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const angle = (index / count) * Math.PI * 2 + spin.value * Math.PI * 2;
    const r = STAGE / 2 - 22;
    return { transform: [{ translateX: Math.cos(angle) * r }, { translateY: Math.sin(angle) * r }] };
  });
  return (
    <Animated.View entering={ZoomIn.delay(200 + index * 90)} style={[styles.orbiter, style]}>
      <Text style={styles.orbitEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: ScreenPadding, justifyContent: 'space-between' },
  flex: { flex: 1 },
  stage: { width: STAGE, height: STAGE, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: STAGE, height: STAGE, borderRadius: STAGE / 2, borderWidth: 2 },
  orbiter: { position: 'absolute' },
  orbitEmoji: { fontSize: 26, lineHeight: 32 },
  persona: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  personaEmoji: { fontSize: 54, lineHeight: 64 },
  copy: { gap: 10, alignItems: 'center' },
  bottom: { gap: 16 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  items: { gap: 12, minHeight: 4 * 32 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 22 },
  mark: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  error: { gap: 10 },
  opening: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 20, borderRadius: Radius.md },
});
