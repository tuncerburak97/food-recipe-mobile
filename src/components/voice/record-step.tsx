import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { videoClock } from '@/lib/format';
import { MAX_RECORDING_SEC, MIN_RECORDING_SEC, lengthLabel } from '@/lib/voice-recipe';

import { LevelMeter } from './level-meter';
import { RecordButton } from './record-button';
import type { useVoiceRecorder } from './use-voice-recorder';

interface Props {
  rec: ReturnType<typeof useVoiceRecorder>;
  onToggle: () => void;
  /** "Bitir" was tapped before MIN_RECORDING_SEC. */
  tooShort: boolean;
}

/**
 * The recording itself: a tip, the status and a large timer, the live level meter and one big
 * record / pause / resume button. A blocked microphone gets a way to Settings instead.
 */
export function RecordStep({ rec, onToggle, tooShort }: Props) {
  const { colors } = useTheme();

  if (rec.permission === 'blocked') {
    const web = Platform.OS === 'web';
    return (
      <EmptyState
        icon="mic-off-outline"
        tone="warning"
        title="Mikrofon izni kapalı"
        message={
          web
            ? 'Tarayıcının adres çubuğundan bu siteye mikrofon izni ver, sonra tekrar dene.'
            : 'Tarifi kaydedebilmek için Ayarlar’dan Tarif Defteri’ne mikrofon izni ver. Sonra buraya dön.'
        }>
        {web ? (
          <Button title="Tekrar dene" icon="refresh" variant="secondary" onPress={rec.requestPermission} />
        ) : (
          <Button title="Ayarları aç" icon="settings-outline" variant="secondary" onPress={() => Linking.openSettings()} />
        )}
      </EmptyState>
    );
  }

  const status =
    rec.phase === 'recording' ? 'Kaydediliyor' : rec.phase === 'paused' ? 'Duraklatıldı' : 'Hazır olunca kayda başla';

  return (
    <View style={styles.body}>
      <View style={[styles.tip, { backgroundColor: colors.surfaceMuted }]}>
        <Icon name="bulb-outline" size={18} color={colors.text} style={styles.tipIcon} />
        <Text variant="callout" style={styles.flex}>
          Malzemeleri ve miktarlarını söylemesini iste. “Bir çay bardağı”, “göz kararı” gibi ölçüler de olur.
        </Text>
      </View>

      <View style={styles.recorder}>
        <View style={styles.status} accessibilityLiveRegion="polite">
          <View
            style={[styles.dot, { backgroundColor: rec.phase === 'recording' ? colors.accent : colors.textTertiary }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text variant="subhead" weight="600" color={rec.phase === 'recording' ? 'text' : 'textSecondary'}>
            {status}
          </Text>
        </View>
        <Text
          variant="numeral"
          align="center"
          color={rec.phase === 'idle' ? 'textTertiary' : 'text'}
          accessibilityLabel={`Kayıt süresi ${rec.seconds >= 1 ? lengthLabel(rec.seconds) : 'sıfır'}`}>
          {videoClock(rec.seconds)}
        </Text>
        <LevelMeter levels={rec.levels} active={rec.phase === 'recording'} />
        <RecordButton phase={rec.phase} onPress={onToggle} disabled={rec.limitReached && rec.phase === 'paused'} />
      </View>

      {tooShort ? (
        <Notice icon="time-outline" tone="warning">
          {`Kayıt çok kısa. Tarifi baştan sona anlatmasını iste; en az ${MIN_RECORDING_SEC} saniye.`}
        </Notice>
      ) : null}
      {rec.limitReached ? (
        <Notice icon="time-outline">{`${MAX_RECORDING_SEC / 60} dakikaya ulaştın. Kaydı “Bitir” ile tamamlayabilirsin.`}</Notice>
      ) : null}
      {rec.refused && rec.permission === 'ask' ? (
        <Notice icon="mic-off-outline" tone="warning">
          Kayıt için mikrofon izni gerekiyor. Mikrofona tekrar dokunup izin verebilirsin.
        </Notice>
      ) : null}
      {rec.failed ? (
        <Notice icon="alert-circle-outline" tone="danger">
          Mikrofon açılamadı. Başka bir uygulama kullanıyor olabilir; onu kapatıp tekrar dene.
        </Notice>
      ) : null}
    </View>
  );
}

function Notice({ icon, tone, children }: { icon: IconName; tone?: 'warning' | 'danger'; children: string }) {
  const { colors } = useTheme();
  const fg = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.textSecondary;
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Icon name={icon} size={17} color={fg} style={styles.tipIcon} />
      <Text variant="subhead" tint={fg} style={styles.flex}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: 24 },
  flex: { flex: 1 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: Radius.md },
  tipIcon: { marginTop: 1 },
  recorder: { alignItems: 'center', gap: 14, paddingTop: 6 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 20 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
});
