import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

/** Pulses its children (placeholder blocks) while content loads. */
export function SkeletonPulse({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 850 }), -1, true));
  }, [pulse]);
  const animated = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <Animated.View style={[animated, style]} accessibilityRole="progressbar" accessibilityLabel="Yükleniyor">
      {children}
    </Animated.View>
  );
}

/** One placeholder block. */
export function SkeletonBlock({ width = '100%', height = 14, radius = 7, style }: { width?: DimensionValue; height?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceMuted }, style]} />;
}
