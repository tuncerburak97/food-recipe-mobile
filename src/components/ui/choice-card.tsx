import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  title: string;
  description?: string;
  /** Leading glyph in a round well. */
  icon?: IconName;
  leading?: ReactNode;
  selected?: boolean;
  onPress: () => void;
  /**
   * radio: one answer in a group (round mark). checkbox: many answers (square mark).
   * button: navigation (chevron).
   */
  role?: 'radio' | 'checkbox' | 'button';
  /** Half-width tile for short answers in a two-column grid (no description). */
  compact?: boolean;
  disabled?: boolean;
}

/** A large, plainly worded answer card with a clear selected state. */
export function ChoiceCard({ title, description, icon, leading, selected = false, onPress, role = 'radio', compact, disabled }: Props) {
  const { colors } = useTheme();
  const mark =
    role === 'radio' ? (
      <View style={[styles.radio, { borderColor: selected ? colors.accentStrong : colors.textTertiary }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.accentStrong }]} /> : null}
      </View>
    ) : role === 'checkbox' ? (
      <View
        style={[
          styles.check,
          selected ? { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong } : { borderColor: colors.textTertiary },
        ]}>
        {selected ? <Icon name="checkmark" size={14} color={colors.onAccent} /> : null}
      </View>
    ) : (
      <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
    );

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      accessibilityState={role === 'button' ? { disabled: !!disabled } : { checked: selected, selected, disabled: !!disabled }}
      style={({ pressed }) => [
        compact ? styles.tile : styles.card,
        {
          backgroundColor: selected ? colors.accentSoft : pressed ? colors.surfaceMuted : colors.surface,
          borderColor: selected ? colors.accentStrong : colors.border,
          opacity: disabled ? 0.4 : 1,
        },
      ]}>
      {leading ??
        (icon ? (
          <View style={[styles.well, { backgroundColor: selected ? colors.surface : colors.surfaceMuted }]}>
            <Icon name={icon} size={19} color={colors.text} />
          </View>
        ) : null)}
      <View style={styles.texts}>
        <Text variant="headline" numberOfLines={compact ? 2 : 3}>
          {title}
        </Text>
        {description && !compact ? (
          <Text variant="subhead" color="textSecondary" numberOfLines={3}>
            {description}
          </Text>
        ) : null}
      </View>
      {mark}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  well: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  check: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
