import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DishPlaceholder } from '@/components/recipe/ai-hero';
import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { CATEGORY_LABELS, formatMinutes, servingsText, totalMinutes, upperTr } from '@/lib/format';
import type { RecipeEntry } from '@/lib/types';

/**
 * A large photo card with the title set on the image, for Home's "Öne çıkan" carousel. Without a
 * width it fills its container.
 */
export function FeaturedRecipe({ entry, width }: { entry: RecipeEntry; width?: number }) {
  const { recipe } = entry;
  const minutes = totalMinutes(recipe);
  const facts = [minutes != null ? formatMinutes(minutes) : null, servingsText(recipe)].filter(Boolean).join(' · ');

  return (
    <PressableScale
      onPress={() => router.push(`/recipe/${entry.id}`)}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}${facts ? `, ${facts}` : ''}`}
      style={[styles.card, width ? { width } : null]}>
      {entry.imageUrl ? (
        <Image source={entry.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
      ) : (
        <DishPlaceholder size={110} />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.18)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.74)']}
        locations={[0, 0.22, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.top}>
        <Tag label={upperTr(CATEGORY_LABELS[recipe.category])} tone="overlay" />
      </View>
      <View style={styles.text}>
        <Text variant="title" tint="#FFFFFF" numberOfLines={2}>
          {recipe.title}
        </Text>
        <View style={styles.meta}>
          {facts ? (
            <Text variant="subhead" weight="600" tint="#FFFFFF" style={styles.soft}>
              {facts}
            </Text>
          ) : null}
          {entry.source ? (
            <View style={styles.by}>
              <Icon name="logo-instagram" size={13} color="#FFFFFF" style={styles.soft} />
              <Text variant="subhead" weight="600" tint="#FFFFFF" numberOfLines={1} style={[styles.soft, styles.shrink]}>
                @{entry.source.ownerUsername}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { aspectRatio: 0.92, borderRadius: Radius.xl, overflow: 'hidden', justifyContent: 'space-between' },
  top: { padding: 14 },
  text: { padding: 18, gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  by: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  shrink: { flexShrink: 1 },
  soft: { opacity: 0.9 },
});
