import { router } from 'expo-router';
import { useRef, useState } from 'react';
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
import { BookArt, CookArt, PantryArt, VideoArt } from '@/components/tour/tour-art';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding, TouchSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';
import { tourStorage } from '@/lib/token-storage';

const PAGES = [
  {
    kicker: 'Elindekilerle tarif',
    title: 'Buzdolabında ne varsa yaz',
    text: 'Birkaç kısa soruyu cevapla, sana uygun bir tarif hazırlansın. Alerjilerin ve tercihlerin her zaman dikkate alınır.',
    Art: PantryArt,
  },
  {
    kicker: 'Instagram’dan tarife',
    title: 'Videoyu tarife çevir',
    text: 'Beğendiğin yemek videosunun linkini kopyala, alttaki “Ekle” düğmesine bas ve yapıştır. Malzemeler ve adımlar düzenli bir tarife dönüşür.',
    Art: VideoArt,
  },
  {
    kicker: 'Adım adım pişir',
    title: 'Mutfakta yanında',
    text: '“Pişirmeye başla”ya bas; her adım büyük yazıyla gelir. Süreli adımlarda zamanlayıcı kur, süre dolunca alarm çalar.',
    Art: CookArt,
  },
  {
    kicker: 'Tariflerin',
    title: 'Hepsi tek yerde',
    text: 'Kaydettiğin ve hazırladığın tarifler “Tariflerim”de durur. Takıldığın yerde tarif hakkında soru sorabilirsin.',
    Art: BookArt,
  },
];

/**
 * A one-time tour after onboarding (and from Profil → "Uygulamayı tanı"): four quiet pages that show
 * what the app does. Swipe or tap "Devam"; "Atla" is always there.
 */
export default function TourScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  const close = () => {
    tourStorage.set('1').catch(() => {});
    if (router.canGoBack()) router.back();
    else router.replace('/');
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
          accessibilityLabel="Atla"
          accessibilityHint="Tanıtımı kapatır"
          style={({ pressed }) => [styles.skip, pressed && { backgroundColor: colors.surfaceMuted }]}>
          <Text variant="headline" color="textSecondary">
            Atla
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
        {PAGES.map(({ kicker, title, text, Art }, i) => (
          <ScrollView key={title} style={{ width }} contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
            <Art />
            <View style={styles.copy}>
              <Text variant="overline" color="accentText">
                {upperTr(`${i + 1} / ${PAGES.length} · ${kicker}`)}
              </Text>
              <Text variant="display" accessibilityRole="header">
                {title}
              </Text>
              <Text variant="body" color="textSecondary">
                {text}
              </Text>
            </View>
          </ScrollView>
        ))}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12 }]}>
        <PageDots count={PAGES.length} index={page} />
        <Button
          title={last ? 'Başlayalım' : 'Devam'}
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
  bottom: { paddingHorizontal: ScreenPadding, gap: 18, paddingTop: 12 },
});
