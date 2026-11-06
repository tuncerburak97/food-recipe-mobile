import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Icon, type IconName } from '@/components/ui/icon';
import { StickyFooter } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'logo-instagram', title: 'Instagram’dan tarife', text: 'Beğendiğin yemek videosunu paylaş; malzemeler ve adımlar hazır gelsin.' },
  { icon: 'sparkles-outline', title: 'AI Şef yanında', text: 'Dolabındakilerle tarif yazar, takıldığın her soruyu cevaplar.' },
  { icon: 'mic-outline', title: 'Elin hamurdayken sesle pişir', text: '“Sonraki”, “tekrar” de; adımlar videodaki anıyla birlikte gelsin.' },
];

/** First screen: an animated "video → recipe" picture, three points and one button. */
export function HeroStep({ onStart }: { onStart: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]} showsVerticalScrollIndicator={false}>
        <HeroArt />
        <Animated.View entering={FadeInDown.delay(250).duration(380)} style={styles.header}>
          <Text variant="display" accessibilityRole="header">
            Videodaki yemek, saniyeler içinde senin tarifin
          </Text>
          <Text variant="body" color="textSecondary">
            Instagram’da ve YouTube’da gördüğün tarifleri kaydet, AI Şef’le kendine uyarla, adım adım pişir.
          </Text>
        </Animated.View>
        <View style={styles.points}>
          {POINTS.map((p, i) => (
            <Animated.View
              key={p.title}
              entering={FadeInDown.delay(380 + i * 90).duration(360)}
              style={styles.point}
              accessible
              accessibilityLabel={`${p.title}. ${p.text}`}>
              <View style={[styles.well, { backgroundColor: colors.accentSoft }]}>
                <Icon name={p.icon} size={20} color={colors.accentText} />
              </View>
              <View style={styles.pointText}>
                <Text variant="headline">{p.title}</Text>
                <Text variant="subhead" color="textSecondary">
                  {p.text}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
      <StickyFooter style={styles.footer}>
        <Button title="Hadi başlayalım" trailingIcon="arrow-forward" onPress={onStart} />
        <Text variant="footnote" color="textTertiary" align="center">
          Üyelik gerekmez · Yaklaşık 1 dakika
        </Text>
      </StickyFooter>
    </View>
  );
}

/** A reel on the left, the recipe it becomes on the right, the chef between them. */
function HeroArt() {
  const { colors } = useTheme();
  const float = useSharedValue(0);
  useEffect(() => {
    float.value = withRepeat(withSequence(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })), -1);
  }, [float]);
  const up = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * float.value }, { rotate: '-5deg' }] }));
  const down = useAnimatedStyle(() => ({ transform: [{ translateY: 6 * float.value }, { rotate: '4deg' }] }));

  return (
    <View style={[styles.art, { backgroundColor: colors.peachSoft }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View entering={FadeInLeft.delay(60).springify().damping(16)}>
        <Animated.View style={[styles.reel, up]}>
          <LinearGradient colors={['#2A1A14', '#D65C30']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.reelIg}>
            <Icon name="logo-instagram" size={14} color="#fff" />
          </View>
          <View style={styles.reelPlay}>
            <Icon name="play" size={18} color="#fff" />
          </View>
          <View style={styles.reelLines}>
            <View style={[styles.line, { width: '70%', backgroundColor: 'rgba(255,255,255,0.85)' }]} />
            <View style={[styles.line, { width: '45%', backgroundColor: 'rgba(255,255,255,0.55)' }]} />
          </View>
        </Animated.View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).springify().damping(12)} style={styles.chef}>
        <ChefAvatar size={56} ring />
        <View style={[styles.arrow, { backgroundColor: colors.accent }]}>
          <Icon name="arrow-forward" size={14} color="#fff" />
        </View>
      </Animated.View>

      <Animated.View entering={FadeInRight.delay(120).springify().damping(16)}>
        <Animated.View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.text }, down]}>
          <Text variant="caption" color="accentText">
            TARİF
          </Text>
          <View style={[styles.line, { width: '85%', height: 8, backgroundColor: colors.text }]} />
          {['🍅', '🧄', '🌿', '🧀'].map((e, i) => (
            <View key={e} style={styles.ingRow}>
              <Text style={styles.ingEmoji}>{e}</Text>
              <View style={[styles.line, { width: `${70 - i * 10}%`, backgroundColor: colors.border }]} />
            </View>
          ))}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, gap: 28, paddingBottom: 24 },
  header: { gap: 12 },
  points: { gap: 18 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  well: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  pointText: { flex: 1, gap: 2, paddingTop: 1 },
  footer: { borderTopWidth: 0, gap: 12 },
  art: { height: 210, borderRadius: Radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, overflow: 'hidden' },
  reel: { width: 104, height: 156, borderRadius: 18, overflow: 'hidden' },
  reelIg: { position: 'absolute', top: 10, left: 10 },
  reelPlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  reelLines: { position: 'absolute', left: 10, right: 10, bottom: 12, gap: 6 },
  line: { height: 6, borderRadius: 3 },
  chef: { alignItems: 'center', gap: 6, zIndex: 2, marginHorizontal: -6 },
  arrow: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  card: {
    width: 118,
    height: 150,
    borderRadius: 18,
    padding: 12,
    gap: 8,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ingEmoji: { fontSize: 13, lineHeight: 16 },
});
