import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatClock, remaining, useNow, useTimers } from '@/store/timers';

/**
 * This recipe's other timers as sunken pills in the bottom bar ("Adım 2  4:12"), so several can run
 * at once (pasta boiling while the sauce simmers). Tapping one opens its step.
 */
export function TimerTray({ entryId, currentStep, onOpen }: { entryId: string; currentStep?: number; onOpen: (stepOrder: number) => void }) {
  const { colors } = useTheme();
  const timers = useTimers().filter((t) => t.entryId === entryId && t.stepOrder !== currentStep && t.status !== 'done');
  const now = useNow(timers.some((t) => t.status === 'running'));
  if (!timers.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.row}>
      {timers.map((t) => {
        const paused = t.status === 'paused';
        const clock = formatClock(remaining(t, now));
        return (
          <Pressable
            key={t.id}
            onPress={() => onOpen(t.stepOrder)}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={`Adım ${t.stepOrder} zamanlayıcısı, ${clock} kaldı${paused ? ', duraklatıldı' : ''}`}
            accessibilityHint="Adımı açar"
            style={({ pressed }) => [styles.chip, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
            <Icon name={paused ? 'pause-outline' : 'timer-outline'} size={16} color={colors.text} />
            <Text variant="subhead" color="textSecondary">
              Adım {t.stepOrder}
            </Text>
            <Text variant="headline" weight="700" color={paused ? 'textSecondary' : 'text'} style={styles.clock}>
              {clock}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -ScreenPadding, flexGrow: 0 },
  row: { paddingHorizontal: ScreenPadding, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 40, paddingHorizontal: 14, borderRadius: Radius.pill },
  clock: { fontVariant: ['tabular-nums'] },
});
