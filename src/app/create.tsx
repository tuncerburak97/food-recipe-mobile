import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChoiceCard } from '@/components/ui/choice-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The "Ekle" button of the tab bar: the three ways to get a new recipe, each in one plain sentence. */
export default function CreateScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
      <ScreenHeader leading="close" title="Yeni tarif" subtitle="Nasıl başlamak istersin?" safeTop={false} tone="muted" />
      <View style={styles.list}>
        <ChoiceCard
          role="button"
          icon="basket-outline"
          title="Elimdekilerle tarif hazırla"
          description="Evdeki malzemeleri seç, birkaç kısa soruyu cevapla; sana uygun tarif hazırlansın."
          onPress={() => router.replace('/chef')}
        />
        <ChoiceCard
          role="button"
          icon="logo-instagram"
          title="Instagram ya da YouTube videosundan ekle"
          description="Yemek videosunun linkini yapıştır; malzemeler ve adımlar düzenli bir tarife dönüşsün."
          onPress={() => router.replace('/add')}
        />
        <ChoiceCard
          role="button"
          icon="mic-outline"
          title="Sesle anlat"
          description="Annenin, anneannenin tarifini kaydet, biz yazıya dökelim."
          onPress={() => router.replace('/voice-recipe')}
        />
        <Text variant="footnote" color="textTertiary" style={styles.tip}>
          İpucu: Instagram’da ya da YouTube’da bir videoyu Paylaş menüsünden “Tarif Defteri”ne gönderirsen link kendiliğinden gelir.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: 4 },
  list: { paddingHorizontal: ScreenPadding, gap: 12 },
  tip: { paddingHorizontal: 4, marginTop: 4 },
});
