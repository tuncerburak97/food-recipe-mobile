import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageDots } from '@/components/tour/page-dots';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';

const APP_ICON = require('../../../assets/icon/icon.png');
const APP_NAME = 'Tarif Defteri';
const ART_HEIGHT = 280;
/** From the first "Öneriler" row up to the empty "Favoriler" row in the edit-list picture. */
const MOVE_UP = 63;
const IOS = Platform.OS !== 'android';

/** Where the guide was opened from: it changes only the first lines. */
export type ShareGuideContext = 'home' | 'shared' | 'settings';

const INTRO: Record<ShareGuideContext, { kicker: string; title: string; text: string }> = {
  home: {
    kicker: 'Bir kez kur, hep kullan',
    title: 'Instagram’dan tek dokunuşla tarif',
    text: `${APP_NAME}’ni paylaşım menüsünde ilk sıraya al. Sonra her yemek videosunda Paylaş’a dokunman yeter.`,
  },
  shared: {
    kicker: 'İlk paylaşımın geldi',
    title: 'Bir dahakine “Diğer”e girme',
    text: `${APP_NAME}’ni paylaşım menüsünde ilk sıraya al; bir sonraki videoda tek dokunuşla buradasın.`,
  },
  settings: {
    kicker: 'Instagram paylaşımı',
    title: `${APP_NAME}’ni öne al`,
    text: 'Üç adımda paylaşım menüsünde ilk sıraya alırsın.',
  },
};

const PAGES: { title: string; text: string; Art: () => ReactNode }[] = IOS
  ? [
      {
        title: 'Videoda Paylaş’a dokun',
        text: 'Yemek videosunda uçak simgesine, sonra alttaki “Paylaş…” seçeneğine dokun.',
        Art: ReelShareArt,
      },
      {
        title: 'Sondaki “Diğer”e dokun',
        text: 'Uygulama sırasını en sağa kaydır, “Diğer”e dokun. Açılan listede sağ üstteki “Düzenle”ye bas.',
        Art: IosShareSheetArt,
      },
      {
        title: `${APP_NAME}’ni favorilere ekle`,
        text: `${APP_NAME}’nin yanındaki yeşil +’ya dokun, tutup en üste sürükle ve “Bitti”ye bas. Hepsi bu.`,
        Art: IosEditListArt,
      },
    ]
  : [
      {
        title: 'Videoda Paylaş’a dokun',
        text: 'Yemek videosunda uçak simgesine, sonra alttaki “Paylaş…” seçeneğine dokun.',
        Art: ReelShareArt,
      },
      {
        title: `${APP_NAME}’ne basılı tut`,
        text: `Açılan uygulama listesinde ${APP_NAME}’ni bul ve simgesine bir süre basılı tut.`,
        Art: AndroidGridArt,
      },
      {
        title: '“Sabitle”ye dokun',
        text: `${APP_NAME} artık listenin en başında durur. Bir sonraki videoda tek dokunuş yeter.`,
        Art: AndroidPinArt,
      },
    ];

interface Props {
  visible: boolean;
  onClose: () => void;
  context?: ShareGuideContext;
}

/**
 * "Instagram'da Tarif Defteri'ni öne al": three illustrated pages that show how to put the app first
 * in the share menu, so the user never has to dig into "Diğer" again. Shown once from Home, once
 * after the first shared link, and any time from Ayarlar.
 */
export function ShareGuide({ visible, onClose, context = 'home' }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible ? <GuideBody onClose={onClose} context={context} /> : null}
    </Modal>
  );
}

function GuideBody({ onClose, context }: { onClose: () => void; context: ShareGuideContext }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const intro = INTRO[context];
  const pageWidth = width;

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * pageWidth, animated: true });
    setPage(i);
  };
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setPage(Math.round(e.nativeEvent.contentOffset.x / pageWidth));

  const openInstagram = async () => {
    onClose();
    try {
      await Linking.openURL('instagram://');
    } catch {
      Linking.openURL('https://www.instagram.com/').catch(() => {});
    }
  };

  return (
    <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.top}>
        <View style={styles.badges}>
          <View style={[styles.igBadge]}>
            <LinearGradient colors={['#F58529', '#DD2A7B', '#8134AF']} start={{ x: 0, y: 1 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Icon name="logo-instagram" size={18} color="#fff" />
          </View>
          <Icon name="arrow-forward" size={16} color={colors.textTertiary} />
          <Image source={APP_ICON} style={styles.appBadge} contentFit="cover" />
        </View>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Kapat" style={[styles.close, { backgroundColor: colors.surfaceMuted }]}>
          <Icon name="close" size={18} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.intro}>
        <Text variant="overline" color="accentText">
          {upperTr(intro.kicker)}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {intro.title}
        </Text>
        <Text variant="callout" color="textSecondary">
          {intro.text}
        </Text>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}>
        {PAGES.map(({ title, text, Art }, i) => (
          <View key={title} style={[styles.page, { width: pageWidth }]}>
            <View style={[styles.artBox, { backgroundColor: colors.peachSoft, borderColor: colors.border }]}>{page === i ? <Art /> : null}</View>
            <View style={styles.pageCopy}>
              <View style={styles.stepRow}>
                <View style={[styles.stepNo, { backgroundColor: colors.accent }]}>
                  <Text variant="footnote" weight="700" tint="#fff">
                    {i + 1}
                  </Text>
                </View>
                <Text variant="title3" style={styles.flex}>
                  {title}
                </Text>
              </View>
              <Text variant="callout" color="textSecondary">
                {text}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <PageDots count={PAGES.length} index={page} />
        {last ? (
          <>
            <Button title="Instagram’ı aç ve dene" icon="logo-instagram" onPress={openInstagram} />
            <Button title="Anladım" variant="ghost" size="md" onPress={onClose} />
          </>
        ) : (
          <>
            <Button title="Sonraki adım" trailingIcon="arrow-forward" onPress={() => goTo(page + 1)} />
            <Button title="Şimdi değil" variant="ghost" size="md" onPress={onClose} />
          </>
        )}
      </View>
    </View>
  );
}

// ---- illustrations: drawn, not screenshots, so they stay sharp and match both themes ----

/** A pulsing ring that marks where to tap. */
function TapMark({ size = 44, color = '#DE6438', style }: { size?: number; color?: string; style?: object }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }), -1);
  }, [t]);
  const ring = useAnimatedStyle(() => ({ opacity: 1 - t.value, transform: [{ scale: 0.7 + t.value * 0.7 }] }));
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 3, borderColor: color }, ring]} />
      <View style={{ width: size * 0.3, height: size * 0.3, borderRadius: size, backgroundColor: color, opacity: 0.45 }} />
    </View>
  );
}

/** Slides its content up from below once, like a sheet opening. */
function SheetIn({ delay = 500, children, style }: { delay?: number; children: ReactNode; style?: object }) {
  const y = useSharedValue(120);
  useEffect(() => {
    y.value = withDelay(delay, withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }));
  }, [y, delay]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

function Phone({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return <View style={[styles.phone, { backgroundColor: dark ? '#0E0F12' : '#F2F2F7' }]}>{children}</View>;
}

function ReelShareArt() {
  return (
    <Phone dark>
      <LinearGradient colors={['#3A2418', '#B4471F']} style={StyleSheet.absoluteFill} />
      <View style={styles.reelSide}>
        {(['heart-outline', 'chatbubble-outline', 'paper-plane-outline'] as IconName[]).map((n) => (
          <View key={n} style={styles.reelAction}>
            <Icon name={n} size={22} color="#fff" />
            {n === 'paper-plane-outline' ? <TapMark size={46} style={{ left: -12, top: -12 }} /> : null}
          </View>
        ))}
      </View>
      <SheetIn delay={900} style={styles.igSheet}>
        <View style={styles.grabber} />
        <View style={styles.igActions}>
          <MiniAction icon="link-outline" label="Bağlantı" />
          <MiniAction icon="add-circle-outline" label="Hikâye" />
          <View>
            <MiniAction icon="share-outline" label="Paylaş…" strong />
            <TapMark size={50} style={{ left: -4, top: -12 }} />
          </View>
        </View>
      </SheetIn>
    </Phone>
  );
}

function MiniAction({ icon, label, strong }: { icon: IconName; label: string; strong?: boolean }) {
  return (
    <View style={styles.miniAction}>
      <View style={[styles.miniWell, { backgroundColor: strong ? '#fff' : 'rgba(255,255,255,0.12)' }]}>
        <Icon name={icon} size={18} color={strong ? '#111' : '#fff'} />
      </View>
      <Text variant="caption" tint="#fff">
        {label}
      </Text>
    </View>
  );
}

function AppTile({ label, color, icon, image, mark, dim }: { label: string; color?: string; icon?: IconName; image?: boolean; mark?: boolean; dim?: boolean }) {
  return (
    <View style={[styles.appTile, dim && { opacity: 0.45 }]}>
      <View>
        {image ? (
          <Image source={APP_ICON} style={styles.appIcon} contentFit="cover" />
        ) : (
          <View style={[styles.appIcon, { backgroundColor: color, alignItems: 'center', justifyContent: 'center' }]}>
            {icon ? <Icon name={icon} size={22} color={color === '#E5E5EA' ? '#3A3A3C' : '#fff'} /> : null}
          </View>
        )}
        {mark ? <TapMark size={64} style={{ left: -8, top: -8 }} /> : null}
      </View>
      <Text variant="caption" tint="#1C1C1E" numberOfLines={1} style={styles.appLabel}>
        {label}
      </Text>
    </View>
  );
}

function IosShareSheetArt() {
  return (
    <Phone>
      <SheetIn delay={200} style={styles.iosSheet}>
        <View style={styles.grabberDark} />
        <View style={styles.appRow}>
          <AppTile label="Mesajlar" color="#34C759" icon="chatbubble" dim />
          <AppTile label="Mail" color="#0A84FF" icon="mail" dim />
          <AppTile label="Notlar" color="#FFCC00" icon="document-text" dim />
          <AppTile label="Diğer" color="#E5E5EA" icon="ellipsis-horizontal" mark />
        </View>
        <View style={styles.iosList}>
          {['Kopyala', 'Okuma Listesine Ekle'].map((t) => (
            <View key={t} style={styles.iosListRow}>
              <Text variant="footnote" tint="#1C1C1E">
                {t}
              </Text>
            </View>
          ))}
        </View>
      </SheetIn>
    </Phone>
  );
}

function IosEditListArt() {
  // The app row moves from "Öneriler" up into "Favoriler" after the + is tapped.
  const moved = useSharedValue(0);
  useEffect(() => {
    moved.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1300 }),
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.cubic) }),
        withTiming(1, { duration: 1700 }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
    );
  }, [moved]);
  const row = useAnimatedStyle(() => ({ transform: [{ translateY: -MOVE_UP * moved.value }] }));
  const plus = useAnimatedStyle(() => ({ opacity: 1 - moved.value }));
  const minus = useAnimatedStyle(() => ({ opacity: moved.value }));
  return (
    <Phone>
      <View style={styles.editHeader}>
        <Text variant="footnote" weight="700" tint="#1C1C1E">
          Uygulamalar
        </Text>
        <Text variant="footnote" weight="700" tint="#0A84FF">
          Bitti
        </Text>
      </View>
      <Text variant="caption" tint="#8E8E93" style={styles.editSection}>
        FAVORİLER
      </Text>
      <View style={styles.editGroup}>
        <EditRow label="Mesajlar" color="#34C759" icon="chatbubble" sign="minus" />
        <View style={styles.editSlot} />
      </View>
      <Text variant="caption" tint="#8E8E93" style={styles.editSection}>
        ÖNERİLER
      </Text>
      <View style={styles.editGroup}>
        <Animated.View style={[styles.editRowFloat, row]}>
          <View style={styles.editRow}>
            <View style={styles.signBox}>
              <Animated.View style={[StyleSheet.absoluteFill, styles.center, plus]}>
                <View style={[styles.sign, { backgroundColor: '#34C759' }]}>
                  <Icon name="add" size={14} color="#fff" />
                </View>
                <TapMark size={40} color="#34C759" />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.center, minus]}>
                <View style={[styles.sign, { backgroundColor: '#FF3B30' }]}>
                  <Icon name="remove" size={14} color="#fff" />
                </View>
              </Animated.View>
            </View>
            <Image source={APP_ICON} style={styles.rowIcon} contentFit="cover" />
            <Text variant="footnote" weight="700" tint="#1C1C1E" style={styles.flex}>
              {APP_NAME}
            </Text>
            <Icon name="reorder-three" size={20} color="#C7C7CC" />
          </View>
        </Animated.View>
        <View style={styles.editSlot} />
        <EditRow label="Notlar" color="#FFCC00" icon="document-text" sign="plus" />
      </View>
    </Phone>
  );
}

function EditRow({ label, color, icon, sign }: { label: string; color: string; icon: IconName; sign: 'plus' | 'minus' }) {
  return (
    <View style={[styles.editRow, { opacity: 0.55 }]}>
      <View style={styles.signBox}>
        <View style={[styles.sign, { backgroundColor: sign === 'plus' ? '#34C759' : '#FF3B30' }]}>
          <Icon name={sign === 'plus' ? 'add' : 'remove'} size={14} color="#fff" />
        </View>
      </View>
      <View style={[styles.rowIcon, { backgroundColor: color, alignItems: 'center', justifyContent: 'center' }]}>
        <Icon name={icon} size={14} color="#fff" />
      </View>
      <Text variant="footnote" tint="#1C1C1E" style={styles.flex}>
        {label}
      </Text>
      <Icon name="reorder-three" size={20} color="#C7C7CC" />
    </View>
  );
}

function AndroidGridArt() {
  return (
    <Phone>
      <SheetIn delay={200} style={styles.iosSheet}>
        <View style={styles.grabberDark} />
        <View style={styles.appRow}>
          <AppTile label="Mesajlar" color="#34C759" icon="chatbubble" dim />
          <AppTile label="Gmail" color="#EA4335" icon="mail" dim />
          <AppTile label={APP_NAME} image mark />
          <AppTile label="Keep" color="#FBBC04" icon="bulb" dim />
        </View>
        <View style={styles.hold}>
          <Icon name="hand-left-outline" size={16} color="#1C1C1E" />
          <Text variant="caption" tint="#1C1C1E">
            Basılı tut
          </Text>
        </View>
      </SheetIn>
    </Phone>
  );
}

function AndroidPinArt() {
  return (
    <Phone>
      <Animated.View entering={FadeIn.delay(200)} style={styles.pinMenu}>
        <View style={styles.pinHead}>
          <Image source={APP_ICON} style={styles.rowIcon} contentFit="cover" />
          <Text variant="footnote" weight="700" tint="#1C1C1E">
            {APP_NAME}
          </Text>
        </View>
        <View style={styles.pinItem}>
          <Icon name="pin" size={16} color="#1C1C1E" />
          <Text variant="footnote" weight="700" tint="#1C1C1E">
            Sabitle
          </Text>
          <TapMark size={44} style={{ left: -6, top: -10 }} />
        </View>
        <View style={[styles.pinItem, { opacity: 0.5 }]}>
          <Icon name="information-circle-outline" size={16} color="#1C1C1E" />
          <Text variant="footnote" tint="#1C1C1E">
            Uygulama bilgisi
          </Text>
        </View>
      </Animated.View>
    </Phone>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: ScreenPadding, paddingTop: 18 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  igBadge: { width: 36, height: 36, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  appBadge: { width: 36, height: 36, borderRadius: 10 },
  close: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  intro: { paddingHorizontal: ScreenPadding, paddingTop: 16, gap: 6 },
  pager: { flexGrow: 0, marginTop: 18 },
  page: { paddingHorizontal: ScreenPadding, gap: 16 },
  artBox: { height: ART_HEIGHT, borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden', paddingTop: 18 },
  pageCopy: { gap: 6 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNo: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bottom: { marginTop: 'auto', paddingHorizontal: ScreenPadding, gap: 10, paddingTop: 12 },

  phone: { width: 230, height: ART_HEIGHT - 18, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', borderWidth: 6, borderBottomWidth: 0, borderColor: '#1C1C1E' },
  reelSide: { position: 'absolute', right: 14, top: 22, gap: 18, alignItems: 'center' },
  reelAction: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  igSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#1F2023', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 16, paddingTop: 4, gap: 12 },
  grabber: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 6 },
  grabberDark: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.2)', marginTop: 6 },
  igActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 6 },
  miniAction: { alignItems: 'center', gap: 4 },
  miniWell: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  iosSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, top: 30, backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 12 },
  appRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 4 },
  appTile: { alignItems: 'center', gap: 4, width: 52 },
  appIcon: { width: 46, height: 46, borderRadius: 12 },
  appLabel: { maxWidth: 52 },
  iosList: { marginHorizontal: 10, borderRadius: 10, backgroundColor: '#F2F2F7' },
  iosListRow: { paddingHorizontal: 12, height: 34, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D1D1D6' },
  hold: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 28, borderRadius: 14, backgroundColor: '#F2F2F7' },

  editHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 },
  editSection: { paddingHorizontal: 14, marginTop: 6, marginBottom: 4 },
  editGroup: { marginHorizontal: 8, borderRadius: 10, backgroundColor: '#FFFFFF' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 39, paddingHorizontal: 8, backgroundColor: '#FFFFFF', borderRadius: 10 },
  editRowFloat: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 2 },
  editSlot: { height: 39 },
  signBox: { width: 22, height: 22 },
  sign: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { width: 24, height: 24, borderRadius: 6 },

  pinMenu: { position: 'absolute', left: 24, right: 24, top: 40, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 8, gap: 2, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, elevation: 6 },
  pinHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  pinItem: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 38, paddingHorizontal: 10, borderRadius: 10 },
});
