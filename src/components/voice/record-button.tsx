import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

import type { RecorderPhase } from './use-voice-recorder';

const SIZE = 96;

/**
 * The one big control of the recording step. Idle it is the main action (filled accent, "Kayda
 * başla"); while recording it turns quiet ("Duraklat") so "Bitir" is the next step; paused it is an
 * accent ring ("Devam et").
 */
export function RecordButton({ phase, onPress, disabled }: { phase: RecorderPhase; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  const look: { bg: string; fg: string; border: string; icon: IconName; label: string } =
    phase === 'idle'
      ? { bg: colors.accentStrong, fg: colors.onAccent, border: colors.accentStrong, icon: 'mic-outline', label: 'Kayda başla' }
      : phase === 'recording'
        ? { bg: colors.surfaceMuted, fg: colors.text, border: colors.surfaceMuted, icon: 'pause', label: 'Duraklat' }
        : { bg: colors.surface, fg: colors.accentText, border: colors.accentStrong, icon: 'mic-outline', label: 'Devam et' };

  return (
    <View style={styles.wrap}>
      <PressableScale
        haptic
        scaleTo={0.94}
        onPress={onPress}
        disabled={disabled}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={look.label}
        accessibilityState={{ disabled: !!disabled }}
        style={[styles.button, { backgroundColor: look.bg, borderColor: look.border, opacity: disabled ? 0.4 : 1 }]}>
        <Icon name={look.icon} size={36} color={look.fg} />
      </PressableScale>
      <Text variant="headline" color={phase === 'idle' ? 'text' : 'textSecondary'} importantForAccessibility="no" accessibilityElementsHidden>
        {look.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10 },
  button: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
