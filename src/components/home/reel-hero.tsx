import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ShareGuide } from '@/components/share-guide/share-guide';
import { useShareGuideOnce } from '@/components/share-guide/use-share-guide';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Home, under the assistant: turn an Instagram video into a recipe, as a quiet row on the page (the
 * assistant card above is the one loud thing). The row opens "Ekle"; "Yapıştır" opens it and pastes
 * the copied link. The first tap shows how to put the app first in Instagram's share menu.
 */
export function ReelHero() {
  const { colors } = useTheme();
  const guide = useShareGuideOnce('home');
  return (
    <View style={[styles.strip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <ShareGuide visible={guide.visible} onClose={guide.close} context="home" />
      <PressableScale
        haptic
        scaleTo={0.985}
        onPress={() => guide.offer(() => router.push('/add'))}
        accessibilityRole="button"
        accessibilityLabel="Videodan tarife. Instagram Reels linkini yapıştır, tarif çıkarılsın."
        style={styles.main}>
        <View style={[styles.badge, { backgroundColor: colors.ink }]}>
          <Icon name="logo-instagram" size={19} color={colors.onInk} />
        </View>
        <View style={styles.texts}>
          <Text variant="headline" numberOfLines={1}>
            Videodan tarife
          </Text>
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            Reels linkini yapıştır, tarif olsun
          </Text>
        </View>
      </PressableScale>
      <Pressable
        onPress={() => router.push({ pathname: '/add', params: { paste: '1' } })}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Kopyaladığın linki yapıştır"
        style={({ pressed }) => [styles.paste, { backgroundColor: colors.accentStrong }, pressed && { opacity: 0.85 }]}>
        <Icon name="clipboard-outline" size={14} color={colors.onAccent} />
        <Text variant="subhead" weight="700" tint={colors.onAccent}>
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
    minHeight: 64,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  badge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  paste: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 34, paddingHorizontal: 12, borderRadius: 17 },
});
