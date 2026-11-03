import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { ChoiceCard } from '@/components/ui/choice-card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Option } from '@/lib/profile';

/** Answers slide in one after another when a question opens. */
const entering = (i: number) => FadeInDown.delay(60 + i * 40).duration(320);

interface CardProps {
  label: string;
  emoji?: string;
  /** Position in the list, for the staggered entrance. */
  index?: number;
  hint?: string;
  selected: boolean;
  onPress: () => void;
  /** row: full width with hint. tile: half width (multi-choice grid). */
  layout?: 'row' | 'tile';
  /** radio for single choice, checkbox for multi choice. */
  role: 'radio' | 'checkbox';
  disabled?: boolean;
}

/** One plainly worded answer: the shared ChoiceCard with a radio or checkbox mark. */
export function OptionCard({ label, emoji, index = 0, hint, selected, onPress, layout = 'row', role, disabled }: CardProps) {
  const { colors } = useTheme();
  const tile = layout === 'tile';
  if (tile) return <Tile label={label} emoji={emoji} index={index} selected={selected} onPress={onPress} disabled={disabled} />;
  const size = 44;
  const leading = emoji ? (
    <View style={[styles.emoji, { width: size, height: size, borderRadius: size / 2, backgroundColor: selected ? colors.surface : colors.surfaceMuted }]}>
      <Text style={styles.rowEmoji} accessibilityElementsHidden importantForAccessibility="no">
        {emoji}
      </Text>
    </View>
  ) : undefined;
  return (
    <Animated.View entering={entering(index)}>
      <ChoiceCard title={label} description={hint} role={role} selected={selected} disabled={disabled} onPress={onPress} leading={leading} />
    </Animated.View>
  );
}

/** A multi-choice answer as a square-ish tile: the emoji big on top, the words below, a check mark. */
function Tile({ label, emoji, index, selected, onPress, disabled }: { label: string; emoji?: string; index: number; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={entering(index)} style={styles.tileSlot}>
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          onPress();
        }}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: selected, disabled: !!disabled }}
        style={({ pressed }) => [
          styles.tile,
          {
            backgroundColor: selected ? colors.accentSoft : pressed ? colors.surfaceMuted : colors.surface,
            borderColor: selected ? colors.accentStrong : colors.border,
            opacity: disabled ? 0.4 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}>
        <View style={styles.tileTop}>
          <Text style={styles.tileEmoji} accessibilityElementsHidden importantForAccessibility="no">
            {emoji}
          </Text>
          {selected ? (
            <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.tick, { backgroundColor: colors.accentStrong }]}>
              <Icon name="checkmark" size={13} color={colors.onAccent} />
            </Animated.View>
          ) : (
            <View style={[styles.tick, { borderWidth: 1.5, borderColor: colors.border }]} />
          )}
        </View>
        <Text variant="headline" numberOfLines={2}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

interface SingleProps {
  options: Option<string | number>[];
  value: string | number | undefined;
  onSelect: (value: string | number) => void;
}

/** One answer from a short list: full-width radio rows. */
export function SingleChoice({ options, value, onSelect }: SingleProps) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {options.map((o, i) => (
        <OptionCard
          key={String(o.value)}
          index={i}
          role="radio"
          label={o.label}
          emoji={o.emoji}
          hint={o.hint}
          selected={o.value === value}
          onPress={() => onSelect(o.value)}
        />
      ))}
    </View>
  );
}

interface MultiProps {
  options: Option<string>[];
  values: readonly string[];
  onToggle: (value: string) => void;
  /** The "nothing applies" answer, shown full width under the grid. */
  none?: { label: string; hint?: string; selected: boolean; onPress: () => void };
  max?: number;
}

/** Several answers: checkbox tiles in two columns, then an optional full-width "none" answer. */
export function MultiChoice({ options, values, onToggle, none, max }: MultiProps) {
  const full = max !== undefined && values.length >= max;
  return (
    <View style={styles.list}>
      <View style={styles.grid}>
        {options.map((o, i) => {
          const selected = values.includes(o.value);
          return (
            <OptionCard
              key={o.value}
              index={i}
              emoji={o.emoji}
              layout="tile"
              role="checkbox"
              label={o.label}
              selected={selected}
              disabled={full && !selected}
              onPress={() => onToggle(o.value)}
            />
          );
        })}
        {/* Keeps the last tile half width when the count is odd. */}
        {options.length % 2 === 1 ? <View style={styles.filler} /> : null}
      </View>
      {none ? (
        <View style={styles.none}>
          <OptionCard index={options.length} role="radio" label={none.label} hint={none.hint} selected={none.selected} onPress={none.onPress} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filler: { flexBasis: '47%', flexGrow: 1 },
  none: { marginTop: 4 },
  tileSlot: { flexBasis: '47%', flexGrow: 1 },
  tile: { minHeight: 98, padding: 14, gap: 10, borderRadius: Radius.lg, borderWidth: 1.5, justifyContent: 'space-between' },
  tileTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  tileEmoji: { fontSize: 26, lineHeight: 32 },
  tick: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  emoji: { alignItems: 'center', justifyContent: 'center' },
  rowEmoji: { fontSize: 22, lineHeight: 28 },
});
