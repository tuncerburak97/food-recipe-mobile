import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenListGroup } from '@/components/kitchen/kitchen-list-group';
import { ShareGuide } from '@/components/share-guide/share-guide';
import { Avatar } from '@/components/ui/avatar';
import { SheetHeader, sheetScrollStyles } from '@/components/ui/layout';
import { ListGroup, ListRow } from '@/components/ui/list';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { ScreenPadding, TabBarHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ALLERGY, DIET, HOUSEHOLD, labelOf } from '@/lib/profile';
import { useMe } from '@/lib/queries';
import { useAppearance, type Appearance } from '@/store/appearance';
import { useSession } from '@/store/session';

const APPEARANCE: { value: Appearance; label: string }[] = [
  { value: 'light', label: 'Açık' },
  { value: 'dark', label: 'Koyu' },
  { value: 'system', label: 'Sistem' },
];

/** "Profil" tab: who you are on the cream page, then a short menu on the white sheet. */
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const scroll = sheetScrollStyles(colors);
  const me = useMe().data;
  const { signOut } = useSession();
  const [guide, setGuide] = useState(false);
  const { appearance, setAppearance } = useAppearance();
  const p = me?.profile;
  const name = me?.name || 'Misafir';

  // One line that tells what the recipes are tailored to, e.g. "2 kişi · Vejetaryen · Kuruyemiş alerjisi".
  const prefs = [
    HOUSEHOLD.find((o) => o.value === p?.household)?.hint,
    ...(p?.diet ?? []).map((d) => labelOf(DIET, d)),
    ...(p?.allergies ?? []).map((a) => `${labelOf(ALLERGY, a)} alerjisi`),
  ].filter(Boolean);

  const startOver = () =>
    Alert.alert(
      'Baştan başla',
      'Bu telefondaki misafir hesabın kapanır ve tanışma sorularından yeniden başlarsın. Kayıtlı tariflerin bu telefonda görünmez.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Baştan başla', style: 'destructive', onPress: signOut },
      ],
    );

  return (
    <ScrollView style={scroll.scroll} contentContainerStyle={scroll.content} showsVerticalScrollIndicator={false}>
      <SheetHeader
        header={
          <View style={styles.identity}>
            <Avatar name={name} uri={me?.avatarUrl} size={68} />
            <View style={styles.flex}>
              <Text variant="title" numberOfLines={1} accessibilityRole="header">
                {name}
              </Text>
              <Text variant="subhead" color="textSecondary" numberOfLines={1}>
                Misafir hesap · {me?.recipeCount ?? 0} tarif
              </Text>
            </View>
          </View>
        }
        sheetStyle={[styles.sheet, { paddingBottom: TabBarHeight + insets.bottom + 16 }]}>
        <ListGroup title="Hesabım">
          <ListRow
            first
            icon="person-outline"
            title="Kişisel bilgiler ve tercihler"
            subtitle={prefs.length ? prefs.join(' · ') : 'Ad, beslenme, alerjiler, mutfak tercihleri'}
            onPress={() => router.push('/profile')}
          />
          <ListRow
            icon="journal-outline"
            title="Pişirdiklerim"
            subtitle="Pişirdiğin yemekler, notların ve fotoğrafların"
            onPress={() => router.push('/journal')}
          />
        </ListGroup>

        <KitchenListGroup />

        <ListGroup title="Görünüm" footer="Sistem seçiliyken telefonunun açık ya da koyu ayarı kullanılır.">
          <View style={styles.segment}>
            <SegmentedControl<Appearance> label="Görünüm" segments={APPEARANCE} value={appearance} onChange={setAppearance} />
          </View>
        </ListGroup>

        <ListGroup title="Uygulama">
          <ListRow first icon="map-outline" title="Uygulamayı tanı" subtitle="Özelliklerin kısa tanıtımı" onPress={() => router.push('/tour')} />
          <ListRow
            icon="logo-instagram"
            title="Instagram paylaşımını kur"
            subtitle="Paylaş menüsünde Tarif Defteri ilk sırada olsun"
            onPress={() => setGuide(true)}
          />
          <ListRow icon="information-circle-outline" title="Sürüm" value={Constants.expoConfig?.version ?? '-'} />
          <ListRow
            icon="refresh-outline"
            title="Baştan başla"
            subtitle="Yeni bir misafir hesapla tanışma sorularından başla"
            danger
            onPress={startOver}
            accessibilityHint="Önce onay ister"
          />
        </ListGroup>
        <ShareGuide visible={guide} onClose={() => setGuide(false)} context="settings" />
      </SheetHeader>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 8 },
  sheet: { paddingHorizontal: ScreenPadding, gap: 28 },
  segment: { padding: 10 },
});
