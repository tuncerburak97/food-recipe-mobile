import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { upperTr } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

interface GroupProps {
  /** Small capitals above the card ("HESABIM"). */
  title?: string;
  /** Quiet line under the card. */
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A titled, bordered card of rows (settings, menus, short facts). Rows draw their own dividers. */
export function ListGroup({ title, footer, children, style }: GroupProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.group, style]}>
      {title ? (
        <Text variant="overline" color="textTertiary" accessibilityRole="header" style={styles.groupTitle}>
          {upperTr(title)}
        </Text>
      ) : null}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
      {footer ? (
        <Text variant="footnote" color="textTertiary" style={styles.groupTitle}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

interface RowProps {
  title: string;
  subtitle?: string;
  /** Leading glyph in a round well. */
  icon?: IconName;
  /** Any leading element instead of an icon (avatar, thumbnail). */
  leading?: ReactNode;
  /** Short value on the right ("1.0.2", "3 tarif"). */
  value?: string;
  /** Any element on the right instead of the chevron. */
  trailing?: ReactNode;
  onPress?: () => void;
  danger?: boolean;
  busy?: boolean;
  /** First row of a group: no divider above it. */
  first?: boolean;
  accessibilityHint?: string;
  subtitleLines?: number;
}

/** One row: icon well, title + subtitle, value, chevron when tappable. */
export function ListRow({ title, subtitle, icon, leading, value, trailing, onPress, danger, busy, first, accessibilityHint, subtitleLines = 2 }: RowProps) {
  const { colors } = useTheme();
  const tint = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || busy}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[title, subtitle, value].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        pressed && onPress ? { backgroundColor: colors.surfaceMuted } : null,
      ]}>
      {leading ??
        (icon ? (
          <View style={[styles.well, { backgroundColor: danger ? colors.dangerSoft : colors.surfaceMuted }]}>
            <Icon name={icon} size={18} color={tint} />
          </View>
        ) : null)}
      <View style={styles.texts}>
        <Text variant="headline" tint={tint} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" color="textSecondary" numberOfLines={subtitleLines}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="subhead" color="textSecondary" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {busy ? (
        <ActivityIndicator color={colors.textSecondary} />
      ) : (
        (trailing ?? (onPress && !danger ? <Icon name="chevron-forward" size={18} color={colors.textTertiary} /> : null))
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  groupTitle: { paddingHorizontal: 4 },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingHorizontal: 16, paddingVertical: 12 },
  well: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
});
