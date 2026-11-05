import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { usePantry } from '@/lib/kitchen';

// Orange in both themes: the AI chef's color, apart from the dark video strip.
const FROM = '#D65C30';
const TO = '#B4471F';
const SOFT = 'rgba(255,255,255,0.86)';

/**
 * Home, feature two, as a slim strip: the AI chef writes a recipe from what you have. With a pantry it
 * opens the chef with those ingredients picked.
 */
export function ChefHero() {
  const pantry = (usePantry().data?.groups ?? []).flatMap((g) => g.items);
  const picked = pantry.map((p) => p.name).slice(0, 12);
  const open = () => router.push(picked.length ? { pathname: '/chef', params: { ingredients: picked.join(',') } } : '/chef');

  return (
    <PressableScale
      haptic
      scaleTo={0.985}
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel="Ne pişirsem? Elindekilerle sana özel tarif yazdır."
      style={styles.strip}>
      <LinearGradient colors={[FROM, TO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <ChefAvatar size={42} ring />
      <View style={styles.texts}>
        <Text variant="headline" tint="#fff" numberOfLines={1}>
          Ne pişirsem? · Tarif yazdır
        </Text>
        <Text variant="footnote" tint={SOFT} numberOfLines={1}>
          {pantry.length ? `Dolabındaki ${pantry.length} malzemeyle tarif yazsın` : 'Elindekilerle sana özel tarif yazsın'}
        </Text>
      </View>
      <View style={styles.go}>
        <Icon name="arrow-forward" size={17} color={TO} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  texts: { flex: 1, gap: 2 },
  go: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
