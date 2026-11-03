import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ShareGuide } from '@/components/share-guide/share-guide';
import { useShareGuideOnce } from '@/components/share-guide/use-share-guide';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';

// Dark in both themes: it reads as "a video", next to the orange AI chef strip.
const BG = '#121722';
const FAINT = 'rgba(255,255,255,0.62)';

/**
 * Home, feature one, as a slim strip: turn an Instagram video into a recipe. The strip opens "Ekle";
 * "Yapıştır" opens it and pastes the copied link. The first tap shows how to put the app first in
 * Instagram's share menu, then opens "Ekle".
 */
export function ReelHero() {
  const guide = useShareGuideOnce('home');
  return (
    <View style={styles.strip}>
      <ShareGuide visible={guide.visible} onClose={guide.close} context="home" />
      <PressableScale
        haptic
        scaleTo={0.985}
        onPress={() => guide.offer(() => router.push('/add'))}
        accessibilityRole="button"
        accessibilityLabel="Videodan tarife. Instagram Reels linkini yapıştır, tarif çıkarılsın."
        style={styles.main}>
        <View style={styles.badge}>
          <Icon name="logo-instagram" size={19} color="#fff" />
        </View>
        <View style={styles.texts}>
          <Text variant="headline" tint="#fff" numberOfLines={1}>
            Videodan tarife
          </Text>
          <Text variant="footnote" tint={FAINT} numberOfLines={1}>
            Reels linkini yapıştır, tarif olsun
          </Text>
        </View>
      </PressableScale>
      <Pressable
        onPress={() => router.push({ pathname: '/add', params: { paste: '1' } })}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Kopyaladığın linki yapıştır"
        style={({ pressed }) => [styles.paste, pressed && { opacity: 0.85 }]}>
        <Icon name="clipboard-outline" size={14} color="#fff" />
        <Text variant="subhead" weight="700" tint="#fff">
          Yapıştır
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 68,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    backgroundColor: BG,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  badge: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  texts: { flex: 1, gap: 2 },
  paste: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: '#C4512A' },
});
