import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { MetaPills } from '@/components/recipe/meta-pills';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { capitalize, formatAmount, ingredientCount } from '@/lib/format';
import type { Recipe } from '@/lib/types';

const PREVIEW_COUNT = 6;

/** What the recipe will look like, shown before saving. */
export function RecipePreview({ recipe, imageUrl }: { recipe: Recipe; imageUrl?: string }) {
  const { colors } = useTheme();
  const ingredients = recipe.ingredient_groups.flatMap((g) => g.ingredients);
  const total = ingredientCount(recipe);
  const rest = total - PREVIEW_COUNT;
  const steps = recipe.steps.length;

  return (
    <View style={styles.wrap}>
      {imageUrl ? (
        <Image source={imageUrl} style={[styles.image, { backgroundColor: colors.peach }]} contentFit="cover" transition={200} accessibilityIgnoresInvertColors />
      ) : null}

      <View style={styles.head}>
        <Tag label="Tarifin hazır" icon="checkmark-circle" tone="success" />
        <Text variant="display" accessibilityRole="header">
          {recipe.title}
        </Text>
      </View>

      <MetaPills recipe={recipe} />

      <Card
        title="Malzemeler"
        right={
          <Text variant="subhead" color="textTertiary">
            {total} malzeme
          </Text>
        }>
        <View>
          {ingredients.slice(0, PREVIEW_COUNT).map((ing, i) => (
            <View key={i} style={[styles.row, i === 0 ? styles.firstRow : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <Text variant="callout" weight={ing.quantity != null ? '700' : '400'} style={styles.amount} numberOfLines={1}>
                {formatAmount(ing)}
              </Text>
              <Text variant="callout" style={styles.flex} numberOfLines={2}>
                {capitalize(ing.name)}
              </Text>
            </View>
          ))}
        </View>
        {rest > 0 ? (
          <Text variant="subhead" color="textSecondary">
            ve {rest} malzeme daha
          </Text>
        ) : null}
      </Card>

      {steps > 0 ? (
        <Text variant="subhead" color="textSecondary" style={styles.note}>
          Yapılışı {steps} adım. Kaydedince tarifin tamamını görebilirsin.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  image: { height: 200, borderRadius: Radius.xl },
  head: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  firstRow: { paddingTop: 0 },
  amount: { width: 96 },
  flex: { flex: 1 },
  note: { paddingHorizontal: 4 },
});
