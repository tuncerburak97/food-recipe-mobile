import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AssistantAvatar } from '@/components/assistant/chat-bubble';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Three softly pulsing dots while the assistant is answering. */
export function TypingIndicator() {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Asistan yazıyor"
      accessibilityLiveRegion="polite">
      <AssistantAvatar />
      <View style={[styles.bubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[0, 1, 2].map((i) => (
          <Dot key={i} delay={i * 160} color={colors.textTertiary} />
        ))}
      </View>
    </Animated.View>
  );
}

function Dot({ delay, color }: { delay: number; color: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    const ease = Easing.inOut(Easing.quad);
    t.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 320, easing: ease }), withTiming(0, { duration: 320, easing: ease })), -1)));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + t.get() * 0.65, transform: [{ translateY: -3 * t.get() }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
    borderTopLeftRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
