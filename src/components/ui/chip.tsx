import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ChipProps {
  label: string;
  icon?: IconName;
  /** A small number after the label (e.g. recipe count). */
  count?: number;
  selected?: boolean;
  onPress?: () => void;
  /** Shows an × after the label: tapping removes the item. */
  removable?: boolean;
  disabled?: boolean;
  /** 'raised' sits on the cream page (white chip), 'sunken' on white sheets (muted chip). */
  tone?: 'raised' | 'sunken';
  size?: 'md' | 'sm';
  /** 'toggle' (default) for filters and picks, 'button' for chips that navigate. */
  kind?: 'toggle' | 'button';
  style?: StyleProp<ViewStyle>;
}

/**
 * A pill. Tappable when `onPress` is set (filters, quick picks); selected chips fill with the accent.
 * Static chips are quiet labels.
 */
export function Chip({ label, icon, count, selected, onPress, removable, disabled, tone = 'raised', size = 'md', kind = 'toggle', style }: ChipProps) {
  const { colors } = useTheme();
  const idle = tone === 'raised' ? { backgroundColor: colors.surface, borderColor: colors.border } : { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted };
  const on = { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong };
  const fg = selected ? colors.onAccent : colors.text;
  const sub = selected ? colors.onAccent : colors.textTertiary;

  const content = (
    <>
      {icon ? <Icon name={icon} size={size === 'sm' ? 13 : 15} color={selected ? colors.onAccent : colors.textSecondary} /> : null}
      <Text variant={size === 'sm' ? 'footnote' : 'subhead'} weight="600" tint={fg} numberOfLines={1}>
        {label}
      </Text>
      {count != null ? (
        <Text variant="footnote" tint={sub} style={selected ? styles.faint : undefined}>
          {count}
        </Text>
      ) : null}
      {removable ? <Icon name="close" size={15} color={fg} /> : null}
    </>
  );

  const shape = [styles.chip, size === 'sm' ? styles.sm : styles.md, selected ? on : idle, { opacity: disabled ? 0.4 : 1 }, style];
  if (!onPress) return <View style={shape}>{content}</View>;
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      disabled={disabled}
      hitSlop={4}
      accessibilityRole={removable || kind === 'button' ? 'button' : 'checkbox'}
      accessibilityLabel={removable ? `${label}, çıkar` : count != null ? `${label}, ${count}` : label}
      accessibilityState={removable || kind === 'button' ? { disabled: !!disabled } : { checked: !!selected, disabled: !!disabled }}
      style={({ pressed }) => [shape, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

/** A horizontal, edge-to-edge scrolling row of chips inside a padded screen. */
export function ChipRow({ children, padding = ScreenPadding }: { children: React.ReactNode; padding?: number }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -padding, flexGrow: 0 }}
      contentContainerStyle={[styles.row, { paddingHorizontal: padding }]}>
      {children}
    </ScrollView>
  );
}

/** Chips that wrap onto several lines. */
export function ChipWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  md: { minHeight: 38, paddingHorizontal: 14 },
  sm: { minHeight: 30, paddingHorizontal: 11, gap: 5 },
  faint: { opacity: 0.75 },
  pressed: { opacity: 0.75 },
  row: { gap: 8, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
