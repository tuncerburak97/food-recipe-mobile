import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ProgressBar } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

const MESSAGES = [
  'Videonun açıklaması okunuyor…',
  'Malzemeler ayıklanıyor…',
  'Ölçüler düzenleniyor…',
  'Adımlar sıraya diziliyor…',
  'Pişirme süresi hesaplanıyor…',
];

interface Props {
  title?: string;
  /** Lines shown one after another while the AI works. */
  messages?: string[];
  hint?: string;
}

/**
 * Shown while the AI works (recipe agent: usually 10-20 s). Calm on purpose: a spinner in a well,
 * one status line at a time, a bar that slowly fills (it never claims to be done) and the seconds.
 */
export function AiLoader({ title = 'Tarifin hazırlanıyor', messages = MESSAGES, hint = 'Genelde 10-20 saniye sürer' }: Props) {
  const { colors } = useTheme();
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const msg = setInterval(() => setIndex((i) => Math.min(i + 1, messages.length - 1)), 2600);
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(msg);
      clearInterval(clock);
    };
  }, [messages.length]);

  // Eases towards ~90% and waits there; the screen changes when the recipe is really ready.
  const progress = 0.06 + 0.86 * (1 - Math.exp(-seconds / 9));

  return (
    <View style={styles.wrap}>
      <View style={[styles.well, { backgroundColor: colors.surfaceMuted }]}>
        <ActivityIndicator color={colors.text} />
      </View>

      <View style={styles.texts}>
        <Text variant="title2" align="center" accessibilityRole="header">
          {title}
        </Text>
        <View style={styles.status} accessibilityLiveRegion="polite">
          <Animated.View key={index} entering={FadeIn.duration(260)}>
            <Text variant="callout" color="textSecondary" align="center">
              {messages[index]}
            </Text>
          </Animated.View>
        </View>
      </View>

      <ProgressBar value={progress} label={title} style={styles.bar} />

      <Text variant="footnote" color="textTertiary" align="center" style={styles.clock}>
        {seconds} sn · {hint}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 20, paddingTop: 56, paddingBottom: 40 },
  well: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  texts: { alignItems: 'center', gap: 6, alignSelf: 'stretch' },
  status: { minHeight: 20 },
  bar: { alignSelf: 'stretch', marginHorizontal: 40 },
  clock: { fontVariant: ['tabular-nums'] },
});
