import { router, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { BackBar } from '@/components/browse/page-header';
import { RecipeFeed } from '@/components/recipe/recipe-feed';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SheetLayout } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useCreator } from '@/lib/queries';

/** One Instagram account: who it is, how many recipes, and all of its recipes. */
export default function CreatorScreen() {
  const { username: raw } = useLocalSearchParams<{ username: string }>();
  const username = decodeURIComponent(raw ?? '');
  const { colors } = useTheme();
  const creator = useCreator(username).data;
  const name = creator?.full_name || username;
  const facts = [`@${username}`, creator ? `${creator.recipe_count} tarif` : null].filter(Boolean).join(' · ');

  const header = (
    <View style={styles.header}>
      <BackBar />
      <View style={styles.identity} accessible accessibilityRole="header" accessibilityLabel={[name, creator?.verified ? 'onaylı hesap' : null, facts].filter(Boolean).join(', ')}>
        <Avatar name={name} uri={creator?.avatar_url || undefined} size={64} />
        <View style={styles.names}>
          <View style={styles.nameRow}>
            <Text variant="title" numberOfLines={2} style={styles.shrink}>
              {name}
            </Text>
            {creator?.verified ? <Icon name="checkmark-circle" size={18} color={colors.accent} /> : null}
          </View>
          <Text variant="callout" color="textSecondary" numberOfLines={1}>
            {facts}
          </Text>
        </View>
      </View>
      <Button
        title="Instagram’da aç"
        icon="logo-instagram"
        variant="outline"
        size="md"
        accessibilityHint="Hesabın Instagram sayfasını açar"
        onPress={() => Linking.openURL(`https://www.instagram.com/${encodeURIComponent(username)}/`)}
        style={styles.button}
      />
    </View>
  );

  return (
    <SheetLayout header={header}>
      <RecipeFeed
        params={{ scope: 'all', owner: username }}
        empty={{
          icon: 'book-outline',
          title: 'Tarif yok',
          message: 'Bu hesaptan henüz kayıtlı tarif yok. Beğendiğin bir videosunu ekleyebilirsin.',
          action: <Button title="Videodan tarif ekle" onPress={() => router.push('/add')} />,
        }}
      />
    </SheetLayout>
  );
}

const styles = StyleSheet.create({
  header: { gap: 16 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  names: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  shrink: { flexShrink: 1 },
  button: { alignSelf: 'flex-start' },
});
