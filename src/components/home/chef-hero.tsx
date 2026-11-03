import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { capitalize } from '@/lib/format';
import { usePantry } from '@/lib/kitchen';

// The card is orange in both themes: the AI chef's color, apart from the dark video card.
const FROM = '#D65C30';
const TO = '#B4471F';
const CHIP = 'rgba(255,255,255,0.16)';
const CHIP_LINE = 'rgba(255,255,255,0.28)';
const SOFT = 'rgba(255,255,255,0.86)';
const INK = '#B54D26';

/** Shown when the pantry is empty: everyday things most kitchens have. */
const STARTERS = ['Tavuk', 'Kabak', 'Yoğurt'];

/**
 * Home, feature two: the AI chef writes a recipe from what you have. A quick start chip opens the
 * chef with that ingredient; the button opens it with the pantry (or empty).
 */
export function ChefHero() {
  const pantry = (usePantry().data?.groups ?? []).flatMap((g) => g.items);
  const fromPantry = pantry.length > 0;
  const chips = fromPantry ? pantry.slice(0, 3).map((p) => capitalize(p.name)) : STARTERS;

  const openWith = (ingredients: string[]) =>
    router.push(ingredients.length ? { pathname: '/chef', params: { ingredients: ingredients.join(',') } } : '/chef');
  const openChef = () => openWith(fromPantry ? pantry.map((p) => p.name).slice(0, 12) : []);

  return (
    <View style={styles.card}>
      <LinearGradient colors={[FROM, TO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} pointerEvents="none" />

      <PressableScale
        haptic
        scaleTo={0.985}
        onPress={openChef}
        accessibilityRole="button"
        accessibilityLabel="AI Şef. Ne pişirsem? Elindeki malzemelerden sana özel tarif yazsın."
        style={styles.top}>
      <View style={styles.head}>
        <ChefAvatar size={58} ring />
        <View style={styles.headText}>
          <Text variant="overline" tint={SOFT}>
            AI ŞEF
          </Text>
          <Text variant="title" tint="#fff">
            Ne pişirsem?
          </Text>
        </View>
      </View>

      <Text variant="callout" tint={SOFT}>
        Elindekileri söyle; hedefine, süresine ve damak tadına göre sana özel tarif yazsın.
      </Text>
      </PressableScale>

      <View style={styles.chipsBlock}>
        <Text variant="caption" tint={SOFT}>
          {fromPantry ? 'DOLABINDAN' : 'HIZLI BAŞLA'}
        </Text>
        <View style={styles.chips}>
          {chips.map((name) => (
            <Pressable
              key={name}
              onPress={() => openWith([name])}
              accessibilityRole="button"
              accessibilityLabel={`${name} ile başla`}
              style={({ pressed }) => [styles.chip, pressed && { opacity: 0.8 }]}>
              <Text variant="subhead" tint="#fff" numberOfLines={1}>
                {name}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={openChef}
            accessibilityRole="button"
            accessibilityLabel="Başka malzeme ekle"
            style={({ pressed }) => [styles.chip, styles.more, pressed && { opacity: 0.8 }]}>
            <Icon name="add" size={15} color="#fff" />
          </Pressable>
        </View>
      </View>

      <PressableScale haptic onPress={openChef} accessibilityRole="button" accessibilityLabel="Şefe tarif yazdır" style={styles.cta}>
        <Text variant="headline" tint={INK}>
          Şefe tarif yazdır
        </Text>
        <Icon name="arrow-forward" size={17} color={INK} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: 18, gap: 14, overflow: 'hidden' },
  glow: { position: 'absolute', right: -60, top: -70, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.10)' },
  top: { gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headText: { flex: 1, gap: 2 },
  chipsBlock: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    justifyContent: 'center',
    backgroundColor: CHIP,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CHIP_LINE,
  },
  more: { width: 34, paddingHorizontal: 0, alignItems: 'center' },
  cta: {
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
