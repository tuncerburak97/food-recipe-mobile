import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { StickyFooter } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const POINTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'basket-outline', title: 'Elindekilerle tarif', text: 'Evdeki malzemeleri yaz, sana uygun bir tarif hazırlansın.' },
  { icon: 'shield-checkmark-outline', title: 'Sana göre ve güvenli', text: 'Alerjilerin ve beslenme tercihlerin her tarifte dikkate alınır.' },
  { icon: 'play-circle-outline', title: 'Videodan tarife', text: 'Instagram’daki yemek videolarını adım adım tarife çevir.' },
];

const ICON_SIZE = 64;

/** First screen: what the app does, in three plain points, and one button. */
export function HeroStep({ onStart }: { onStart: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 44 }]} showsVerticalScrollIndicator={false}>
        <Image
          source={require('../../../assets/app-icon.png')}
          style={[styles.logo, { borderColor: colors.border }]}
          contentFit="cover"
          accessibilityLabel="Tarif Defteri"
          accessibilityIgnoresInvertColors
        />
        <View style={styles.header}>
          <Text variant="display" accessibilityRole="header">
            Ne pişireceğini bilmenin en kolay yolu
          </Text>
          <Text variant="body" color="textSecondary">
            Birkaç kısa soruyla seni tanıyalım; tarifleri damak zevkine, zamanına ve mutfağına göre hazırlayalım.
          </Text>
        </View>
        <View style={styles.points}>
          {POINTS.map((p) => (
            <View key={p.title} style={styles.point} accessible accessibilityLabel={`${p.title}. ${p.text}`}>
              <View style={[styles.well, { backgroundColor: colors.surfaceMuted }]}>
                <Icon name={p.icon} size={21} color={colors.text} />
              </View>
              <View style={styles.pointText}>
                <Text variant="headline">{p.title}</Text>
                <Text variant="subhead" color="textSecondary">
                  {p.text}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <StickyFooter style={styles.footer}>
        <Button title="Başlayalım" trailingIcon="arrow-forward" onPress={onStart} />
        <Text variant="footnote" color="textTertiary" align="center">
          Üyelik gerekmez · Yaklaşık 1 dakika
        </Text>
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, gap: 32, paddingBottom: 24 },
  logo: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  header: { gap: 12 },
  points: { gap: 22 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  well: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pointText: { flex: 1, gap: 2, paddingTop: 2 },
  footer: { borderTopWidth: 0, gap: 12 },
});
