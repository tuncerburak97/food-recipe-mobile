import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { RowDivider } from '@/components/browse/sheet-list';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { ScreenPadding } from '@/constants/theme';

/**
 * Placeholder rows for round-leading lists on the sheet (accounts, notifications): a circle, two
 * lines, and optionally a short figure on the right.
 */
export function RowSkeleton({ count = 6, leading = 44, trailing = false }: { count?: number; leading?: number; trailing?: boolean }) {
  return (
    <SkeletonPulse style={styles.wrap}>
      {Array.from({ length: count }, (_, i) => (
        <Fragment key={i}>
          {i > 0 ? <RowDivider /> : null}
          <View style={styles.row}>
            <SkeletonBlock width={leading} height={leading} radius={leading / 2} />
            <View style={styles.lines}>
              <SkeletonBlock width={i % 2 ? '52%' : '64%'} height={15} />
              <SkeletonBlock width={i % 2 ? '34%' : '40%'} height={12} radius={6} />
            </View>
            {trailing ? <SkeletonBlock width={28} height={18} radius={6} /> : null}
          </View>
        </Fragment>
      ))}
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingHorizontal: ScreenPadding, paddingVertical: 14 },
  lines: { flex: 1, gap: 8 },
});
