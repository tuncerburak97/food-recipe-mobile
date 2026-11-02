import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { TouchSize } from '@/constants/theme';
import { RATINGS, type CookRating } from '@/lib/journal';

/**
 * The three verdicts as text chips that share one row (and wrap with large text). Optional: tapping
 * the chosen one again clears it.
 */
export function RatingPicker({ value, onChange, disabled }: { value?: CookRating; onChange: (r?: CookRating) => void; disabled?: boolean }) {
  return (
    <View style={styles.row}>
      {RATINGS.map((r) => (
        <Chip
          key={r.value}
          label={r.label}
          tone="sunken"
          selected={value === r.value}
          disabled={disabled}
          onPress={() => onChange(value === r.value ? undefined : r.value)}
          style={styles.chip}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexGrow: 1, minHeight: TouchSize, justifyContent: 'center' },
});
