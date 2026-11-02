import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { categoryIcon, categoryLabel } from '@/constants/categories';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CategoryCount } from '@/lib/types';

const COLUMNS = 2;

/**
 * Categories that have recipes, as an even two-column grid of tiles: an icon well, the name and
 * the recipe count. A tap opens Search filtered to that category.
 */
export function CategoryTiles({ counts }: { counts: CategoryCount[] }) {
  const rows: CategoryCount[][] = [];
  for (let i = 0; i < counts.length; i += COLUMNS) rows.push(counts.slice(i, i + COLUMNS));

  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0].category} style={styles.row}>
          {row.map((c) => (
            <CategoryTile key={c.category} {...c} />
          ))}
          {/* Keeps a lone last tile at half width. */}
          {row.length < COLUMNS ? <View style={styles.flex} /> : null}
        </View>
      ))}
    </View>
  );
}

function CategoryTile({ category, count }: CategoryCount) {
  const { colors } = useTheme();
  const label = categoryLabel(category);
  return (
    <PressableScale
      haptic
      onPress={() => router.navigate({ pathname: '/search', params: { category } })}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} tarif`}
      accessibilityHint="Bu kategorideki tarifleri gösterir"
      style={[styles.tile, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.well, { backgroundColor: colors.surface }]}>
        <Icon name={categoryIcon(category)} size={18} color={colors.text} />
      </View>
      <View style={styles.flex}>
        <Text variant="headline" numberOfLines={1}>
          {label}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {count} tarif
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: Radius.lg,
  },
  well: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
