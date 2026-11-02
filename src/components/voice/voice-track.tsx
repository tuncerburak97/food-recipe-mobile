import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { TouchSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { videoClock } from '@/lib/format';

const BARS = 40;

interface Props {
  playing: boolean;
  loading: boolean;
  currentTime: number;
  /** Seconds; 0 while unknown. */
  duration: number;
  /** Loudness steps (0..1); without them a plain bar shows the progress. */
  waveform: number[];
  onToggle: () => void;
  onSeek: (fraction: number) => void;
}

/** The recording's loudness, stretched to BARS bars and scaled so quiet recordings still read. */
function bars(values: number[]): number[] {
  if (values.length === 0) return [];
  const peak = Math.max(0.05, ...values);
  return Array.from({ length: BARS }, (_, i) => Math.min(1, values[Math.floor((i * values.length) / BARS)] / peak));
}

/**
 * A recording to listen to: a round play button, the waveform that fills as it plays (tap anywhere
 * on it to jump there) and the time.
 */
export function VoiceTrack({ playing, loading, currentTime, duration, waveform, onToggle, onSeek }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const shape = bars(waveform);
  const step = duration > 0 ? 10 / duration : 0;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Duraklat' : 'Kaydı dinle'}
        accessibilityState={{ busy: loading }}
        style={({ pressed }) => [styles.play, { backgroundColor: colors.ink, opacity: pressed ? 0.8 : 1 }]}>
        {loading ? (
          <ActivityIndicator color={colors.onInk} />
        ) : (
          <Icon name={playing ? 'pause' : 'play'} size={20} color={colors.onInk} style={playing ? undefined : styles.playGlyph} />
        )}
      </Pressable>

      <View style={styles.flex}>
        <Pressable
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          onPress={(e) => width > 0 && onSeek(e.nativeEvent.locationX / width)}
          disabled={duration <= 0}
          hitSlop={{ top: 6, bottom: 6 }}
          accessibilityRole="adjustable"
          accessibilityLabel="Kaydın akışı"
          accessibilityValue={{ text: `${videoClock(currentTime)} / ${videoClock(duration)}` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => onSeek(progress + (e.nativeEvent.actionName === 'increment' ? step : -step))}
          style={styles.wave}>
          {shape.length > 0 ? (
            shape.map((v, i) => {
              const played = (i + 0.5) / shape.length <= progress;
              return (
                <View
                  key={i}
                  style={[styles.bar, { height: 3 + v * 25, backgroundColor: played ? colors.accent : colors.textTertiary, opacity: played ? 1 : 0.4 }]}
                />
              );
            })
          ) : (
            <ProgressBar value={progress} style={styles.flex} />
          )}
        </Pressable>
        <View style={styles.times}>
          <Text variant="footnote" color="textSecondary" style={styles.tabular}>
            {videoClock(currentTime)}
          </Text>
          <Text variant="footnote" color="textTertiary" style={styles.tabular}>
            {duration > 0 ? videoClock(duration) : '–:––'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  flex: { flex: 1 },
  play: { width: TouchSize, height: TouchSize, borderRadius: TouchSize / 2, alignItems: 'center', justifyContent: 'center' },
  playGlyph: { marginLeft: 3 },
  wave: { height: 40, flexDirection: 'row', alignItems: 'center', gap: 2 },
  bar: { flex: 1, borderRadius: 2 },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  tabular: { fontVariant: ['tabular-nums'] },
});
