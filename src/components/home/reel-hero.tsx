import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import type { RecipeEntry } from '@/lib/types';

// The card is dark in both themes: it reads as "a video", next to the orange AI chef card.
const BG = '#121722';
const RAISED = '#1C2230';
const LINE = 'rgba(255,255,255,0.10)';
const FAINT = 'rgba(255,255,255,0.45)';
const ACCENT = '#EC7A4E';

const THUMB_W = 62;
const THUMB_H = 92;

interface Props {
  /** Recent Instagram recipes; their photos are drawn as reels. */
  entries: RecipeEntry[];
}

/**
 * Home, feature one: turn an Instagram video into a recipe. Three reels fan into a recipe card, then
 * a link field: tapping it opens "Ekle", "Yapıştır" opens it and pastes the copied link.
 */
export function ReelHero({ entries }: Props) {
  const photos = entries.filter((e) => e.origin === 'instagram' && e.imageUrl).slice(0, 3);
  const open = () => router.push('/add');
  const paste = () => router.push({ pathname: '/add', params: { paste: '1' } });

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(236,122,78,0.22)', 'rgba(236,122,78,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0.2, y: 0.7 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <PressableScale
        haptic
        scaleTo={0.985}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel="Instagram’dan tarife. Reels linkini yapıştır, malzemeler ve adımlar çıkarılsın."
        style={styles.top}>
      <View style={styles.label}>
        <View style={styles.badge}>
          <Icon name="logo-instagram" size={14} color="#fff" />
        </View>
        <Text variant="overline" tint={ACCENT}>
          INSTAGRAM’DAN TARİFE
        </Text>
      </View>
      <Text variant="title" tint="#fff" style={styles.title}>
        Videoyu yapıştır,{'\n'}tarifin adım adım hazır.
      </Text>

      <View style={styles.flow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={styles.fan}>
          {[0, 1, 2].map((i) => (
            <Reel key={i} uri={photos[i]?.imageUrl} index={i} />
          ))}
        </View>
        <View style={styles.arrow}>
          <Icon name="arrow-forward" size={16} color={ACCENT} />
        </View>
        <RecipeSketch />
      </View>
      </PressableScale>

      <View style={styles.field}>
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="Linki yaz" style={styles.fieldTap}>
          <Icon name="link-outline" size={17} color={FAINT} />
          <Text variant="callout" tint={FAINT} numberOfLines={1} style={styles.fieldText}>
            instagram.com/reel/…
          </Text>
        </Pressable>
        <Pressable
          onPress={paste}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Kopyaladığın linki yapıştır"
          style={({ pressed }) => [styles.pasteBtn, pressed && { opacity: 0.85 }]}>
          <Icon name="clipboard-outline" size={15} color="#fff" />
          <Text variant="headline" tint="#fff">
            Yapıştır
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const TILT = [-8, 0, 8];
const SHIFT = [6, 0, -6];

function Reel({ uri, index }: { uri?: string; index: number }) {
  return (
    <View
      style={[
        styles.reel,
        { marginLeft: index === 0 ? 0 : -18, zIndex: index === 1 ? 2 : 1, transform: [{ rotate: `${TILT[index]}deg` }, { translateY: SHIFT[index] === 0 ? -4 : 4 }] },
      ]}>
      {uri ? <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
      <View style={styles.play}>
        <Icon name="play" size={11} color="#fff" />
      </View>
    </View>
  );
}

/** A small recipe card: what the video becomes. */
function RecipeSketch() {
  return (
    <View style={styles.sketch}>
      {[
        { label: 'Malzemeler', w: '78%' as const },
        { label: 'Miktarlar', w: '62%' as const },
        { label: 'Adımlar', w: '70%' as const },
      ].map((row) => (
        <View key={row.label} style={styles.sketchRow}>
          <View style={styles.check}>
            <Icon name="checkmark" size={10} color="#fff" />
          </View>
          <View style={styles.sketchText}>
            <Text variant="caption" tint="#fff">
              {row.label}
            </Text>
            <View style={[styles.bar, { width: row.w }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: BG, borderRadius: Radius.xl, padding: 18, gap: 14, overflow: 'hidden' },
  top: { gap: 14 },
  label: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  title: { marginTop: -2 },
  flow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  fan: { flexDirection: 'row', alignItems: 'center', paddingLeft: 4 },
  reel: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: RAISED,
    borderWidth: 2,
    borderColor: BG,
  },
  play: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 1,
  },
  arrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(236,122,78,0.16)' },
  sketch: { flex: 1, backgroundColor: RAISED, borderRadius: 14, padding: 10, gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: LINE },
  sketchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: { width: 16, height: 16, borderRadius: 8, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  sketchText: { flex: 1, gap: 4 },
  bar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 14,
    paddingRight: 5,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LINE,
  },
  fieldTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch' },
  fieldText: { flex: 1 },
  pasteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: '#C4512A' },
});
