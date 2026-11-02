import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  /** 0..1 */
  value: number;
  height?: number;
  /** Spoken label, e.g. "Adım 2 / 6". */
  label?: string;
  style?: StyleProp<ViewStyle>;
}

/** A thin bar that fills with the accent, animated between values. */
export function ProgressBar({ value, height = 4, label, style }: Props) {
  const { colors } = useTheme();
  const fill = useSharedValue(value);

  useEffect(() => {
    fill.set(withTiming(value, { duration: 280, easing: Easing.out(Easing.cubic) }));
  }, [value, fill]);

  const bar = useAnimatedStyle(() => ({ width: `${Math.min(1, Math.max(0, fill.get())) * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.track, { height, backgroundColor: colors.surfaceMuted }, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: colors.accent }, bar]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
});
