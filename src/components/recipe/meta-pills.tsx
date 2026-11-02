import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CATEGORY_LABELS, difficultyLabel, formatMinutes, isEstimated, servingsText, totalMinutes, upperTr } from '@/lib/format';
import type { Recipe } from '@/lib/types';

/**
 * The recipe's key facts in one bordered strip: SÜRE · ZORLUK · KİŞİ · MUTFAK, each a small label
 * over its value. "≈" marks values estimated because the source did not say them.
 */
export function MetaLine({ recipe }: { recipe: Recipe }) {
  const { colors } = useTheme();
  const minutes = totalMinutes(recipe);
  const servings = servingsText(recipe);
  const difficulty = difficultyLabel(recipe);
  const items: { label: string; value: string }[] = [];
  if (minutes != null) items.push({ label: 'Süre', value: `${isEstimated(recipe, 'total_minutes') ? '≈ ' : ''}${formatMinutes(minutes)}` });
  if (difficulty) items.push({ label: 'Zorluk', value: difficulty });
  if (servings) items.push({ label: 'Kişi', value: `${isEstimated(recipe, 'servings') ? '≈ ' : ''}${servings.replace(' kişilik', '')}` });
  if (recipe.cuisine) items.push({ label: 'Mutfak', value: recipe.cuisine });
  else if (items.length < 2) items.push({ label: 'Tür', value: CATEGORY_LABELS[recipe.category] });

  return (
    <View style={[styles.strip, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {items.map((it, i) => (
        <View
          key={it.label}
          accessible
          accessibilityLabel={`${it.label}: ${it.value}`}
          style={[styles.cell, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
          <Text variant="overline" color="textTertiary" numberOfLines={1}>
            {upperTr(it.label)}
          </Text>
          <Text variant="headline" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {it.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Small neutral label with an icon (cooking hints, previews). */
export function Pill({ icon, label }: { icon: IconName; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: colors.surfaceMuted }]}>
      <Icon name={icon} size={14} color={colors.textSecondary} />
      <Text variant="footnote" weight="600" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

/** Backwards-compatible name for previews: the same facts as MetaLine. */
export const MetaPills = MetaLine;

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.lg, paddingVertical: 14 },
  cell: { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', gap: 4, paddingHorizontal: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: Radius.pill, alignSelf: 'flex-start' },
});
