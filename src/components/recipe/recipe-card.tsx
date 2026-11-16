import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { RecipeImage } from '@/components/recipe/recipe-image';
import { CreatorLine } from '@/components/recipe/creator-line';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes, totalMinutes } from '@/lib/format';
import { useKitchenBadge } from '@/lib/kitchen';
import type { RecipeEntry } from '@/lib/types';

interface Props {
  entry: RecipeEntry;
  mine?: boolean;
  width: number;
}

/**
 * Photo card used in rails: a portrait photo with the time on it, the title and the source. With a
 * pantry, "Hepsi evde" / "1 eksik" sits on the photo, so the card keeps its size either way.
 */
export function RecipeCard({ entry, width }: Props) {
  const { colors } = useTheme();
  const { recipe } = entry;
  const minutes = totalMinutes(recipe);
  const badge = useKitchenBadge(entry.id);

  return (
    <PressableScale
      onPress={() => router.push(`/recipe/${entry.id}`)}
      accessibilityRole="button"
      accessibilityLabel={[recipe.title, minutes != null ? formatMinutes(minutes) : null, badge?.label].filter(Boolean).join(', ')}
      style={{ width }}>
      <View style={[styles.photo, { backgroundColor: colors.peach }]}>
        <RecipeImage uri={entry.imageUrl} style={StyleSheet.absoluteFill} placeholderSize={52} transition={200} recyclingKey={entry.id} />
        {badge ? <Tag label={badge.label} tone={badge.tone} style={styles.badge} /> : null}
        {minutes != null && <Tag label={formatMinutes(minutes)} icon="time-outline" tone="overlay" style={styles.time} />}
      </View>
      <Text variant="headline" numberOfLines={2} style={styles.title}>
        {recipe.title}
      </Text>
      <CreatorLine entry={entry} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  photo: { aspectRatio: 4 / 5, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: 10 },
  time: { position: 'absolute', left: 8, bottom: 8 },
  badge: { position: 'absolute', left: 8, top: 8 },
  title: { marginBottom: 4, minHeight: 40 },
});
