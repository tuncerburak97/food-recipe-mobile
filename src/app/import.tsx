import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { extractVideoLink, isYouTube, sourceName } from '@/lib/instagram';
import { registerPush } from '@/lib/push';
import { useImportRecipe } from '@/lib/queries';
import { takePendingShare } from '@/store/pending-share';

/** How long "Alındı" stays on screen before the app goes back to Instagram (ms). */
const BACK_AFTER_MS = 1200;

/** Back to the app the video was shared from. */
function backToSource(link: string | null) {
  Linking.openURL(isYouTube(link ?? undefined) ? 'youtube://' : 'instagram://app').catch(() => {});
}

/**
 * A video shared from Instagram or YouTube: the request is handed to the server at once, and the app
 * goes back there so the user keeps scrolling. The recipe is saved in the background and a
 * notification says when it is in the book (the inbox shows it too). Links that are not reels go
 * to the full "Tarif ekle" flow.
 */
export default function ImportScreen() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  const { colors } = useTheme();
  const importRecipe = useImportRecipe();
  const [phase, setPhase] = useState<'sending' | 'accepted' | 'failed'>('sending');
  const [pushOn, setPushOn] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const stay = useRef(false);
  const started = useRef(false);
  const link = url ? extractVideoLink(url) : null;
  const source = sourceName(link ?? undefined);

  const send = () => {
    if (!link) return;
    importRecipe.mutate(link, {
      onSuccess: async () => {
        setPhase('accepted');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // The first time this asks for notifications: the moment it is clearly worth it.
        const on = await registerPush(true);
        setPushOn(on);
        setTimeout(() => {
          if (stay.current) return;
          // Leaves the inbox behind, so coming back shows how it is going.
          router.replace('/inbox');
          backToSource(link);
        }, BACK_AFTER_MS);
      },
      onError: (e) => {
        setError(e);
        setPhase('failed');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    });
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    takePendingShare(); // handled here, so it does not open again after onboarding
    if (!link) {
      router.replace(url ? `/add?url=${encodeURIComponent(url)}&shared=1` : '/add');
      return;
    }
    send();
  });

  const wait = () => {
    stay.current = true;
    router.replace('/inbox');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {phase === 'sending' ? (
        <EmptyState icon={source === 'YouTube' ? 'logo-youtube' : 'logo-instagram'} tone="accent" title="Tarif alınıyor" message="Bir saniye…">
          <ActivityIndicator color={colors.accent} />
        </EmptyState>
      ) : phase === 'accepted' ? (
        <EmptyState
          icon="checkmark"
          tone="accent"
          title="Alındı, tarif defterine ekleniyor"
          message={
            pushOn
              ? `${source}’a dönebilirsin. Hazır olunca bildirim göndereceğiz.`
              : `${source}’a dönebilirsin. Hazır olunca Gelenler’de göreceksin.`
          }>
          <View style={styles.actions}>
            <Button
              title={`${source}’a dön`}
              icon={source === 'YouTube' ? 'logo-youtube' : 'logo-instagram'}
              onPress={() => {
                stay.current = true;
                router.replace('/inbox');
                backToSource(link);
              }}
            />
            <Button title="Burada bekle" variant="ghost" onPress={wait} />
          </View>
        </EmptyState>
      ) : (
        <EmptyState icon="alert" tone="danger" title={describeError(error).title} message={describeError(error).message}>
          <View style={styles.actions}>
            <Button
              title="Tekrar dene"
              icon="refresh"
              onPress={() => {
                setPhase('sending');
                send();
              }}
            />
            <Button title="Elle ekle" variant="ghost" onPress={() => router.replace(`/add?url=${encodeURIComponent(link ?? '')}&shared=1`)} />
          </View>
        </EmptyState>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24 },
  actions: { alignSelf: 'stretch', gap: 8, marginTop: 8 },
});
