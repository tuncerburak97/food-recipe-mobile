import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, TabBarHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGenerations } from '@/lib/queries';
import { hideToast, showToast, useToast } from '@/store/toast';

/** Shows the current toast above the tab bar. Mounted once in the root layout. */
export function ToastHost() {
  const toast = useToast();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(160)}
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: insets.bottom + TabBarHeight + 8 }]}>
      <View style={[styles.toast, { backgroundColor: colors.ink, boxShadow: '0 10px 30px rgba(0,0,0,0.22)' }]} accessibilityLiveRegion="polite">
        <View style={styles.flex}>
          <Text variant="headline" tint={colors.onInk} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.message ? (
            <Text variant="footnote" tint={colors.onInk} style={styles.muted} numberOfLines={2}>
              {toast.message}
            </Text>
          ) : null}
        </View>
        {toast.action ? (
          <Pressable
            onPress={() => {
              hideToast();
              toast.action?.onPress();
            }}
            hitSlop={8}
            accessibilityRole="button"
            style={[styles.action, { backgroundColor: colors.onInk }]}>
            <Text variant="subhead" weight="700" tint={colors.ink}>
              {toast.action.label}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={hideToast} hitSlop={10} accessibilityRole="button" accessibilityLabel="Kapat" style={styles.close}>
            <Icon name="close" size={18} color={colors.onInk} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Watches the background recipes: when one finishes, the lists refresh and a toast offers to open it.
 * Mounted once while the user is in the app.
 */
export function GenerationWatcher() {
  const client = useQueryClient();
  const jobs = useGenerations().data?.items;
  const known = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    if (!jobs) return;
    const before = known.current;
    known.current = new Map(jobs.map((j) => [j.id, j.status]));
    if (!before) return; // first load: nothing "just" finished
    for (const job of jobs) {
      if (before.get(job.id) !== 'pending' || job.status === 'pending') continue;
      if (job.status === 'done' && job.entry_id) {
        client.invalidateQueries({ queryKey: ['recipes'] });
        client.invalidateQueries({ queryKey: ['me'] });
        const id = job.entry_id;
        showToast({ title: 'Tarifin hazır', message: job.title ?? undefined, action: { label: 'Aç', onPress: () => router.push(`/recipe/${id}`) } }, 8000);
      } else if (job.status === 'failed') {
        showToast({ title: 'Tarif hazırlanamadı', message: job.error?.message, action: { label: 'Gör', onPress: () => router.push('/inbox') } }, 8000);
      }
    }
  }, [jobs, client]);

  return null;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 12, paddingLeft: 18, paddingRight: 10, borderRadius: Radius.lg },
  flex: { flex: 1, gap: 2 },
  muted: { opacity: 0.72 },
  action: { minHeight: 38, paddingHorizontal: 16, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
