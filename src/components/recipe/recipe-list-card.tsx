import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { DishPlaceholder } from '@/components/recipe/ai-hero';
import { CreatorLine } from '@/components/recipe/creator-line';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_LABELS, formatMinutes, servingsText, totalMinutes, upperTr } from '@/lib/format';
import type { RecipeEntry } from '@/lib/types';

/** Side of the square photo in a recipe row (the skeleton uses it too). */
export const RECIPE_ROW_PHOTO = 80;

/**
 * A recipe as one row of a list on the white sheet (search, Tariflerim, an account): the photo,
 * the category, the name, time and servings, and where it is from. Rows are separated by hairlines
 * drawn by the list.
 */
export function RecipeListCard({ entry, mine }: { entry: RecipeEntry; mine?: boolean }) {
  const { colors } = useTheme();
  const { recipe } = entry;
  const minutes = totalMinutes(recipe);
  const category = CATEGORY_LABELS[recipe.category];
  const facts = [minutes != null ? formatMinutes(minutes) : null, servingsText(recipe), mine && entry.source ? 'Tariflerimde' : null]
    .filter(Boolean)
    .join(' · ');
  const from = entry.origin === 'ai' ? 'Sana özel hazırlandı' : entry.source ? `@${entry.source.ownerUsername}` : null;

  return (
    <Pressable
      onPress={() => router.push(`/recipe/${entry.id}`)}
      accessibilityRole="button"
      accessibilityLabel={[recipe.title, category, facts, from].filter(Boolean).join(', ')}
      accessibilityHint="Tarifi açar"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.photo, { backgroundColor: colors.peach }]}>
        {entry.imageUrl ? (
          <Image source={entry.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <DishPlaceholder category={recipe.category} size={30} />
        )}
      </View>
      <View style={styles.body}>
        <Text variant="overline" color="textTertiary" numberOfLines={1}>
          {upperTr(category)}
        </Text>
        <Text variant="title3" numberOfLines={2}>
          {recipe.title}
        </Text>
        {facts ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            {facts}
          </Text>
        ) : null}
        <View style={styles.creator}>
          <CreatorLine entry={entry} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: ScreenPadding, paddingVertical: 14 },
  photo: { width: RECIPE_ROW_PHOTO, height: RECIPE_ROW_PHOTO, borderRadius: Radius.md, overflow: 'hidden' },
  body: { flex: 1, gap: 3 },
  creator: { marginTop: 3 },
});
