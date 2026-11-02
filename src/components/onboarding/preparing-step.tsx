import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StickyFooter } from '@/components/ui/layout';
import { ProgressBar } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';

const DURATION_MS = 10_000;
const ITEMS = [
  'Damak zevkin inceleniyor',
  'Alerjilerin ve beslenme tercihlerin kaydediliyor',
  'Mutfağındaki aletlere göre tarifler seçiliyor',
  'Sana özel tarifler hazırlanıyor',
];

/**
 * A calm ten-second moment after the questions: a progress line and a short checklist that ticks
 * one item at a time, then "Devam". Nothing moves on by itself.
 */
export function PreparingStep({ name, onDone }: { name: string; onDone: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [ticked, setTicked] = useState(0);
  const done = ticked >= ITEMS.length;

  useEffect(() => {
    const step = DURATION_MS / ITEMS.length;
    const timers = ITEMS.map((_, i) =>
      setTimeout(() => {
        setTicked(i + 1);
        Haptics.selectionAsync();
        if (i === ITEMS.length - 1) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, step * (i + 1)),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  const title = done ? 'Mutfağın hazır' : name ? `${name}, sana özel tarifler hazırlanıyor` : 'Sana özel tarifler hazırlanıyor';

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 56 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header} accessibilityLiveRegion="polite">
          <Text variant="overline" color={done ? 'success' : 'textTertiary'}>
            {upperTr(done ? 'Hazır' : 'Bir saniye')}
          </Text>
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="body" color="textSecondary">
            {done ? 'Bir sonraki ekranda cevaplarını kontrol edebilirsin.' : 'Cevaplarına göre her şeyi ayarlıyoruz.'}
          </Text>
        </View>

        <ProgressBar value={Math.max(0.04, ticked / ITEMS.length)} height={6} label="Hazırlanıyor" />

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {ITEMS.map((item, i) => {
            const isDone = i < ticked;
            const active = i === ticked;
            return (
              <View
                key={item}
                accessible
                accessibilityLabel={`${item}${isDone ? ', tamamlandı' : active ? ', sürüyor' : ''}`}
                style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <View style={styles.mark}>
                  {isDone ? (
                    <Animated.View entering={ZoomIn.duration(220)}>
                      <Icon name="checkmark-circle" size={24} color={colors.success} />
                    </Animated.View>
                  ) : active ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : (
                    <View style={[styles.dot, { borderColor: colors.border }]} />
                  )}
                </View>
                <Text variant="callout" weight={isDone || active ? '600' : '500'} color={isDone ? 'text' : active ? 'textSecondary' : 'textTertiary'} style={styles.flex}>
                  {item}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <StickyFooter style={styles.footer}>
        <Button title="Devam" trailingIcon="arrow-forward" onPress={onDone} disabled={!done} />
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingBottom: 24, gap: 24 },
  header: { gap: 10 },
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingHorizontal: 16, paddingVertical: 12 },
  mark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  footer: { borderTopWidth: 0 },
});
