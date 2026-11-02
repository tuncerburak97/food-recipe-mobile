import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';
import type { Creator } from '@/lib/types';

/** Instagram accounts with the most recipes as round photos; a tap opens the account's recipes. */
export function CreatorRail({ creators }: { creators: Creator[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.row}>
      {creators.map((c) => {
        const name = c.full_name || c.username;
        return (
          <PressableScale
            key={c.username}
            onPress={() => router.push(`/creator/${encodeURIComponent(c.username)}`)}
            accessibilityRole="button"
            accessibilityLabel={`${name}, ${c.recipe_count} tarif`}
            style={styles.item}>
            <Avatar name={name} uri={c.avatar_url || undefined} size={60} />
            <Text variant="footnote" weight="600" numberOfLines={1} align="center" style={styles.name}>
              {c.username}
            </Text>
            <Text variant="caption" color="textTertiary" align="center">
              {c.recipe_count} tarif
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -ScreenPadding },
  row: { paddingHorizontal: ScreenPadding, gap: 14 },
  item: { width: 76, alignItems: 'center', gap: 2 },
  name: { marginTop: 6, alignSelf: 'stretch' },
});
