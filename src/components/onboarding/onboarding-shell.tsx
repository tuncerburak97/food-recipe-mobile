import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { ProgressBar } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding, TouchSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Height of the top bar below the safe area; question pages pad their content by this much. */
export const TOP_BAR_HEIGHT = 64;

interface TopBarProps {
  /** 0..1 */
  progress: number;
  /** 1-based question number and the number of questions, for the spoken progress. */
  step?: number;
  total?: number;
  onBack?: () => void;
  onSkip?: () => void;
}

/** Bar over the question pages: back, a thin progress line, "Geç". Kept outside the pages so it never jumps. */
export function TopBar({ progress, step, total, onBack, onSkip }: TopBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const spoken = step && total ? `Soru ${step} / ${total}` : 'İlerleme';

  return (
    <View style={[styles.bar, { paddingTop: insets.top, height: insets.top + TOP_BAR_HEIGHT, backgroundColor: colors.surface }]}>
      <View style={styles.side}>
        {onBack ? <IconButton icon="chevron-back" label="Önceki soru" tone="muted" onPress={onBack} /> : null}
      </View>
      <ProgressBar value={Math.max(0.04, progress)} label={spoken} style={styles.track} />
      <View style={[styles.side, styles.sideEnd]}>
        {onSkip ? (
          <Pressable
            onPress={onSkip}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Geç"
            accessibilityHint="Bu soruyu boş bırakıp sonrakine geçer"
            style={({ pressed }) => [styles.skip, pressed && { backgroundColor: colors.surfaceMuted }]}>
            <Text variant="headline" color="textSecondary">
              Geç
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** One full-screen page with a short, calm cross-fade between steps. */
export function StepPage({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      exiting={FadeOut.duration(140)}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: ScreenPadding,
  },
  side: { width: 56, height: TouchSize, justifyContent: 'center' },
  sideEnd: { alignItems: 'flex-end' },
  track: { flex: 1 },
  skip: {
    minWidth: TouchSize,
    minHeight: TouchSize - 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
