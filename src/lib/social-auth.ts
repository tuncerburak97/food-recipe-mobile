import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { Platform, TurboModuleRegistry } from 'react-native';

import type { AppConfig } from '@/lib/access';

// Sign in with Apple and Google. Both need native code that exists only in builds made after they
// were added, so each is offered only when its module is in this build (and, for Google, when the
// server has its client ids). The app never sees a password: the provider hands over a signed
// token, which the server verifies (POST /api/v1/auth/apple | google).

export type Provider = 'apple' | 'google';

/** What a sign-in hands to the server. */
export interface ProviderToken {
  provider: Provider;
  identityToken: string;
  /** Apple gives the name to the app on the first sign-in only. */
  name?: string;
}

/** Thrown with a message for the user when a sign-in fails (not when the user cancels). */
export class SignInError extends Error {}

const appleInBuild = Platform.OS === 'ios' && requireOptionalNativeModule('ExpoAppleAuthentication') != null;
const googleInBuild = Platform.OS !== 'web' && TurboModuleRegistry.get('RNGoogleSignin') != null;

/** Whether to show "Apple ile giriş yap": iOS, in this build, and on the server. */
export function appleAvailable(config: AppConfig): boolean {
  return appleInBuild && config.auth.apple;
}

/**
 * Whether to show "Google ile devam et". On iOS the app must have been built with the same iOS
 * client id the server has (its URL scheme is baked into the build); a mismatch would crash the
 * Google SDK, so the button is hidden instead.
 */
export function googleAvailable(config: AppConfig): boolean {
  const g = config.auth.google;
  if (!googleInBuild || !g?.web_client_id) return false;
  if (Platform.OS !== 'ios') return true;
  const built = String((Constants.expoConfig?.extra as { googleIosClientId?: string } | undefined)?.googleIosClientId ?? '').trim();
  return built !== '' && built === g.ios_client_id;
}

/** Sign in with Apple. Returns null when the user closed the sheet. */
export async function signInWithApple(): Promise<ProviderToken | null> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Apple = require('expo-apple-authentication') as typeof import('expo-apple-authentication');
  try {
    const cred = await Apple.signInAsync({
      requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
    });
    if (!cred.identityToken) throw new SignInError('Apple girişten bilgi gelmedi. Tekrar dener misin?');
    const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ').trim();
    return { provider: 'apple', identityToken: cred.identityToken, name: name || undefined };
  } catch (e) {
    if (e instanceof SignInError) throw e;
    const code = (e as { code?: string }).code;
    if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') return null;
    throw new SignInError('Apple ile giriş yapılamadı. Tekrar dener misin?');
  }
}

/** Google Sign-In. Returns null when the user closed the sheet. */
export async function signInWithGoogle(config: AppConfig): Promise<ProviderToken | null> {
  const g = config.auth.google;
  if (!g) throw new SignInError('Google ile giriş şu an kapalı.');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
  try {
    // The token is made for the web client id: that is the audience the server checks.
    GoogleSignin.configure({ webClientId: g.web_client_id, iosClientId: g.ios_client_id || undefined });
    if (Platform.OS === 'android') await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (!isSuccessResponse(res)) return null;
    const token = res.data.idToken;
    if (!token) throw new SignInError('Google girişten bilgi gelmedi. Tekrar dener misin?');
    return { provider: 'google', identityToken: token, name: res.data.user.name ?? undefined };
  } catch (e) {
    if (e instanceof SignInError) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new SignInError('Bu cihazda Google Play hizmetleri güncel değil.');
    }
    throw new SignInError('Google ile giriş yapılamadı. Tekrar dener misin?');
  }
}

/** Forgets the Google account on this device (sign out), so the next sign-in asks which one. */
export async function forgetGoogle(): Promise<void> {
  if (!googleInBuild) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch {
    // Nothing to forget.
  }
}
