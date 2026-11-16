import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { accessApi, openSignIn, usePremium, type Access, type Placement } from '@/lib/access';
import { track } from '@/lib/analytics';
import { upperTr } from '@/lib/format';
import { buy, ensurePurchases, loadStorePlans, purchasesBlocked, restore, type StorePlan } from '@/lib/purchases';
import { useMe } from '@/lib/queries';
import { showToast } from '@/store/toast';

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));

/** After a purchase the server may need a moment to hear from the store: ask a few times. */
async function syncUntilPremium(): Promise<Access | null> {
  let last: Access | null = null;
  for (const wait of [0, 1200, 2500, 4000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      last = await accessApi.sync();
      if (last.premium) return last;
    } catch {
      // Try again; the purchase itself is safe at the store.
    }
  }
  return last;
}

/**
 * The paywall. Its headline says why it opened (a daily limit, or where it was opened from), then
 * what Premium adds, the plans with the store's prices, and one button. All wording, the plans and
 * their order come from the server; prices and the free trial come from the store.
 */
export default function PaywallScreen() {
  const params = useLocalSearchParams<{ placement?: string; signInLimit?: string; limit?: string }>();
  const placement = (params.placement ?? 'settings') as Placement;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const client = useQueryClient();
  const { config, access, premium } = usePremium();
  const me = useMe().data;
  const { billing } = config;
  const texts = billing.paywall;
  const head = texts.placements[placement] ?? { title: texts.title, subtitle: texts.subtitle };
  const blocked = purchasesBlocked(config);
  const billingId = access?.billing_id ?? '';

  const plans = useQuery({
    queryKey: ['store-plans', billing.offering, billingId],
    queryFn: async () => {
      if (!(await ensurePurchases(config, billingId))) throw new Error('unavailable');
      return loadStorePlans(config);
    },
    enabled: !blocked && !!billingId,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);
  const list = plans.data ?? [];
  const selected = list.find((p) => p.plan.id === chosen) ?? list.find((p) => p.plan.highlight) ?? list[0];

  useEffect(() => {
    track('paywall_viewed', { placement });
  }, [placement]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const unlocked = (acc: Access | null) => {
    if (acc) client.setQueryData(['access'], acc);
    client.invalidateQueries({ queryKey: ['access'] });
    client.invalidateQueries({ queryKey: ['me'] });
    client.invalidateQueries({ queryKey: ['recipe'] });
  };

  const purchase = async () => {
    if (!selected || busy) return;
    setBusy('buy');
    track('purchase_started', { plan: selected.plan.id, placement });
    try {
      const outcome = await buy(selected, config);
      if (outcome === 'cancelled') {
        track('purchase_cancelled', { plan: selected.plan.id });
        return;
      }
      const acc = await syncUntilPremium();
      unlocked(acc);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      track('purchase_completed', { plan: selected.plan.id, placement, trial: selected.trialDays > 0 });
      if (outcome === 'pending') {
        showToast({ title: 'Satın alman onay bekliyor', message: 'Onaylandığında Premium kendiliğinden açılır.' });
      } else {
        showToast({ title: 'Premium açıldı', message: 'Artık sınır yok. Afiyet olsun.' });
      }
      close();
      // A guest who paid: offer to tie the subscription to an account, so it survives a new phone.
      if (me?.guest) setTimeout(() => openSignIn('purchase'), 600);
    } catch (e) {
      track('purchase_failed', { plan: selected.plan.id });
      Alert.alert('Satın alma tamamlanamadı', e instanceof Error ? e.message : 'Tekrar dener misin?');
    } finally {
      setBusy(null);
    }
  };

  const restorePurchases = async () => {
    if (busy) return;
    if (blocked || !(await ensurePurchases(config, billingId))) {
      Alert.alert('Şu an geri yüklenemiyor', 'Satın alma bu sürümde henüz açık değil.');
      return;
    }
    setBusy('restore');
    try {
      const found = await restore(config);
      const acc = found ? await syncUntilPremium() : null;
      unlocked(acc);
      track('purchases_restored', { found });
      if (found) {
        showToast({ title: 'Premium geri yüklendi' });
        close();
      } else {
        Alert.alert('Aktif abonelik bulunamadı', 'Bu mağaza hesabıyla alınmış geçerli bir abonelik görünmüyor.');
      }
    } catch {
      Alert.alert('Geri yüklenemedi', 'Birazdan tekrar dener misin?');
    } finally {
      setBusy(null);
    }
  };

  const trialDays = selected?.trialDays ?? 0;
  const cta = trialDays > 0 ? fill(texts.cta_trial, { days: trialDays }) : texts.cta;
  const signInLimit = Number(params.signInLimit ?? 0);
  // A guest at a limit can get more for free by signing in: say so before asking for money.
  const offerSignIn = !premium && !!me?.guest && signInLimit !== 0 && (signInLimit < 0 || signInLimit > Number(params.limit ?? 0));

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={styles.top}>
        <IconButton icon="close" label="Kapat" tone="muted" onPress={close} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text variant="overline" color="accentText">
            {upperTr('Premium')}
          </Text>
          <Text variant="display" accessibilityRole="header">
            {premium ? 'Premium üyesin' : head.title}
          </Text>
          <Text variant="body" color="textSecondary">
            {premium ? 'Tüm tarifler, videolar ve AI Şef sınırsız açık. Afiyet olsun.' : head.subtitle}
          </Text>
        </View>

        {offerSignIn ? (
          <Pressable
            onPress={() => openSignIn('limit')}
            accessibilityRole="button"
            accessibilityLabel="Giriş yap, ücretsiz daha fazlasını aç"
            style={({ pressed }) => [styles.signIn, { backgroundColor: colors.peachSoft, borderColor: colors.peach }, pressed && { opacity: 0.8 }]}>
            <View style={[styles.well, { backgroundColor: colors.surface }]}>
              <Icon name="person-outline" size={18} color={colors.text} />
            </View>
            <View style={styles.flex}>
              <Text variant="headline">Önce ücretsiz dene: giriş yap</Text>
              <Text variant="subhead" color="textSecondary">
                {signInLimit < 0 ? 'Üyelere bu özellik sınırsız.' : `Üyeler günde ${signInLimit} hak kullanır. Kart gerekmez.`}
              </Text>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}

        <View style={styles.benefits}>
          {texts.benefits.map((b) => (
            <View key={b.title} style={styles.benefit} accessible accessibilityLabel={`${b.title}. ${b.text}`}>
              <View style={[styles.well, { backgroundColor: colors.surfaceMuted }]}>
                <Icon name={b.icon as IconName} size={19} color={colors.text} />
              </View>
              <View style={styles.flex}>
                <Text variant="headline">{b.title}</Text>
                <Text variant="subhead" color="textSecondary">
                  {b.text}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {premium ? null : blocked ? (
          <Notice
            icon="construct-outline"
            text={
              blocked === 'build'
                ? 'Satın alma bu sürümde henüz açık değil. Uygulamayı güncellediğinde planlar burada görünür.'
                : 'Planlar çok yakında burada olacak.'
            }
          />
        ) : plans.isPending ? (
          <SkeletonPulse style={styles.plans}>
            <SkeletonBlock height={84} radius={Radius.lg} />
            <SkeletonBlock height={84} radius={Radius.lg} />
          </SkeletonPulse>
        ) : list.length === 0 ? (
          <View style={styles.plans}>
            <Notice icon="cloud-offline-outline" text="Planlar şu an yüklenemedi. İnternet bağlantını kontrol edip tekrar dener misin?" />
            <Button title="Tekrar dene" icon="refresh" variant="secondary" loading={plans.isFetching} onPress={() => plans.refetch()} />
          </View>
        ) : (
          <View style={styles.plans} accessibilityRole="radiogroup">
            {list.map((p) => (
              <PlanCard key={p.plan.id} plan={p} selected={p.plan.id === selected?.plan.id} onPress={() => setChosen(p.plan.id)} />
            ))}
          </View>
        )}

        {!premium && selected && trialDays > 0 && texts.trial_note ? (
          <Text variant="footnote" color="textSecondary" align="center">
            {fill(texts.trial_note, { days: trialDays, price: selected.price, period: selected.plan.period })}
          </Text>
        ) : null}
        {!premium && texts.footnote ? (
          <Text variant="footnote" color="textTertiary" align="center">
            {texts.footnote}
          </Text>
        ) : null}

        <View style={styles.links}>
          {!premium ? <LinkText label="Satın alımları geri yükle" onPress={restorePurchases} busy={busy === 'restore'} /> : null}
          {billing.legal.terms_url ? <LinkText label="Kullanım koşulları" onPress={() => Linking.openURL(billing.legal.terms_url)} /> : null}
          {billing.legal.privacy_url ? <LinkText label="Gizlilik" onPress={() => Linking.openURL(billing.legal.privacy_url)} /> : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {premium ? (
          <Button title="Tamam" trailingIcon={null} onPress={close} />
        ) : (
          <>
            <Button title={cta} onPress={purchase} loading={busy === 'buy'} disabled={!selected || busy === 'restore'} />
            <Pressable onPress={close} hitSlop={8} accessibilityRole="button" style={styles.later}>
              <Text variant="subhead" color="textSecondary">
                Şimdi değil
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

/** One plan: its name and badge, the price for its period, and the line under it. */
function PlanCard({ plan, selected, onPress }: { plan: StorePlan; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { plan: p } = plan;
  const note = [p.note ? fill(p.note, { per_month: plan.perMonth ?? plan.price }) : null, plan.trialDays > 0 ? `İlk ${plan.trialDays} gün ücretsiz` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      accessibilityLabel={[p.title, p.badge, `${plan.price} / ${p.period}`, note].filter(Boolean).join(', ')}
      style={({ pressed }) => [
        styles.plan,
        { backgroundColor: selected ? colors.accentSoft : pressed ? colors.surfaceMuted : colors.surface, borderColor: selected ? colors.accentStrong : colors.border },
      ]}>
      <View style={[styles.radio, { borderColor: selected ? colors.accentStrong : colors.textTertiary }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.accentStrong }]} /> : null}
      </View>
      <View style={styles.flex}>
        <View style={styles.planTitle}>
          <Text variant="title3">{p.title}</Text>
          {p.badge ? <Tag label={p.badge} tone="accent" /> : null}
        </View>
        {note ? (
          <Text variant="subhead" color="textSecondary">
            {note}
          </Text>
        ) : null}
      </View>
      <View style={styles.price}>
        <Text variant="title3">{plan.price}</Text>
        <Text variant="footnote" color="textSecondary">
          / {p.period}
        </Text>
      </View>
    </Pressable>
  );
}

function Notice({ icon, text }: { icon: IconName; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.notice, { backgroundColor: colors.surfaceMuted }]}>
      <Icon name={icon} size={18} color={colors.textSecondary} />
      <Text variant="subhead" color="textSecondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

function LinkText({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} hitSlop={10} accessibilityRole="link" style={({ pressed }) => [styles.link, (pressed || busy) && { opacity: 0.5 }]}>
      <Text variant="footnote" color="textSecondary" style={styles.underline}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, gap: 2 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: ScreenPadding, paddingTop: 16 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: 4, paddingBottom: 28, gap: 24 },
  head: { gap: 8 },
  signIn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  benefits: { gap: 16 },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  well: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  plans: { gap: 10 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 84, paddingVertical: 14, paddingHorizontal: 16, borderRadius: Radius.lg, borderWidth: 1.5 },
  planTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  price: { alignItems: 'flex-end' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: Radius.md },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18, rowGap: 6 },
  link: { minHeight: 32, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
  footer: { paddingHorizontal: ScreenPadding, paddingTop: 12, gap: 4, borderTopWidth: StyleSheet.hairlineWidth },
  later: { alignSelf: 'center', minHeight: 40, justifyContent: 'center', paddingHorizontal: 16 },
});
