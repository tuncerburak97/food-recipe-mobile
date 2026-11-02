import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { RecipeEntry } from '@/lib/types';

/**
 * Where the recipe is from, in one quiet line: the Instagram account ("@melekce_kitchen", with the
 * verified mark), or "Sana özel hazırlandı" for recipes made for the user. Renders nothing for
 * recipes the user typed in themselves.
 */
export function CreatorLine({ entry }: { entry: RecipeEntry; mine?: boolean; showAddedBy?: boolean }) {
  const { colors } = useTheme();
  const src = entry.source;

  if (entry.origin === 'ai') {
    return (
      <View style={styles.row}>
        <View style={[styles.mark, { backgroundColor: colors.surfaceMuted }]}>
          <Icon name="person-outline" size={11} color={colors.textSecondary} />
        </View>
        <Text variant="footnote" color="textSecondary" numberOfLines={1} style={styles.name}>
          Sana özel hazırlandı
        </Text>
      </View>
    );
  }
  if (!src) return null;
  return (
    <View style={styles.row}>
      <Avatar name={src.ownerFullName || src.ownerUsername} uri={src.ownerAvatarUrl} size={18} />
      <Text variant="footnote" color="textSecondary" weight="600" numberOfLines={1} style={styles.name}>
        @{src.ownerUsername}
      </Text>
      {src.ownerVerified ? <Icon name="checkmark-circle" size={13} color={colors.accent} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 },
  mark: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  name: { flexShrink: 1 },
});
