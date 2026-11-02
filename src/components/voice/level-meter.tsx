import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const HEIGHT = 64;
const MIN_BAR = 4;

/**
 * The voice as it is recorded: thin rounded bars, newest on the right, older ones fading out. Gray
 * and flat while nothing is being recorded. Decorative: the timer and status line say the same.
 */
export function LevelMeter({ levels, active }: { levels: number[]; active: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {levels.map((level, i) => (
        <View
          key={i}
          style={[
            styles.bar,
            {
              height: MIN_BAR + (active ? level : 0) * (HEIGHT - MIN_BAR),
              backgroundColor: active ? colors.accent : colors.textTertiary,
              opacity: 0.25 + 0.75 * ((i + 1) / levels.length),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, alignSelf: 'stretch' },
  bar: { flex: 1, maxWidth: 5, borderRadius: 3 },
});
