import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** One value in the Keychain/Keystore on devices, localStorage on web (development only). */
function secureValue(key: string) {
  return {
    async get(): Promise<string | null> {
      if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
      return SecureStore.getItemAsync(key);
    },
    async set(value: string) {
      if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, value);
      else await SecureStore.setItemAsync(key, value);
    },
    async clear() {
      if (Platform.OS === 'web') globalThis.localStorage?.removeItem(key);
      else await SecureStore.deleteItemAsync(key);
    },
  };
}

/** The user's bearer token. */
export const tokenStorage = secureValue('auth.token.v1');
/** This install's UUID, minted by the server on first launch (POST /api/v1/devices). */
export const deviceIdStorage = secureValue('device.id.v1');
/** "1" once onboarding is finished, so the app opens straight to Home without waiting for the network. */
export const onboardedStorage = secureValue('onboarded.v1');
/** Appearance choice: "light" (default), "dark" or "system". */
export const appearanceStorage = secureValue('appearance.v1');
/** "1" once the user has seen the app tour (shown once after onboarding). */
export const tourStorage = secureValue('tour.v1');
/** "1" once the Instagram share guide was shown from Home ("Videodan tarife"). */
export const shareGuideHomeStorage = secureValue('share-guide.home.v1');
/** "1" once the Instagram share guide was shown after the first link shared into the app. */
export const shareGuideSharedStorage = secureValue('share-guide.shared.v1');
