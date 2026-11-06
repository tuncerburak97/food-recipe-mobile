import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { notifications, prepareAlarms } from '@/lib/alarm';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queries';

// Push notifications: the server says "Tarif defterine eklendi" when a background job (a reel shared
// from Instagram, an AI recipe) finishes while the app is closed. In the app the same news shows as
// a toast (GenerationWatcher), so the system banner stays hidden there (see prepareAlarms).

const projectId: string | undefined = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
let sent: string | null = null;

/**
 * Sends this device's push token to the server. ask=false only registers when permission was
 * already given (app start); ask=true asks first (right after the user hands off a reel, when the
 * notification is clearly useful). Returns whether notifications can reach this device.
 */
export async function registerPush(ask: boolean): Promise<boolean> {
  const N = notifications();
  if (!N || Platform.OS === 'web') return false;
  try {
    const current = await N.getPermissionsAsync();
    if (!current.granted && !(ask && (await prepareAlarms()))) return false;
    const { data: token } = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (token && token !== sent) {
      await api.savePushToken(token, Platform.OS);
      sent = token;
    }
    return true;
  } catch {
    // A simulator, no network, no push setup in this build: the inbox and toasts still work.
    return false;
  }
}

type JobData = { type?: string; entry_id?: number | string };

function openFromNotification(data: JobData | undefined) {
  if (data?.type !== 'job') return;
  queryClient.invalidateQueries({ queryKey: ['generations'] });
  queryClient.invalidateQueries({ queryKey: ['recipes'] });
  if (data.entry_id) router.push(`/recipe/${data.entry_id}`);
  else router.push('/inbox');
}

/** Registers for push once the user is in, and opens the recipe when a notification is tapped. */
export function usePushNotifications(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    registerPush(false);
    const N = notifications();
    if (!N) return;
    // Opened by tapping a notification while the app was closed.
    N.getLastNotificationResponseAsync()
      .then((r) => {
        if (!r) return;
        openFromNotification(r.notification.request.content.data as JobData);
        N.clearLastNotificationResponseAsync?.();
      })
      .catch(() => {});
    const sub = N.addNotificationResponseReceivedListener((r) => openFromNotification(r.notification.request.content.data as JobData));
    // A job finished while the app is open: the toast tells it, the inbox refreshes.
    const recv = N.addNotificationReceivedListener((n) => {
      if ((n.request.content.data as JobData)?.type === 'job') queryClient.invalidateQueries({ queryKey: ['generations'] });
    });
    return () => {
      sub.remove();
      recv.remove();
    };
  }, [ready]);
}
