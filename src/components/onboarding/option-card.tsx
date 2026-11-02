import { StyleSheet, View } from 'react-native';

import { ChoiceCard } from '@/components/ui/choice-card';
import type { Option } from '@/lib/profile';

interface CardProps {
  label: string;
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
export function OptionCard({ label, hint, selected, onPress, layout = 'row', role, disabled }: CardProps) {
  return (
    <ChoiceCard
      title={label}
      description={layout === 'row' ? hint : undefined}
      role={role}
      compact={layout === 'tile'}
      selected={selected}
      disabled={disabled}
      onPress={onPress}
    />
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
      {options.map((o) => (
        <OptionCard key={String(o.value)} role="radio" label={o.label} hint={o.hint} selected={o.value === value} onPress={() => onSelect(o.value)} />
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
        {options.map((o) => {
          const selected = values.includes(o.value);
          return (
            <OptionCard
              key={o.value}
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
          <OptionCard role="radio" label={none.label} hint={none.hint} selected={none.selected} onPress={none.onPress} />
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
});
