import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { ScreenPadding, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';

/**
 * Where a list on the white sheet lives:
 * - 'tab': a tab screen. The tab bar sits below the screen (it does not float over it), so the list
 *   only needs breathing room at its end.
 * - 'stack': a pushed screen that runs to the bottom edge, so the list also clears the home indicator.
 */
export type ListPlacement = 'tab' | 'stack';

/** Space after the last row of a sheet list. */
export function useListBottomPadding(placement: ListPlacement): number {
  const insets = useSafeAreaInsets();
  return placement === 'tab' ? Spacing.xxxl : insets.bottom + Spacing.xxxl;
}

/** Hairline between two rows of a sheet list, inset to the screen padding. */
export function RowDivider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

/**
 * A quiet small-capitals label above a run of rows ("BUGÜN", "EN ÇOK TARİFİ OLAN ÖNCE").
 * `first` for the label at the very top of the sheet (less space above it).
 */
export function ListLabel({ label, first }: { label: string; first?: boolean }) {
  return (
    <Text variant="overline" color="textTertiary" accessibilityRole="header" style={[styles.label, first && styles.labelFirst]}>
      {upperTr(label)}
    </Text>
  );
}

const styles = StyleSheet.create({
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: ScreenPadding },
  label: { paddingHorizontal: ScreenPadding, paddingTop: 24, paddingBottom: 4 },
  labelFirst: { paddingTop: 12 },
});
