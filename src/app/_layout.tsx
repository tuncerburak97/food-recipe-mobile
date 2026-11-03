import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, router, SplashScreen, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TimerAlarm } from '@/components/cook/timer-alarm';
import { GenerationWatcher, ToastHost } from '@/components/ui/toast-host';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { useTheme } from '@/hooks/use-theme';
import { queryClient } from '@/lib/queries';
import { AppearanceProvider } from '@/store/appearance';
import { takePendingShare } from '@/store/pending-share';
import { SessionProvider, useSession } from '@/store/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <ThemedRoot />
    </AppearanceProvider>
  );
}

function ThemedRoot() {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          background: colors.background,
          card: colors.surface,
          primary: colors.accent,
          text: colors.text,
        },
      }}>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <RootStack />
          <ToastHost />
          <TimerAlarm />
        </SessionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

function RootStack() {
  const { colors } = useTheme();
  const { status, retry } = useSession();
  const fontsReady = useAppFonts();
  const ready = status !== 'loading' && fontsReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // A link shared on first launch waits behind onboarding; open "Tarif ekle" with it once the user is in.
  const previous = useRef(status);
  useEffect(() => {
    const finishedOnboarding = previous.current === 'onboarding' && status === 'ready';
    previous.current = status;
    if (!finishedOnboarding) return;
    const link = takePendingShare();
    if (link) setTimeout(() => router.push(`/add?url=${encodeURIComponent(link)}&shared=1`), 300);
  }, [status]);

  if (!ready) return null;
  if (status === 'error') {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="cloud-offline-outline"
          tone="danger"
          title="Sunucuya ulaşılamadı"
          message="İlk açılışta internet bağlantısı gerekiyor. Bağlantını kontrol edip tekrar dene.">
          <Button title="Tekrar dene" icon="refresh" onPress={retry} />
        </EmptyState>
      </View>
    );
  }

  return (
    <>
      {status === 'ready' && <GenerationWatcher />}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Protected guard={status === 'ready'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="recipe/[id]" />
          <Stack.Screen name="creator/[username]" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="creators" />
          <Stack.Screen name="inbox" />
          <Stack.Screen name="tour" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="chef" options={{ gestureEnabled: false, contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="cook/[id]" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="create" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true, sheetCornerRadius: 28, contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="add" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="assistant/[id]" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="pantry" options={{ contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="shopping" options={{ contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="journal" options={{ contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="voice-recipe" options={{ presentation: 'modal', gestureEnabled: false, contentStyle: { backgroundColor: colors.surface } }} />
        </Stack.Protected>
        <Stack.Protected guard={status === 'onboarding'}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
});
