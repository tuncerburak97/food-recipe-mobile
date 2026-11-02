import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const DOT = 6;
const ACTIVE = 22;

function Dot({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({ width: withTiming(active ? ACTIVE : DOT, { duration: 220 }) }));
  return <Animated.View style={[styles.dot, { backgroundColor: active ? colors.text : colors.textTertiary, opacity: active ? 1 : 0.5 }, style]} />;
}

/** Where you are in a short set of pages: the current page is a wide pill, the others small dots. */
export function PageDots({ count, index }: { count: number; index: number }) {
  return (
    <View style={styles.row} accessible accessibilityRole="text" accessibilityLabel={`Sayfa ${index + 1} / ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} active={i === index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, height: 12 },
  dot: { height: DOT, borderRadius: Radius.pill },
});
