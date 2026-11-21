import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppConfig } from '@/lib/access';
import { describeError } from '@/lib/api';
import { appleAvailable, googleAvailable, signInWithApple, signInWithGoogle, SignInError, type Provider } from '@/lib/social-auth';
import { useSession, type SignInResult } from '@/store/session';
import { showToast } from '@/store/toast';

/**
 * "Apple ile giriş yap" and "Google ile devam et". Each is shown only when this build and the
 * server support it. On success the guest account of this device becomes a member (or the device
 * joins the account that identity already has) and onDone is called.
 */
export function SignInButtons({ onDone }: { onDone?: (res: SignInResult) => void }) {
  const { colors } = useTheme();
  const config = useAppConfig();
  const { signIn } = useSession();
  const [busy, setBusy] = useState<Provider | null>(null);
  const apple = appleAvailable(config);
  const google = googleAvailable(config);

  const run = async (provider: Provider) => {
    if (busy) return;
    setBusy(provider);
    try {
      const token = provider === 'apple' ? await signInWithApple() : await signInWithGoogle(config);
      if (!token) return; // the user closed the sheet
      const res = await signIn(token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast({
        title: res.user.name ? `Hoş geldin ${res.user.name.split(' ')[0]}` : 'Giriş yapıldı',
        message: res.merged ? 'Bu telefondaki tariflerin hesabına taşındı.' : 'Defterin artık hesabında, kaybolmaz.',
      });
      onDone?.(res);
    } catch (e) {
      if (e instanceof SignInError) Alert.alert('Giriş yapılamadı', e.message);
      else Alert.alert(describeError(e).title, describeError(e).message);
    } finally {
      setBusy(null);
    }
  };

  if (!apple && !google) {
    return (
      <View style={[styles.note, { backgroundColor: colors.surfaceMuted }]}>
        <Icon name="information-circle-outline" size={18} color={colors.textSecondary} />
        <Text variant="subhead" color="textSecondary" style={styles.flex}>
          Giriş bu sürümde henüz açık değil. Uygulamayı güncelledikten sonra tekrar dene.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {apple ? (
        <Button title="Apple ile giriş yap" icon="logo-apple" variant="dark" loading={busy === 'apple'} disabled={busy === 'google'} onPress={() => run('apple')} />
      ) : null}
      {google ? (
        <Button title="Google ile devam et" icon="logo-google" variant="outline" loading={busy === 'google'} disabled={busy === 'apple'} onPress={() => run('google')} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  flex: { flex: 1 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: Radius.md },
});
