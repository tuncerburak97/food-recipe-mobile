import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { categoryLabel } from '@/constants/categories';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';
import type { Category } from '@/lib/types';

/**
 * A plate drawn from plain shapes (rim, well, fork and knife) on the warm peach surface: the mark
 * for a recipe that has no photo. Scales with `size` (the plate's diameter).
 */
export function PlateMark({ size = 64 }: { size?: number }) {
  const { colors } = useTheme();
  // Tone on tone: the cutlery is the plate's color, so the mark reads as one quiet object.
  const metal = colors.peachSoft;
  const rim = size;
  const well = size * 0.62;
  const cutleryH = size * 0.78;
  const w = Math.max(2, size * 0.055);
  return (
    <View style={[styles.plateRow, { gap: size * 0.14 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* fork: three tines over a handle */}
      <View style={{ height: cutleryH, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', gap: w * 0.7 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: w * 0.8, height: cutleryH * 0.3, borderRadius: w, backgroundColor: metal }} />
          ))}
        </View>
        <View style={{ width: w * 3.8, height: w * 1.2, borderBottomLeftRadius: w * 2, borderBottomRightRadius: w * 2, backgroundColor: metal }} />
        <View style={{ flex: 1, width: w * 1.1, borderRadius: w, backgroundColor: metal }} />
      </View>
      <View style={[styles.center, { width: rim, height: rim, borderRadius: rim / 2, backgroundColor: colors.peachSoft, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }]}>
        <View style={{ width: well, height: well, borderRadius: well / 2, borderWidth: Math.max(1, w * 0.5), borderColor: colors.border }} />
      </View>
      {/* knife: a blade that narrows into a handle */}
      <View style={{ height: cutleryH, alignItems: 'center' }}>
        <View style={{ width: w * 2.2, height: cutleryH * 0.5, borderTopLeftRadius: w * 2.2, borderTopRightRadius: w * 0.4, backgroundColor: metal }} />
        <View style={{ flex: 1, width: w * 1.3, borderRadius: w, backgroundColor: metal }} />
      </View>
    </View>
  );
}

/**
 * Top of a recipe that has no photo yet: the plate mark and the category on peach, and
 * "Görsel hazırlanıyor" while the background photo is being made.
 */
export function AiHero({ category, pending, style }: { category: Category; pending?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: colors.peach }, style]}>
      <PlateMark size={120} />
      <Text variant="overline" color="textSecondary" style={styles.label}>
        {upperTr(categoryLabel(category))}
      </Text>
      {pending && (
        <View style={[styles.badge, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text variant="footnote" color="textSecondary">
            Görsel hazırlanıyor
          </Text>
        </View>
      )}
    </View>
  );
}

/** Placeholder for cards when a recipe has no photo. */
export function DishPlaceholder({ size = 40 }: { category?: Category; size?: number }) {
  const { colors } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.peach }]}>
      <PlateMark size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: 14, paddingTop: 30 },
  label: { letterSpacing: 1.4 },
  plateRow: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, height: 36, borderRadius: 999, marginTop: 2 },
});
