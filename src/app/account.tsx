import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignInButtons } from '@/components/account/sign-in-buttons';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { accessApi, isLimited, openPaywall, usePremium, type LimitKey, type Subscription } from '@/lib/access';
import { track } from '@/lib/analytics';
import { describeError } from '@/lib/api';
import { ensurePurchases, manageSubscriptionUrl, purchasesBlocked, restore } from '@/lib/purchases';
import { useMe } from '@/lib/queries';
import { useSession } from '@/store/session';
import { showToast } from '@/store/toast';

const PROVIDER_NAMES: Record<string, string> = { apple: 'Apple', google: 'Google' };
const PLAN_NAMES: Record<string, string> = { monthly: 'Aylık', yearly: 'Yıllık', lifetime: 'Ömür boyu', gift: 'Hediye' };
/** Today's allowances shown to free users, in this order. */
const METERS: { key: LimitKey; label: string }[] = [
  { key: 'recipe_view', label: 'Tarif açma' },
  { key: 'import', label: 'Videodan tarif' },
  { key: 'ai_recipe', label: 'AI Şef tarifi' },
  { key: 'ai_chat', label: 'AI Şefe soru' },
];

const day = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/** One line about the subscription: when it renews, ends, or that the trial is running. */
function subscriptionLine(sub: Subscription): string {
  if (!sub.expires_at) return 'Süresiz';
  if (sub.status === 'grace') return 'Ödeme alınamadı. Mağaza tekrar deniyor.';
  if (sub.period_type === 'trial') return sub.will_renew ? `Ücretsiz deneme ${day(sub.expires_at)} tarihinde biter` : `Deneme ${day(sub.expires_at)} tarihinde sona erer`;
  return sub.will_renew ? `${day(sub.expires_at)} tarihinde yenilenir` : `${day(sub.expires_at)} tarihinde sona erer`;
}

/**
 * Profil → "Hesap ve üyelik": who is signed in (or the sign-in buttons for a guest), the plan and
 * today's allowances, and leaving or deleting the account.
 */
export default function AccountScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const client = useQueryClient();
  const me = useMe().data;
  const { config, access, on, premium } = usePremium();
  const { signOut, deleteAccount } = useSession();
  const [busy, setBusy] = useState<'restore' | 'out' | 'delete' | null>(null);

  if (!me) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.surface }]}>
        <ScreenHeader title="Hesap ve üyelik" tone="muted" />
        <LoadingState label="Hesabın yükleniyor" />
      </View>
    );
  }

  const sub = access?.subscription ?? null;
  const fromStore = premium && sub != null && sub.store !== 'admin' && sub.store !== 'promotional';
  const signedWith = (me.providers ?? []).map((p) => PROVIDER_NAMES[p] ?? p).join(' ve ');

  const restorePurchases = async () => {
    if (busy) return;
    if (purchasesBlocked(config) || !access || !(await ensurePurchases(config, access.billing_id))) {
      Alert.alert('Şu an geri yüklenemiyor', 'Satın alma bu sürümde henüz açık değil.');
      return;
    }
    setBusy('restore');
    try {
      const found = await restore(config);
      const next = await accessApi.sync().catch(() => null);
      if (next) client.setQueryData(['access'], next);
      client.invalidateQueries({ queryKey: ['me'] });
      track('purchases_restored', { found });
      if (found) showToast({ title: 'Premium geri yüklendi' });
      else Alert.alert('Aktif abonelik bulunamadı', 'Bu mağaza hesabıyla alınmış geçerli bir abonelik görünmüyor.');
    } catch {
      Alert.alert('Geri yüklenemedi', 'Birazdan tekrar dener misin?');
    } finally {
      setBusy(null);
    }
  };

  const leave = () =>
    Alert.alert('Çıkış yap', 'Tariflerin hesabında durur; tekrar giriş yaptığında geri gelir. Bu telefon yeni bir misafir hesapla devam eder.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Çıkış yap',
        style: 'destructive',
        onPress: async () => {
          setBusy('out');
          await signOut();
        },
      },
    ]);

  const remove = () =>
    Alert.alert(
      'Hesabımı sil',
      `Kayıtlı tariflerin, dolabın, listelerin, pişirme günlüğün ve sesli tariflerin kalıcı olarak silinir. Bu işlem geri alınamaz.${
        fromStore ? '\n\nAboneliğin kendiliğinden bitmez: ücret alınmaması için mağaza hesabından ayrıca iptal etmelisin.' : ''
      }`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Hesabı sil',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Emin misin?', 'Hesabın ve içindeki her şey şimdi silinecek.', [
              { text: 'Vazgeç', style: 'cancel' },
              {
                text: 'Evet, sil',
                style: 'destructive',
                onPress: async () => {
                  setBusy('delete');
                  try {
                    await deleteAccount();
                  } catch (e) {
                    setBusy(null);
                    Alert.alert(describeError(e).title, describeError(e).message);
                  }
                },
              },
            ]),
        },
      ],
    );

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ScreenHeader title="Hesap ve üyelik" tone="muted" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {me.guest ? (
          <Card tone="warm">
            <View style={styles.cardHead}>
              <Text variant="title2" accessibilityRole="header">
                {config.billing.account.title}
              </Text>
              <Text variant="callout" color="textSecondary">
                {config.billing.account.subtitle}
              </Text>
            </View>
            {config.billing.account.reasons.map((r) => (
              <View key={r} style={styles.reason}>
                <Icon name="checkmark-circle" size={18} color={colors.success} />
                <Text variant="callout" style={styles.flex}>
                  {r}
                </Text>
              </View>
            ))}
            <SignInButtons />
          </Card>
        ) : (
          <View style={styles.identity}>
            <Avatar name={me.name || me.email || 'Üye'} uri={me.avatarUrl} size={60} />
            <View style={styles.flex}>
              <View style={styles.nameRow}>
                <Text variant="title2" numberOfLines={1} style={styles.shrink}>
                  {me.name || 'Üye'}
                </Text>
                {premium ? <Tag label="Premium" tone="accent" /> : null}
              </View>
              {me.email ? (
                <Text variant="subhead" color="textSecondary" numberOfLines={1}>
                  {me.email}
                </Text>
              ) : null}
              {signedWith ? (
                <Text variant="footnote" color="textTertiary">
                  {signedWith} ile giriş yapıldı
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {on || premium ? (
          <ListGroup title="Üyelik">
            {premium && sub ? (
              <ListRow
                first
                icon="sparkles-outline"
                title={`Premium${PLAN_NAMES[sub.plan] ? ` · ${PLAN_NAMES[sub.plan]}` : ''}`}
                subtitle={subscriptionLine(sub)}
                onPress={fromStore ? () => Linking.openURL(manageSubscriptionUrl()) : undefined}
                value={fromStore ? 'Yönet' : undefined}
              />
            ) : (
              <>
                <ListRow
                  first
                  icon="sparkles-outline"
                  title="Premium’a geç"
                  subtitle={config.billing.paywall.subtitle || 'Sınırsız tarif ve video'}
                  onPress={() => openPaywall('settings')}
                />
                <ListRow icon="refresh-outline" title="Satın alımları geri yükle" subtitle="Daha önce aldıysan buradan geri getir" onPress={restorePurchases} busy={busy === 'restore'} />
              </>
            )}
          </ListGroup>
        ) : null}

        {on && !premium && access ? (
          <ListGroup
            title="Bugünkü hakların"
            footer={
              me.guest && access.sign_in_limits?.recipe_view != null && access.sign_in_limits.recipe_view !== access.usage.recipe_view?.limit
                ? `Her gece yenilenir. Giriş yapınca günde ${access.sign_in_limits.recipe_view < 0 ? 'sınırsız' : access.sign_in_limits.recipe_view} tarif açabilirsin.`
                : 'Her gece yenilenir. Kendi defterindeki tarifler her zaman açıktır.'
            }>
            {METERS.filter((m) => access.usage[m.key] != null && isLimited(access.usage[m.key]!)).map((m, i) => {
              const u = access.usage[m.key]!;
              const total = u.total_limit ?? -1;
              // A total is what is left for good; it is said under today's count, or alone without one.
              const left = total >= 0 ? `Toplam ${Math.max(0, total - (u.total_used ?? 0))} / ${total} hak kaldı` : undefined;
              return <ListRow key={m.key} first={i === 0} title={m.label} subtitle={u.limit >= 0 ? left : undefined} value={u.limit >= 0 ? `${u.remaining} / ${u.limit} kaldı` : left} />;
            })}
          </ListGroup>
        ) : null}

        {!me.guest ? (
          <ListGroup title="Hesap">
            <ListRow first icon="log-out-outline" title="Çıkış yap" subtitle="Tariflerin hesabında durur" onPress={leave} busy={busy === 'out'} />
            <ListRow icon="trash-outline" title="Hesabımı sil" subtitle="Hesap ve içindeki her şey kalıcı olarak silinir" danger onPress={remove} busy={busy === 'delete'} accessibilityHint="Önce onay ister" />
          </ListGroup>
        ) : null}

        {config.billing.legal.privacy_url ? (
          <Text variant="footnote" color="accentText" align="center" accessibilityRole="link" onPress={() => Linking.openURL(config.billing.legal.privacy_url)}>
            Gizlilik
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, gap: 2 },
  shrink: { flexShrink: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: 8, gap: 28 },
  cardHead: { gap: 6 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
