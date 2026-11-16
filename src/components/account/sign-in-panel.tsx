import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignInButtons } from '@/components/account/sign-in-buttons';
import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppConfig } from '@/lib/access';

/** Headlines by why the sheet opened; without a reason the server's texts are used. */
const REASONS: Record<string, { title: string; subtitle: string }> = {
  share: { title: 'Paylaşmak için giriş yap', subtitle: 'Tarifini tek linkle gönder; açan kişi kendi defterine ekleyebilsin.' },
  limit: { title: 'Giriş yap, daha fazlasını aç', subtitle: 'Üyeler her gün daha fazla tarif açar ve daha fazla video ekler. Ücretsiz.' },
  save: { title: 'Tariflerin kaybolmasın', subtitle: 'Giriş yap; telefonun değişse de defterin seninle gelsin.' },
  purchase: { title: 'Premium her cihazında açılsın', subtitle: 'Giriş yap; aboneliğin hesabına bağlansın ve tüm cihazlarında geçerli olsun.' },
  returning: { title: 'Tekrar hoş geldin', subtitle: 'Giriş yap; defterin, dolabın ve tercihlerin olduğu gibi gelsin.' },
};

/**
 * The sign-in sheet's content: why it is worth it, then Apple and Google. Shown as the /sign-in
 * route inside the app and as a modal on onboarding's first screen ("Zaten hesabın var mı?").
 */
export function SignInPanel({ reason, onClose }: { reason?: string; onClose: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { billing } = useAppConfig();
  const head = (reason && REASONS[reason]) || { title: billing.account.title, subtitle: billing.account.subtitle };

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ScreenHeader leading="close" tone="muted" title={head.title} subtitle={head.subtitle} safeTop={false} onBack={onClose} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} showsVerticalScrollIndicator={false}>
        {billing.account.reasons.length > 0 ? (
          <View style={styles.reasons}>
            {billing.account.reasons.map((r) => (
              <View key={r} style={styles.reason}>
                <Icon name="checkmark-circle" size={20} color={colors.success} />
                <Text variant="body" style={styles.flex}>
                  {r}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <SignInButtons onDone={onClose} />

        <Text variant="footnote" color="textTertiary" align="center">
          Bu telefondaki tariflerin, dolabın ve listelerin hesabına taşınır. Şifre istemeyiz.
          {billing.legal.privacy_url ? ' ' : ''}
          {billing.legal.privacy_url ? (
            <Text variant="footnote" color="accentText" onPress={() => Linking.openURL(billing.legal.privacy_url)} accessibilityRole="link">
              Gizlilik
            </Text>
          ) : null}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: 8, gap: 24 },
  reasons: { gap: 14 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
