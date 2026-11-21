import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, type ComponentType } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageDots } from '@/components/tour/page-dots';
import { BookArt, ChefArt, CookArt, PantryArt, VideoArt } from '@/components/tour/tour-art';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding, TouchSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openSignIn, useAppConfig } from '@/lib/access';
import { upperTr } from '@/lib/format';
import { tourStorage } from '@/lib/token-storage';

/** The app's illustrations a page can ask for by name (billing.onboarding.welcome.pages[].art). */
const ART: Record<string, ComponentType> = { video: VideoArt, chef: ChefArt, pantry: PantryArt, cook: CookArt, book: BookArt };

/**
 * The welcome: a few short pages on what to do first (turn a video into a recipe, find a favourite
 * chef's recipes, get a recipe from what is at home). It opens once, after the paywall that ends
 * onboarding is left, and again from Profil → "Uygulamayı tanı". Swipe or tap the button; the way
 * out at the top is always there. The pages and the wording come from the server.
 */
export default function TourScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollViewInstance>(null);
  const { then } = useLocalSearchParams<{ then?: string }>();
  const welcome = useAppConfig().billing.onboarding.welcome;
  const pages = welcome.pages;
  const [page, setPage] = useState(0);
  const last = page >= pages.length - 1;

  const close = () => {
    tourStorage.set('1').catch(() => {});
    if (router.canGoBack()) router.back();
    else router.replace('/');
    // Somebody who paid as a guest is offered an account once the welcome is over, so the
    // subscription is not tied to this phone alone.
    if (then === 'signin') setTimeout(() => openSignIn('purchase'), 600);
  };
  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingTop: insets.top + 4 }]}>
      <View style={styles.top}>
        <Pressable
          onPress={close}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={welcome.skip}
          accessibilityHint="Tanıtımı kapatır"
          style={({ pressed }) => [styles.skip, pressed && { backgroundColor: colors.surfaceMuted }]}>
          <Text variant="headline" color="textSecondary">
            {welcome.skip}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.flex}>
        {pages.map(({ art, kicker, title, text, steps }, i) => {
          const Art = ART[art];
          return (
            <ScrollView key={`${i}-${title}`} style={{ width }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
              {Art ? <Art /> : null}
              <View style={styles.copy}>
                <Text variant="overline" color="accentText">
                  {upperTr(`${i + 1} / ${pages.length} · ${kicker}`)}
                </Text>
                <Text variant="display" accessibilityRole="header">
                  {title}
                </Text>
                {text ? (
                  <Text variant="body" color="textSecondary">
                    {text}
                  </Text>
                ) : null}
                {steps?.length ? (
                  <View style={styles.steps}>
                    {steps.map((step, n) => (
                      <View key={step} style={styles.step} accessible accessibilityLabel={`${n + 1}. ${step}`}>
                        <View style={[styles.stepNo, { backgroundColor: colors.accentSoft }]}>
                          <Text variant="footnote" weight="700" color="accentText">
                            {n + 1}
                          </Text>
                        </View>
                        <Text variant="body" color="textSecondary" style={styles.flex}>
                          {step}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </ScrollView>
          );
        })}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <PageDots count={pages.length} index={page} />
        <Button
          title={last ? welcome.cta : welcome.next}
          trailingIcon={last ? null : 'arrow-forward'}
          onPress={last ? close : () => goTo(page + 1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: ScreenPadding - 8, height: TouchSize, alignItems: 'center' },
  skip: {
    minWidth: TouchSize,
    minHeight: TouchSize - 4,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: { paddingHorizontal: ScreenPadding, paddingTop: 8, paddingBottom: 16, gap: 28 },
  copy: { gap: 10 },
  steps: { gap: 12, marginTop: 4 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNo: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: ScreenPadding, gap: 18, paddingTop: 12 },
});
