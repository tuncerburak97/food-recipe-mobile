import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';

interface Props {
  items: string[];
  onPick: (q: string) => void;
  disabled?: boolean;
}

/** "SIK SORULANLAR": ready-made questions as full-width rows in one card; tapping one sends it (the send gives the haptic). */
export function StarterQuestions({ items, onPick, disabled, title = 'Sık sorulanlar' }: Props & { title?: string }) {
  const { colors } = useTheme();
  if (items.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text variant="overline" color="textTertiary" accessibilityRole="header" style={styles.title}>
        {upperTr(title)}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]}>
        {items.map((q, i) => (
          <Pressable
            key={q}
            onPress={() => onPick(q)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={q}
            accessibilityHint="Bu soruyu asistana gönderir"
            style={({ pressed }) => [
              styles.row,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              pressed && { backgroundColor: colors.surfaceMuted },
            ]}>
            <Text variant="callout" weight="500" style={styles.flex}>
              {q}
            </Text>
            <Icon name="arrow-up" size={16} color={colors.textTertiary} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Follow-up questions under an answer, as wrapping pills; tapping one sends it. */
export function SuggestionChips({ items, onPick, disabled }: Props) {
  const { colors } = useTheme();
  if (items.length === 0) return null;
  return (
    <View style={styles.wrap}>
      {items.map((q) => (
        <Pressable
          key={q}
          onPress={() => onPick(q)}
          disabled={disabled}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={q}
          accessibilityHint="Bu soruyu asistana gönderir"
          style={({ pressed }) => [
            styles.chip,
            { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : colors.surface, opacity: disabled ? 0.5 : 1 },
          ]}>
          <Text variant="subhead" weight="600">
            {q}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  title: { paddingHorizontal: 4 },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 12 },
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
});
