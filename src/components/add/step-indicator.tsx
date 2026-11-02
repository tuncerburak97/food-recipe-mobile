import { Fragment, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type State = 'done' | 'active' | 'todo';

interface Props {
  steps: string[];
  /** 0-based index of the step on screen. */
  current: number;
  /** True once the current step finished (it shows a check and the next segment fills). */
  currentDone?: boolean;
}

/**
 * "① Link ─── ② Video ─── ③ Tarif": numbered circles joined by thin segments that fill as the user
 * moves on. Read out as one line ("Adım 2 / 3: Video").
 */
export function StepIndicator({ steps, current, currentDone }: Props) {
  const stateOf = (i: number): State => (i < current || (i === current && currentDone) ? 'done' : i === current ? 'active' : 'todo');

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Adım ${current + 1} / ${steps.length}: ${steps[current]}${currentDone ? ', tamamlandı' : ''}`}>
      {steps.map((label, i) => (
        <Fragment key={label}>
          {i > 0 ? <Segment filled={stateOf(i - 1) === 'done'} /> : null}
          <StepMark index={i} label={label} state={stateOf(i)} />
        </Fragment>
      ))}
    </View>
  );
}

function StepMark({ index, label, state }: { index: number; label: string; state: State }) {
  const { colors } = useTheme();
  const circle =
    state === 'done'
      ? { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong }
      : state === 'active'
        ? { backgroundColor: colors.surface, borderColor: colors.accentStrong }
        : { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted };

  return (
    <View style={styles.mark}>
      <View style={[styles.circle, circle]}>
        {state === 'done' ? (
          <Icon name="checkmark" size={14} color={colors.onAccent} />
        ) : (
          <Text variant="footnote" weight="700" color={state === 'active' ? 'accentText' : 'textTertiary'} style={styles.number}>
            {index + 1}
          </Text>
        )}
      </View>
      <Text variant="subhead" weight={state === 'todo' ? '500' : '700'} color={state === 'todo' ? 'textTertiary' : 'text'} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Segment({ filled }: { filled: boolean }) {
  const { colors } = useTheme();
  const fill = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    fill.set(withTiming(filled ? 1 : 0, { duration: 280, easing: Easing.out(Easing.cubic) }));
  }, [filled, fill]);

  const bar = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
      <Animated.View style={[styles.fill, { backgroundColor: colors.accent }, bar]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  number: { fontVariant: ['tabular-nums'] },
  track: { flex: 1, minWidth: 12, height: 2, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
});
