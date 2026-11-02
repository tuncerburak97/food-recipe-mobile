import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { ProgressBar } from '@/components/ui/progress';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { prepareAlarms } from '@/lib/alarm';
import { upperTr } from '@/lib/format';
import {
  extendTimer,
  finishTimer,
  formatClock,
  pauseTimer,
  remaining,
  removeTimer,
  resumeTimer,
  startTimer,
  timerId,
  useNow,
  useTimers,
} from '@/store/timers';

interface Props {
  entryId: string;
  recipeTitle: string;
  stepOrder: number;
  stepText: string;
  minutes: number;
  /** The recipe did not give this time; it was estimated. */
  estimated?: boolean;
}

const MIN = 1;
const MAX = 240;
const PADDING = 16;
/** A running timer draws a stronger, text-colored border; the padding shrinks by the same amount. */
const RUNNING_BORDER = 1.5;

/**
 * The timer of a timed step. Before starting, the time can be changed with − / + (everyone cooks a
 * little differently); while it runs, minutes can be added, the timer reset or the step finished
 * early. A running timer is obvious at a glance: dark border and a "Çalışıyor" tag. Rings when it
 * ends, also with the phone locked.
 */
export function StepTimer({ entryId, recipeTitle, stepOrder, stepText, minutes, estimated }: Props) {
  const { colors } = useTheme();
  const timer = useTimers().find((t) => t.id === timerId(entryId, stepOrder));
  const now = useNow(timer?.status === 'running');
  const [planned, setPlanned] = useState(Math.min(MAX, Math.max(MIN, Math.round(minutes))));
  const running = timer?.status === 'running';
  const paused = timer?.status === 'paused';
  const rang = timer?.status === 'done';
  const left = timer ? remaining(timer, now) : planned * 60_000;
  const progress = timer && timer.durationMs > 0 ? 1 - left / timer.durationMs : 0;
  const border = running ? RUNNING_BORDER : StyleSheet.hairlineWidth;

  const adjust = (delta: number) => {
    const next = Math.min(MAX, Math.max(MIN, planned + delta));
    if (next !== planned) {
      Haptics.selectionAsync();
      setPlanned(next);
    }
  };
  const start = () => {
    prepareAlarms(); // asks for notification permission the first time
    startTimer({ entryId, recipeTitle, stepOrder, minutes: planned, label: `Adım ${stepOrder}: ${shorten(stepText)}` });
  };
  const add = (m: number) => {
    if (!timer) return;
    Haptics.selectionAsync();
    extendTimer(timer.id, m);
  };

  const toggle = running ? () => pauseTimer(timer.id) : paused ? () => resumeTimer(timer.id) : start;
  const toggleLabel = running ? 'Duraklat' : paused ? 'Devam' : rang ? 'Yeniden başlat' : 'Başlat';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: running ? colors.text : colors.border,
          borderWidth: border,
          padding: PADDING - (border - StyleSheet.hairlineWidth),
        },
      ]}>
      <View style={styles.head}>
        <Text variant="overline" color="textTertiary" style={styles.flex}>
          {upperTr('Zamanlayıcı')}
        </Text>
        {running ? (
          <Tag tone="accent" icon="timer-outline" label="Çalışıyor" />
        ) : paused ? (
          <Tag icon="pause-outline" label="Duraklatıldı" />
        ) : rang ? (
          <Tag tone="warning" icon="alarm-outline" label="Süre doldu" />
        ) : estimated ? (
          <Tag label="Tahmini süre" />
        ) : null}
      </View>

      <View style={styles.clockRow}>
        {!timer && <IconButton icon="remove" label="Bir dakika azalt" tone="muted" size={52} onPress={() => adjust(-1)} disabled={planned <= MIN} />}
        <Text
          variant="numeral"
          color={paused ? 'textSecondary' : 'text'}
          align="center"
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityRole="timer"
          accessibilityLabel={timer ? `${formatClock(left)} kaldı` : `${planned} dakika`}
          style={styles.clock}>
          {formatClock(left)}
        </Text>
        {!timer && <IconButton icon="add" label="Bir dakika artır" tone="muted" size={52} onPress={() => adjust(1)} disabled={planned >= MAX} />}
      </View>

      {timer && <ProgressBar value={progress} height={6} label="Geçen süre" />}

      <Button
        title={toggleLabel}
        icon={running ? 'pause-outline' : 'play-outline'}
        variant={running ? 'secondary' : 'dark'}
        onPress={toggle}
        accessibilityHint={running ? 'Zamanlayıcıyı duraklatır' : 'Zamanlayıcıyı başlatır'}
      />

      {timer ? (
        <View style={styles.actions}>
          <Button title="+1 dk" variant="secondary" size="sm" onPress={() => add(1)} accessibilityHint="Bir dakika ekler" style={styles.action} />
          <Button title="+5 dk" variant="secondary" size="sm" onPress={() => add(5)} accessibilityHint="Beş dakika ekler" style={styles.action} />
          <Button
            title="Sıfırla"
            variant="outline"
            size="sm"
            onPress={() => removeTimer(timer.id)}
            accessibilityHint="Zamanlayıcıyı kapatır, süre başa döner"
            style={styles.action}
          />
          <Button
            title="Bitti"
            variant="outline"
            size="sm"
            onPress={() => finishTimer(timer.id)}
            accessibilityHint="Bu adım bitti, zamanlayıcıyı kapatır"
            style={styles.action}
          />
        </View>
      ) : (
        <Text variant="footnote" color="textSecondary" align="center">
          {minutes !== planned
            ? `Tarifte ${minutes} dk yazıyor, sen ${planned} dk ayarladın.`
            : 'Süreyi − / + ile değiştirebilirsin. Süre dolunca alarm çalar, telefon kilitliyken de.'}
        </Text>
      )}
    </View>
  );
}

function shorten(text: string, max = 60): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  flex: { flex: 1 },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // Bigger than the plain numeral: this is read from across the kitchen.
  clock: { flex: 1, fontSize: 56, lineHeight: 64, letterSpacing: -1.6 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minHeight: 44, paddingHorizontal: 8 },
});
