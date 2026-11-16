import { router, useLocalSearchParams } from 'expo-router';

import { SignInPanel } from '@/components/account/sign-in-panel';

/** The sign-in sheet as a route: opened from Profile, the paywall, sharing and the save prompt. */
export default function SignInScreen() {
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  return <SignInPanel reason={reason} onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
