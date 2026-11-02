import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';

interface Props {
  title?: string;
  subtitle?: string;
  /**
   * "back": pushed screen, a round back button and a centered title.
   * "close": modal, a large title on the left and a close button on the right.
   */
  leading?: 'back' | 'close';
  right?: ReactNode;
  /** Set false inside iOS modals, which already sit below the status bar. */
  safeTop?: boolean;
  onBack?: () => void;
  /** Button tone: 'surface' on the cream page, 'muted' on white sheets. */
  tone?: 'surface' | 'muted';
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** The top bar of a screen. */
export function ScreenHeader({ title, subtitle, leading = 'back', right, safeTop = true, onBack = goBack, tone = 'surface' }: Props) {
  const insets = useSafeAreaInsets();
  const top = (safeTop ? insets.top : 0) + (leading === 'close' ? 16 : 8);

  if (leading === 'close') {
    return (
      <View style={[styles.modal, { paddingTop: top }]}>
        <View style={styles.titles}>
          {title ? (
            <Text variant="title" accessibilityRole="header" numberOfLines={2}>
              {title}
            </Text>
          ) : null}
          {subtitle ? (
            <Text variant="subhead" color="textSecondary" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right}
        <IconButton icon="close" label="Kapat" tone={tone === 'surface' ? 'surface' : 'muted'} onPress={onBack} />
      </View>
    );
  }

  return (
    <View style={[styles.bar, { paddingTop: top }]}>
      <IconButton icon="chevron-back" label="Geri" tone={tone === 'surface' ? 'surface' : 'muted'} onPress={onBack} />
      <View style={styles.center}>
        {title ? (
          <Text variant="title3" numberOfLines={1} align="center" accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={1} align="center">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: ScreenPadding, paddingBottom: 10, gap: 12 },
  center: { flex: 1 },
  right: { minWidth: 44, alignItems: 'flex-end' },
  modal: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: ScreenPadding, paddingBottom: 14 },
  titles: { flex: 1, gap: 4, paddingTop: 6 },
});
