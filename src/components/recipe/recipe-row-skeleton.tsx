import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { RowDivider } from '@/components/browse/sheet-list';
import { RECIPE_ROW_PHOTO } from '@/components/recipe/recipe-list-card';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { Radius, ScreenPadding } from '@/constants/theme';

/**
 * Placeholder rows shown while a recipe list loads, in the shape of `RecipeListCard`: the square
 * photo, then the category, name, facts and source lines.
 * `inset` lays the rows out like the sheet lists (screen padding and hairlines between rows);
 * without it the rows fill their parent, which already has padding.
 */
export function RecipeRowSkeleton({ count = 3, inset = false }: { count?: number; inset?: boolean }) {
  return (
    <SkeletonPulse style={inset ? styles.insetWrap : undefined}>
      {Array.from({ length: count }, (_, i) => (
        <Fragment key={i}>
          {inset && i > 0 ? <RowDivider /> : null}
          <View style={[styles.row, inset && styles.inset]}>
            <SkeletonBlock width={RECIPE_ROW_PHOTO} height={RECIPE_ROW_PHOTO} radius={Radius.md} />
            <View style={styles.lines}>
              <SkeletonBlock width="26%" height={10} radius={5} />
              <SkeletonBlock width={i % 2 ? '70%' : '86%'} height={16} radius={8} />
              <SkeletonBlock width="42%" height={12} radius={6} />
              <View style={styles.creator}>
                <SkeletonBlock width={18} height={18} radius={9} />
                <SkeletonBlock width="34%" height={11} radius={6} />
              </View>
            </View>
          </View>
        </Fragment>
      ))}
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  insetWrap: { paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  inset: { paddingHorizontal: ScreenPadding },
  lines: { flex: 1, gap: 8 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
});
