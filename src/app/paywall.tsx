import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { accessApi, openSignIn, placementText, usePremium, type Access, type PaywallTexts } from '@/lib/access';
import { track } from '@/lib/analytics';
import { upperTr } from '@/lib/format';
import { buy, ensurePurchases, loadStorePlans, purchasesBlocked, restore, type StorePlan } from '@/lib/purchases';
import { useMe } from '@/lib/queries';
import { showToast } from '@/store/toast';

/** A plan card's height, for the placeholders shown while the store's prices load. */
const PLAN_HEIGHT = 122;

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
 * The plan that is cheapest per month and how much it saves over the dearest, from the store's
 * own prices. Nothing when the prices show no saving, so the paywall never claims one.
 */
function bestSaving(plans: StorePlan[]): { id: string; percent: number } | null {
  const priced = plans.filter((p) => p.monthly != null);
  if (priced.length < 2) return null;
  const cheapest = priced.reduce((a, b) => (b.monthly! < a.monthly! ? b : a));
  const dearest = Math.max(...priced.map((p) => p.monthly!));
  const percent = Math.round((1 - cheapest.monthly! / dearest) * 100);
  return percent >= 5 ? { id: cheapest.plan.id, percent } : null;
}

/**
 * The paywall, on one screen. Its header says why it opened (a used-up limit, the end of
 * onboarding, or where it was opened from), then what Premium adds, the plans side by side with the
 * store's prices and the trial as a timeline, and one button with a quiet way out and the small
 * links under it. It says less on a screen it would not fit (see `density`). A "hard" placement
 * (the end of onboarding) has no close button: the only way out is "continue for free". All
 * wording, the plans and which placements are hard come from the server; prices and the trial from
 * the store.
 */
export default function PaywallScreen() {
  const params = useLocalSearchParams<{ placement?: string; signInLimit?: string; limit?: string }>();
  const placement = params.placement ?? 'settings';
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const client = useQueryClient();
  const { config, access, premium } = usePremium();
  const me = useMe().data;
  const { billing } = config;
  const texts = billing.paywall;
  const head = placementText(texts, placement);
  const blocked = purchasesBlocked(config);
  const billingId = access?.billing_id ?? '';
  // Once Premium is on there is nothing to hold anyone for.
  const hard = !premium && texts.hard.includes(placement);

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
  const saving = bestSaving(list);

  useEffect(() => {
    track('paywall_viewed', { placement, hard });
    // Counted when the paywall opens; `hard` does not change while it is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement]);

  // A hard paywall is left by its own link, not by the system's back.
  useEffect(() => {
    if (!hard) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [hard]);

  // The paywall that ends onboarding is followed by the welcome, whichever way it is left.
  const welcomeNext = placement === 'onboarding' && billing.onboarding.welcome.enabled;
  const close = (paid = false) => {
    if (welcomeNext) router.replace(paid && me?.guest ? '/tour?then=signin' : '/tour');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const dismiss = (how: 'close' | 'free' | 'later') => {
    track('paywall_dismissed', { placement, hard, how });
    close();
  };

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
      close(true);
      // A guest who paid: offer to tie the subscription to an account, so it survives a new phone
      // (after the welcome, when that comes first).
      if (me?.guest && !welcomeNext) setTimeout(() => openSignIn('purchase'), 600);
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
  const trialValues = selected ? { days: trialDays, price: selected.price, period: selected.plan.period } : null;
  const signInLimit = Number(params.signInLimit ?? 0);
  // A guest at a limit can get more for free by signing in: say so before asking for money.
  const offerSignIn = !premium && !!me?.guest && signInLimit !== 0 && (signInLimit < 0 || signInLimit > Number(params.limit ?? 0));

  // The paywall is one screen: when it does not fit, it says less until it does. 0 is everything,
  // 1 the benefits as titles only, 2 the trial as one sentence as well. It only ever goes down, and
  // what still does not fit after that (a very small screen, very large type) scrolls.
  const [density, setDensity] = useState(0);
  const [overflows, setOverflows] = useState(false);
  const sizes = useRef({ view: 0, content: 0 });
  /** `fresh`: the sizes are of a new layout, so a step down has had its chance to help. */
  const refit = (fresh: boolean) => {
    const { view, content } = sizes.current;
    if (!view || !content) return;
    const over = content > view + 1;
    setOverflows(over);
    if (over && fresh) setDensity((d) => Math.min(2, d + 1));
  };
  const dense = density >= 1;

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
      <Stack.Screen options={{ gestureEnabled: !hard }} />
      {hard ? null : (
        <View style={styles.top}>
          {head.icon && !premium ? (
            <View style={[styles.headWell, { backgroundColor: colors.accentSoft }]}>
              <Icon name={head.icon as IconName} size={20} color={colors.accentText} />
            </View>
          ) : (
            <View />
          )}
          <IconButton icon="close" label="Kapat" tone="muted" onPress={() => dismiss('close')} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, hard && styles.contentHard, premium && styles.contentTop]}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        onLayout={(e) => {
          const first = sizes.current.view === 0;
          sizes.current.view = e.nativeEvent.layout.height;
          refit(first);
        }}
        onContentSizeChange={(_, height) => {
          sizes.current.content = height;
          refit(true);
        }}>
        <View style={styles.group}>
          <Animated.View entering={FadeInDown.duration(240)} style={styles.head}>
            <Text variant="overline" color="accentText">
              {upperTr(premium || !head.eyebrow ? 'Premium' : head.eyebrow)}
            </Text>
            {/* After onboarding the second line is the offer itself, so it is set like the title. */}
            {hard ? (
              <View>
                <Text variant="display" accessibilityRole="header">
                  {head.title}
                </Text>
                <Text variant="display" color="accentText">
                  {head.subtitle}
                </Text>
              </View>
            ) : (
              <>
                <Text variant="title" accessibilityRole="header">
                  {premium ? 'Premium üyesin' : head.title}
                </Text>
                <Text variant="callout" color="textSecondary">
                  {premium ? 'Tüm tarifler, videolar ve Yapay Zeka Şefi sınırsız açık. Afiyet olsun.' : head.subtitle}
                </Text>
              </>
            )}
          </Animated.View>

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
        </View>

        <View style={dense ? styles.benefitsDense : styles.benefits}>
          {texts.benefits.map((b, i) => (
            <Animated.View
              key={b.title}
              entering={FadeInDown.delay(60 + i * 40).duration(240)}
              style={styles.benefit}
              accessible
              accessibilityLabel={`${b.title}. ${b.text}`}>
              <View style={[dense ? styles.wellDense : styles.well, { backgroundColor: colors.surfaceMuted }]}>
                <Icon name={b.icon as IconName} size={dense ? 15 : 18} color={colors.text} />
              </View>
              <View style={styles.flex}>
                <Text variant="headline" numberOfLines={dense ? 1 : 2}>
                  {b.title}
                </Text>
                {dense ? null : (
                  <Text variant="subhead" color="textSecondary" numberOfLines={2}>
                    {b.text}
                  </Text>
                )}
              </View>
              <Icon name={premium ? 'checkmark-circle' : 'checkmark'} size={18} color={colors.success} />
            </Animated.View>
          ))}
        </View>

        {premium ? null : (
          <View style={styles.offer}>
            {blocked ? (
              <Notice
                icon="construct-outline"
                text={
                  blocked === 'build'
                    ? 'Satın alma bu sürümde henüz açık değil. Uygulamayı güncellediğinde planlar burada görünür.'
                    : 'Planlar çok yakında burada olacak.'
                }
              />
            ) : plans.isPending ? (
              // The trial's lines get their room too, so nothing moves when the plans arrive.
              <SkeletonPulse style={styles.offer}>
                <View style={styles.plans}>
                  <SkeletonBlock height={PLAN_HEIGHT} radius={Radius.lg} style={styles.planSlot} />
                  <SkeletonBlock height={PLAN_HEIGHT} radius={Radius.lg} style={styles.planSlot} />
                </View>
                <SkeletonBlock height={52} radius={Radius.md} />
              </SkeletonPulse>
            ) : list.length === 0 ? (
              <View style={styles.stack}>
                <Notice icon="cloud-offline-outline" text="Planlar şu an yüklenemedi. İnternet bağlantını kontrol edip tekrar dener misin?" />
                <Button title="Tekrar dene" icon="refresh" variant="secondary" loading={plans.isFetching} onPress={() => plans.refetch()} />
              </View>
            ) : (
              <>
                <Animated.View entering={FadeInDown.delay(100).duration(240)} style={styles.plans} accessibilityRole="radiogroup">
                  {list.map((p) => (
                    <PlanCard
                      key={p.plan.id}
                      plan={p}
                      badge={saving?.id === p.plan.id && texts.savings_badge ? fill(texts.savings_badge, { percent: saving.percent }) : p.plan.badge}
                      selected={p.plan.id === selected?.plan.id}
                      onPress={() => setChosen(p.plan.id)}
                    />
                  ))}
                </Animated.View>
                {/* What happens to the money: the trial's days, or the renewal small print without one. */}
                {trialValues && trialDays > 0 ? (
                  <Animated.View entering={FadeInDown.delay(140).duration(240)}>
                    <TrialTimeline texts={texts} values={trialValues} brief={density >= 2} />
                  </Animated.View>
                ) : texts.footnote ? (
                  <Text variant="footnote" color="textTertiary" align="center">
                    {texts.footnote}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 8) + 2, backgroundColor: colors.surface, borderTopColor: overflows ? colors.border : 'transparent' },
        ]}>
        {premium ? (
          <Button title="Tamam" trailingIcon={null} onPress={() => close()} />
        ) : (
          <>
            <Button title={cta} trailingIcon="arrow-forward" onPress={purchase} loading={busy === 'buy'} disabled={!selected || busy === 'restore'} />
            {texts.trust ? (
              <View style={styles.trust}>
                <Icon name="lock-closed-outline" size={13} color={colors.textTertiary} />
                <Text variant="caption" color="textTertiary">
                  {texts.trust}
                </Text>
              </View>
            ) : null}
            <Pressable onPress={() => dismiss(hard ? 'free' : 'later')} hitSlop={6} accessibilityRole="button" style={({ pressed }) => [styles.later, pressed && { opacity: 0.5 }]}>
              <Text variant="subhead" color="textSecondary">
                {hard ? texts.free_cta : texts.later_cta}
              </Text>
            </Pressable>
          </>
        )}
        <View style={styles.links}>
          {!premium ? <LinkText label="Geri yükle" onPress={restorePurchases} busy={busy === 'restore'} accessibilityLabel="Satın alımları geri yükle" /> : null}
          {billing.legal.terms_url ? <LinkText label="Kullanım koşulları" onPress={() => Linking.openURL(billing.legal.terms_url)} /> : null}
          {billing.legal.privacy_url ? <LinkText label="Gizlilik" onPress={() => Linking.openURL(billing.legal.privacy_url)} /> : null}
        </View>
      </View>
    </View>
  );
}

/** One plan as a card in a row of two: its name, the price for its period and what that is a month. */
function PlanCard({ plan, badge, selected, onPress }: { plan: StorePlan; badge: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const { plan: p } = plan;
  const note = p.note ? fill(p.note, { per_month: plan.perMonth ?? plan.price }) : '';
  const trial = plan.trialDays > 0 ? `İlk ${plan.trialDays} gün ücretsiz` : '';
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, selected }}
      accessibilityLabel={[p.title, badge, `${plan.price} / ${p.period}`, note, trial].filter(Boolean).join(', ')}
      style={({ pressed }) => [
        styles.plan,
        styles.planSlot,
        { backgroundColor: selected ? colors.accentSoft : pressed ? colors.surfaceMuted : colors.surface, borderColor: selected ? colors.accentStrong : colors.border },
      ]}>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.accentStrong }]}>
          <Text variant="caption" color="onAccent" weight="600" numberOfLines={1}>
            {badge}
          </Text>
        </View>
      ) : null}
      <View style={styles.planTitle}>
        <Text variant="headline">{p.title}</Text>
        <View style={[styles.radio, { borderColor: selected ? colors.accentStrong : colors.textTertiary }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: colors.accentStrong }]} /> : null}
        </View>
      </View>
      <View style={styles.price}>
        <Text variant="title2">{plan.price}</Text>
        <Text variant="footnote" color="textSecondary">
          / {p.period}
        </Text>
      </View>
      {note ? (
        <Text variant="footnote" color="textSecondary">
          {note}
        </Text>
      ) : null}
      {trial ? (
        <Text variant="footnote" color="accentText" weight="600">
          {trial}
        </Text>
      ) : null}
    </Pressable>
  );
}

/**
 * The free trial as steps on a rail: what happens today and on the day it ends. `brief` says it in
 * one sentence instead, for a screen the steps do not fit.
 */
function TrialTimeline({ texts, values, brief }: { texts: PaywallTexts; values: Record<string, string | number>; brief: boolean }) {
  const { colors } = useTheme();
  if (texts.trial_steps.length === 0 || (brief && texts.trial_note)) {
    return texts.trial_note ? (
      <Text variant="footnote" color="textSecondary" align="center">
        {fill(texts.trial_note, values)}
      </Text>
    ) : null;
  }
  return (
    <View style={styles.timeline} accessible accessibilityLabel={fill(texts.trial_note || texts.trial_steps.map((s) => `${s.title}: ${s.text}`).join(' '), values)}>
      {texts.trial_steps.map((step, i) => {
        const last = i === texts.trial_steps.length - 1;
        return (
          <View key={step.title} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: i === 0 ? colors.accentStrong : colors.surface, borderColor: colors.accentStrong }]} />
              {!last ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
            </View>
            <Text variant="subhead" color="textSecondary" style={[styles.stepText, !last && styles.stepGap]}>
              <Text variant="subhead" weight="700">
                {fill(step.title, values)}
              </Text>
              {`  ${fill(step.text, values)}`}
            </Text>
          </View>
        );
      })}
    </View>
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

function LinkText({ label, onPress, busy, accessibilityLabel }: { label: string; onPress: () => void; busy?: boolean; accessibilityLabel?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      hitSlop={10}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.link, (pressed || busy) && { opacity: 0.5 }]}>
      <Text variant="footnote" color="textSecondary" style={styles.underline}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ScreenPadding, paddingTop: 8 },
  headWell: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  // The header sits at the top and the offer at the bottom, next to the button, with what Premium
  // adds between them; room left over on a tall screen is shared by the two gaps.
  content: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: ScreenPadding, paddingTop: 12, paddingBottom: 12, gap: 18 },
  contentHard: { paddingTop: 16 },
  // A member has no offer under the benefits, so they follow the header.
  contentTop: { justifyContent: 'flex-start' },
  group: { gap: 16 },
  head: { gap: 6 },
  signIn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  stack: { gap: 10 },
  benefits: { gap: 12 },
  benefitsDense: { gap: 8 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  well: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  wellDense: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  offer: { gap: 12 },
  // Room above the cards for the badge that sits on a card's top edge.
  plans: { flexDirection: 'row', alignItems: 'stretch', gap: 10, paddingTop: 10 },
  planSlot: { flex: 1 },
  plan: { gap: 4, paddingVertical: 14, paddingHorizontal: 14, borderRadius: Radius.lg, borderWidth: 1.5 },
  planTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  price: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 4 },
  badge: { position: 'absolute', top: -11, left: 12, maxWidth: '90%', height: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  timeline: { paddingHorizontal: 4 },
  step: { flexDirection: 'row', gap: 10 },
  stepText: { flex: 1 },
  stepGap: { paddingBottom: 8 },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, marginTop: 4 },
  line: { flex: 1, width: 2, marginTop: 3, borderRadius: 1 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: Radius.md },
  footer: { paddingHorizontal: ScreenPadding, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  trust: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  later: { alignSelf: 'center', minHeight: 36, justifyContent: 'center', paddingHorizontal: 16, marginTop: 2 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18 },
  link: { minHeight: 28, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
