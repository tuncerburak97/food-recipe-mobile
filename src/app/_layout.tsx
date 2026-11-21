import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, router, SplashScreen, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { AccountEffects } from '@/components/account/account-effects';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { TimerAlarm } from '@/components/cook/timer-alarm';
import { GenerationWatcher, ToastHost } from '@/components/ui/toast-host';
import { useAppFonts } from '@/hooks/use-app-fonts';
import { useTheme } from '@/hooks/use-theme';
import { openPaywall, useAppConfig } from '@/lib/access';
import { identifyUser, useScreenTracking } from '@/lib/analytics';
import { usePushNotifications } from '@/lib/push';
import { queryClient, useMe } from '@/lib/queries';
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
  usePushNotifications(ready && status === 'ready');
  useScreenTracking(ready);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // A link shared on first launch waits behind onboarding; open it once the user is in: a recipe
  // someone sent ("shared:<token>"), or a video to add. Otherwise the paywall may greet the new
  // user once, when the server says so (off by default: people try the app first).
  const { billing } = useAppConfig();
  const greetWithPaywall = billing.enabled && billing.nudges.paywall_after_onboarding;
  const previous = useRef(status);
  useEffect(() => {
    const finishedOnboarding = previous.current === 'onboarding' && status === 'ready';
    previous.current = status;
    if (!finishedOnboarding) return;
    const link = takePendingShare();
    if (link?.startsWith('shared:')) setTimeout(() => router.push(`/shared/${link.slice('shared:'.length)}`), 300);
    else if (link) setTimeout(() => router.push(`/import?url=${encodeURIComponent(link)}`), 300);
    else if (greetWithPaywall) setTimeout(() => openPaywall('onboarding'), 900);
  }, [status, greetWithPaywall]);

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
      {status === 'ready' && <AccountEffects />}
      <AnalyticsIdentity />
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
          <Stack.Screen name="import" options={{ presentation: 'modal', gestureEnabled: false }} />
          <Stack.Screen name="add" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="assistant/[id]" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="pantry" options={{ contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="shopping" options={{ contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="journal" options={{ contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="agent" options={{ contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="voice-recipe" options={{ presentation: 'modal', gestureEnabled: false, contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="account" options={{ contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="shared/[token]" options={{ presentation: 'modal', contentStyle: { backgroundColor: colors.surface } }} />
          <Stack.Screen name="sign-in" options={{ presentation: 'formSheet', sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true, sheetCornerRadius: 28, contentStyle: { backgroundColor: colors.surface } }} />
        </Stack.Protected>
        <Stack.Protected guard={status === 'onboarding'}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        </Stack.Protected>

      </Stack>
    </>
  );
}

/** Links analytics to the backend user once the account is known. */
function AnalyticsIdentity() {
  const { data: me } = useMe();
  useEffect(() => {
    if (me) identifyUser(me);
  }, [me]);
  return null;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
});
