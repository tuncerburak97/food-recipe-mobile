import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

// Builds made before expo-notifications was added do not have its native module; importing it there
// would crash. Without it, timers still work in the app (haptics + the on-screen alarm).
const available = Platform.OS !== 'web' && requireOptionalNativeModule('ExpoNotificationScheduler') != null;

type NotificationsModule = typeof import('expo-notifications');
let cached: NotificationsModule | null = null;

function notifications(): NotificationsModule | null {
  if (!available) return null;
  if (!cached) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  }
  return cached;
}

const CHANNEL = 'cooking-timers';
let prepared: Promise<boolean> | null = null;

/**
 * Asks for notification permission once and sets up how alarms behave: while the app is open the
 * sound plays but the system banner stays hidden (the app shows its own alarm card).
 */
export function prepareAlarms(): Promise<boolean> {
  const N = notifications();
  if (!N) return Promise.resolve(false);
  if (!prepared) {
    prepared = (async () => {
      N.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
      });
      if (Platform.OS === 'android') {
        await N.setNotificationChannelAsync(CHANNEL, {
          name: 'Pişirme zamanlayıcıları',
          importance: N.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 400, 200, 400],
        });
      }
      const current = await N.getPermissionsAsync();
      if (current.granted) return true;
      const asked = await N.requestPermissionsAsync();
      return asked.granted;
    })().catch(() => false);
  }
  return prepared;
}

/** Schedules the alarm notification for `endsAt` (ms timestamp). Returns its id, or null when unavailable. */
export async function scheduleAlarm(endsAt: number, title: string, body: string): Promise<string | null> {
  const N = notifications();
  if (!N || !(await prepareAlarms())) return null;
  try {
    return await N.scheduleNotificationAsync({
      content: { title, body, sound: 'default' },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: endsAt, channelId: CHANNEL },
    });
  } catch {
    return null;
  }
}

export async function cancelAlarm(id: string | undefined) {
  const N = notifications();
  if (!N || !id) return;
  try {
    await N.cancelScheduledNotificationAsync(id);
  } catch {
    // already fired or gone
  }
}
