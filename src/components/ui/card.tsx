import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  title?: string;
  subtitle?: string;
  icon?: IconName;
  right?: ReactNode;
  children?: ReactNode;
  /** 'surface' (white + hairline), 'muted' (sunken fill, no border), 'warm' (peach, for personal notes). */
  tone?: 'surface' | 'muted' | 'warm';
  style?: StyleProp<ViewStyle>;
}

/** A content card: optional icon well + title header, then its content. */
export function Card({ title, subtitle, icon, right, children, tone = 'surface', style }: Props) {
  const { colors } = useTheme();
  const look =
    tone === 'surface'
      ? { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }
      : tone === 'muted'
        ? { backgroundColor: colors.surfaceMuted }
        : { backgroundColor: colors.peachSoft, borderColor: colors.peach, borderWidth: StyleSheet.hairlineWidth };
  return (
    <View style={[styles.card, look, style]}>
      {title ? (
        <View style={styles.header}>
          {icon ? (
            <View style={[styles.well, { backgroundColor: tone === 'surface' ? colors.surfaceMuted : colors.surface }]}>
              <Icon name={icon} size={18} color={colors.text} />
            </View>
          ) : null}
          <View style={styles.flex}>
            <Text variant="title3">{title}</Text>
            {subtitle ? (
              <Text variant="subhead" color="textSecondary">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: 16, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  well: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
