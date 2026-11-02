import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Spoken unit: "kişi", "dakika". */
  unit: string;
  /** Text shown after the number, e.g. "kişi" (omit to show the number only). */
  suffix?: string;
}

/** "− 4 +" with large round buttons; long-press friendly sizes for kitchen use. */
export function Stepper({ value, onChange, min = 1, max = 20, unit, suffix }: Props) {
  const { colors } = useTheme();
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next !== value) {
      Haptics.selectionAsync();
      onChange(next);
    }
  };
  return (
    <View
      style={[styles.row, { backgroundColor: colors.surfaceMuted }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${value} ${unit}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      <Pressable
        onPress={() => step(-1)}
        disabled={value <= min}
        hitSlop={6}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={({ pressed }) => [styles.btn, { backgroundColor: colors.surface, opacity: value <= min ? 0.35 : pressed ? 0.7 : 1 }]}>
        <Icon name="remove" size={18} color={colors.text} />
      </Pressable>
      <View style={styles.value}>
        <Text variant="title3" align="center" style={styles.number}>
          {value}
        </Text>
        {suffix ? (
          <Text variant="caption" color="textSecondary" align="center">
            {suffix}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={() => step(1)}
        disabled={value >= max}
        hitSlop={6}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={({ pressed }) => [styles.btn, { backgroundColor: colors.accentStrong, opacity: value >= max ? 0.35 : pressed ? 0.8 : 1 }]}>
        <Icon name="add" size={18} color={colors.onAccent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, borderRadius: 999 },
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  value: { minWidth: 44, paddingHorizontal: 4 },
  number: { fontVariant: ['tabular-nums'] },
});
