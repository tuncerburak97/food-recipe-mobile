import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';
import { acknowledgeTimer, extendTimer, useTimers } from '@/store/timers';

const BUZZ_EVERY_MS = 1800;
const MAX_BUZZES = 20;

/**
 * The alarm when a cooking timer ends: a card on a dark scrim over whatever screen is open, buzzing
 * until the user dismisses it ("Tamam") or adds a minute. Mounted once in the root layout.
 */
export function TimerAlarm() {
  const { colors } = useTheme();
  const ringing = useTimers().find((t) => t.status === 'done' && !t.acknowledged);

  useEffect(() => {
    if (!ringing) return;
    let count = 0;
    const id = setInterval(() => {
      count += 1;
      if (count > MAX_BUZZES) return clearInterval(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }, BUZZ_EVERY_MS);
    return () => clearInterval(id);
  }, [ringing]);

  if (!ringing) return null;
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(160)} style={styles.backdrop} accessibilityViewIsModal>
      <Animated.View
        entering={ZoomIn.duration(220)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive">
        <View style={[styles.well, { backgroundColor: colors.surfaceMuted }]}>
          <Icon name="alarm-outline" size={30} color={colors.text} />
        </View>
        <View style={styles.texts}>
          <Text variant="overline" color="accentText" align="center">
            {upperTr('Süre doldu')}
          </Text>
          <Text variant="title" align="center" numberOfLines={3}>
            {ringing.label}
          </Text>
          <Text variant="callout" color="textSecondary" align="center" numberOfLines={1}>
            {ringing.recipeTitle}
          </Text>
        </View>
        <View style={styles.buttons}>
          <Button title="+1 dk" variant="outline" onPress={() => extendTimer(ringing.id, 1)} accessibilityHint="Bir dakika daha sayar" style={styles.extend} />
          <Button title="Tamam" onPress={() => acknowledgeTimer(ringing.id)} accessibilityHint="Alarmı kapatır" style={styles.flex} />
        </View>
        <Button
          title="Tarife git"
          variant="ghost"
          size="md"
          trailingIcon="chevron-forward"
          onPress={() => {
            acknowledgeTimer(ringing.id);
            router.push(`/cook/${ringing.entryId}`);
          }}
          accessibilityHint="Alarmı kapatır ve pişirme ekranını açar"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(14,12,10,0.62)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 18,
    paddingTop: 28,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    boxShadow: '0 20px 50px rgba(0,0,0,0.28)',
  },
  well: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  texts: { alignSelf: 'stretch', alignItems: 'center', gap: 6 },
  buttons: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 4 },
  extend: { minWidth: 96 },
  flex: { flex: 1 },
});
