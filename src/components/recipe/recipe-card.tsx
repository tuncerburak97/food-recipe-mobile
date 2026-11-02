import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { DishPlaceholder } from '@/components/recipe/ai-hero';
import { CreatorLine } from '@/components/recipe/creator-line';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMinutes, totalMinutes } from '@/lib/format';
import type { RecipeEntry } from '@/lib/types';

interface Props {
  entry: RecipeEntry;
  mine?: boolean;
  width: number;
}

/** Photo card used in rails: a portrait photo with the time on it, the title and the source. */
export function RecipeCard({ entry, width }: Props) {
  const { colors } = useTheme();
  const { recipe } = entry;
  const minutes = totalMinutes(recipe);

  return (
    <PressableScale
      onPress={() => router.push(`/recipe/${entry.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}${minutes != null ? `, ${formatMinutes(minutes)}` : ''}`}
      style={{ width }}>
      <View style={[styles.photo, { backgroundColor: colors.peach }]}>
        {entry.imageUrl ? (
          <Image source={entry.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <DishPlaceholder size={52} />
        )}
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
  title: { marginBottom: 4, minHeight: 40 },
});
