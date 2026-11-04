import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { AgentStep } from '@/lib/agent/types';

/** A soft shimmer on the "thinking" line, so a quiet second still looks alive. */
function Pulse({ children }: { children: React.ReactNode }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.45, { duration: 700 }), -1, true);
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function StepLine({ step }: { step: AgentStep }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(180)} layout={LinearTransition.duration(180)} style={styles.line}>
      <View style={styles.mark}>
        {step.status === 'running' ? (
          <ActivityIndicator size="small" color={colors.textTertiary} style={styles.spinner} />
        ) : step.status === 'failed' ? (
          <Icon name="close-circle" size={16} color={colors.danger} />
        ) : (
          <Icon name="checkmark-circle" size={16} color={colors.success} />
        )}
      </View>
      <Text variant="callout" color={step.status === 'running' ? 'text' : 'textSecondary'} numberOfLines={2} style={styles.flex}>
        {step.label}
      </Text>
    </Animated.View>
  );
}

function seconds(ms: number) {
  return `${(ms / 1000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} sn`;
}

interface Props {
  steps: AgentStep[];
  status?: string;
  streaming: boolean;
  /** The answer started: the log folds up. */
  answering: boolean;
  ms?: number;
}

/**
 * What the assistant is doing. While it works: each search as a live line (spinner, then a check
 * and the count). Once the answer is there: one quiet line ("2 arama · 1,2 sn") that opens the steps.
 */
export function WorkLog({ steps, status, streaming, answering, ms }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const folded = !streaming || answering;

  if (steps.length === 0) {
    if (!streaming || answering) return null;
    return (
      <Pulse>
        <View style={styles.line} accessibilityLiveRegion="polite">
          <View style={styles.mark}>
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
          </View>
          <Text variant="callout" color="textSecondary">
            {status || 'Düşünüyorum'}…
          </Text>
        </View>
      </Pulse>
    );
  }

  if (folded && !open) {
    const n = steps.length;
    const summary = [`${n} arama`, ms ? seconds(ms) : null].filter(Boolean).join(' · ');
    return (
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${summary}. Adımları göster`}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}>
        <Icon name="sparkles-outline" size={14} color={colors.textTertiary} />
        <Text variant="footnote" color="textTertiary">
          {summary}
        </Text>
        <Icon name="chevron-down" size={13} color={colors.textTertiary} />
      </Pressable>
    );
  }

  return (
    <Animated.View layout={LinearTransition.duration(180)} style={styles.log} accessibilityLiveRegion="polite">
      {steps.map((s) => (
        <StepLine key={s.id} step={s} />
      ))}
      {folded && (
        <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Adımları gizle" style={styles.hide}>
          <Text variant="footnote" color="textTertiary">
            Gizle
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  log: { gap: 8 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 22 },
  mark: { width: 18, alignItems: 'center' },
  spinner: { transform: [{ scale: 0.75 }] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 24 },
  pressed: { opacity: 0.6 },
  hide: { alignSelf: 'flex-start', paddingLeft: 28 },
});
