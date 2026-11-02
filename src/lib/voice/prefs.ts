import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** One small saved value, the same way `token-storage.ts` keeps its values. */
function saved(key: string) {
  return {
    async get(): Promise<string | null> {
      try {
        if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
        return await SecureStore.getItemAsync(key);
      } catch {
        return null;
      }
    },
    async set(value: string) {
      try {
        if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
        else await SecureStore.setItemAsync(key, value);
      } catch {
        // Not saved: the toggle simply starts off next time.
      }
    },
  };
}

/** "1" while hands-free voice is on in cook mode, "0" after the user turned it off. */
export const voiceOnStorage = saved('cook.voice.v1');
/** "1" once the user has seen what voice can do. */
export const voiceIntroStorage = saved('cook.voice.intro.v1');
