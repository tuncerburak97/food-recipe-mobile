import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';

interface Props {
  title: string;
  subtitle?: string;
  /** Pushed screens: a round back button above the title. */
  back?: boolean;
  /** Small control next to the back button (top right). */
  right?: ReactNode;
  /** Search field and filters under the title. */
  children?: ReactNode;
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** The top bar of a pushed screen on the cream page: back button on the left, an optional control on the right. */
export function BackBar({ right }: { right?: ReactNode }) {
  return (
    <View style={styles.bar}>
      <IconButton icon="chevron-back" label="Geri" tone="surface" onPress={goBack} />
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

/**
 * The cream page header of a browse screen (put it in `SheetLayout`'s header): a big title, a short
 * line under it, then the search field and filters.
 */
export function PageHeader({ title, subtitle, back, right, children }: Props) {
  return (
    <View style={styles.wrap}>
      {back ? <BackBar right={right} /> : null}
      <View style={styles.titleRow}>
        <View style={styles.titles}>
          <Text variant="display" accessibilityRole="header" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="callout" color="textSecondary" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {!back && right ? right : null}
      </View>
      {children ? <View style={styles.controls}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  titles: { flex: 1, gap: 4 },
  controls: { gap: 12 },
});
