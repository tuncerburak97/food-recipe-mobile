import { useEffect, useState, type ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/icon-button';
import { StickyFooter } from '@/components/ui/layout';
import { ProgressBar } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { lengthLabel, tellerTitle } from '@/lib/voice-recipe';

import { VoiceStages, type Stage } from './voice-stages';

interface Props {
  flow: string;
  step: number;
  totalSteps: number;
  teller: string;
  durationSec: number;
  stages: Stage[];
  error: { title: string; message: string } | null;
  /** The recording reached the server: closing the screen no longer loses anything. */
  uploaded: boolean;
  /** Changes with every new try, so the elapsed time starts again. */
  attempt: number;
  onClose: () => void;
  footer: ReactNode;
}

/**
 * The last step of the flow, while the recording becomes a recipe. Same header as the wizard (no
 * "Geri": the recording is already on its way), the stages as a timeline, and the elapsed time.
 */
export function ProcessStep({ flow, step, totalSteps, teller, durationSec, stages, error, uploaded, attempt, onClose, footer }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === 'ios' ? 14 : insets.top + 8;

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <View style={styles.topRow}>
          <View style={styles.spacer} />
          <View style={styles.flex}>
            <Text variant="footnote" color="textSecondary" align="center" numberOfLines={1}>
              {flow}
            </Text>
            <Text variant="subhead" weight="700" align="center" accessibilityLabel={`Adım ${step} / ${totalSteps}`}>
              Adım {step}/{totalSteps}
            </Text>
          </View>
          <IconButton icon="close" label="Kapat" tone="muted" onPress={onClose} />
        </View>
        <ProgressBar value={step / totalSteps} label={`Adım ${step} / ${totalSteps}`} />
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInRight.duration(240)} style={styles.body}>
          <View style={styles.titles}>
            <Text variant="title" accessibilityRole="header">
              {error ? 'Tarif hazırlanamadı' : 'Tarifin hazırlanıyor'}
            </Text>
            <Text variant="callout" color="textSecondary">
              {tellerTitle(teller)} · {lengthLabel(durationSec)}
            </Text>
          </View>

          <VoiceStages stages={stages} />

          {error ? (
            <Animated.View
              entering={FadeIn.duration(240)}
              style={[styles.error, { backgroundColor: colors.surfaceMuted }]}
              accessibilityLiveRegion="assertive">
              <Text variant="title3">{error.title}</Text>
              <Text variant="callout" color="textSecondary">
                {error.message}
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.wait}>
              <Elapsed key={attempt} />
              {uploaded ? (
                <Text variant="footnote" color="textSecondary">
                  Bu ekranı kapatsan da tarif hazırlanmaya devam eder; hazır olunca Tariflerim’de olur.
                </Text>
              ) : null}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <StickyFooter>{footer}</StickyFooter>
    </View>
  );
}

/** Seconds since this try started, so a long wait still feels alive. */
function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(clock);
  }, []);
  return (
    <Text variant="footnote" color="textTertiary" style={styles.tabular}>
      {seconds} sn · Genelde yarım dakika kadar sürer
    </Text>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: ScreenPadding, gap: 14, paddingBottom: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spacer: { width: 44 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: 18, paddingBottom: 32 },
  body: { gap: 26 },
  titles: { gap: 8 },
  error: { gap: 6, padding: 16, borderRadius: Radius.lg },
  wait: { gap: 8 },
  tabular: { fontVariant: ['tabular-nums'] },
});
