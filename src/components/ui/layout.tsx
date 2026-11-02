import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The app's signature layout, used by the tab screens: the cream page (greeting, search, main
 * actions) above a white sheet with a rounded top. Put it at the top of a scroll view's content;
 * give the scroll view `sheetScrollStyles(colors)` so overscroll above is cream and below is white.
 */
export function SheetHeader({ header, children, sheetStyle }: { header: ReactNode; children: ReactNode; sheetStyle?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.background }]}>{header}</View>
      <View style={{ backgroundColor: colors.background }}>
        <View style={[styles.sheetTop, { backgroundColor: colors.surface, borderColor: colors.border }]} />
      </View>
      <View style={[styles.sheetBody, { backgroundColor: colors.surface }, sheetStyle]}>{children}</View>
    </View>
  );
}

/** Scroll view styles that pair with SheetHeader. */
export function sheetScrollStyles(colors: { background: string; surface: string }) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, backgroundColor: colors.surface },
  });
}

/**
 * A fixed (non-scrolling) version: the page header on cream, then a white sheet that fills the rest
 * of the screen and owns its own scrolling (lists).
 */
export function SheetLayout({ header, children }: { header: ReactNode; children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>{header}</View>
      <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

/** A bar pinned to the bottom of a screen (main action), above the home indicator. */
export function StickyFooter({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopColor: colors.border },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: ScreenPadding, paddingBottom: 22, gap: 16 },
  sheetTop: {
    height: Radius.sheet,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetBody: { marginTop: -8 },
  sheet: {
    flex: 1,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  footer: { paddingHorizontal: ScreenPadding, paddingTop: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
});
