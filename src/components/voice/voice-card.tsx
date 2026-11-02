import type { AudioSource } from 'expo-audio';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tellerTitle } from '@/lib/voice-recipe';

import { useVoicePlayer } from './use-voice-player';
import { VoiceTrack } from './voice-track';

interface Props {
  teller?: string | null;
  subtitle: string;
  /** Known length in seconds, shown until the player reports its own. */
  durationSec?: number;
  waveform: number[];
  load: () => Promise<{ source: AudioSource; release?: () => void }>;
}

/**
 * The warm "Annem anlatıyor" card: who tells the recipe and their recording to listen to. The same
 * card is on the recipe page and in the recording step, so the user sees what they will keep.
 */
export function VoiceCard({ teller, subtitle, durationSec, waveform, load }: Props) {
  const { colors } = useTheme();
  const p = useVoicePlayer(load);
  const duration = p.duration > 0 ? p.duration : (durationSec ?? 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.peachSoft, borderColor: colors.peach }]}>
      <View style={styles.head}>
        <View style={[styles.well, { backgroundColor: colors.surface }]}>
          <Icon name="mic-outline" size={17} color={colors.text} />
        </View>
        <View style={styles.flex}>
          <Text variant="title3" numberOfLines={1}>
            {tellerTitle(teller)}
          </Text>
          <Text variant="subhead" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
      <VoiceTrack
        playing={p.playing}
        loading={p.loading}
        currentTime={p.currentTime}
        duration={duration}
        waveform={waveform}
        onToggle={p.toggle}
        onSeek={p.seekTo}
      />
      {p.failed ? (
        <Text variant="footnote" color="danger" accessibilityLiveRegion="polite">
          Kayıt şu an çalınamadı. Bağlantını kontrol edip tekrar dene.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16, padding: 18, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  well: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 1 },
});
