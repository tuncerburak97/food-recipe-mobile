import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Creator } from '@/lib/types';

/**
 * One Instagram account as a row on the sheet: its place in the ranking, photo, name and
 * @username, and how many recipes it has as a quiet figure on the right.
 */
export function CreatorRow({ creator, rank }: { creator: Creator; rank?: number }) {
  const { colors } = useTheme();
  const handle = `@${creator.username}`;
  const name = creator.full_name || handle;
  const label = [rank != null ? `${rank}.` : null, creator.full_name || creator.username, creator.full_name ? handle : null, `${creator.recipe_count} tarif`]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => router.push(`/creator/${encodeURIComponent(creator.username)}`)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Hesabın tariflerini açar"
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
      {rank != null ? (
        <Text variant="headline" color={rank <= 3 ? 'text' : 'textTertiary'} align="center" style={styles.rank}>
          {rank}
        </Text>
      ) : null}
      <Avatar name={creator.full_name || creator.username} uri={creator.avatar_url || undefined} size={44} />
      <View style={styles.texts}>
        <View style={styles.nameRow}>
          <Text variant="headline" numberOfLines={1} style={styles.shrink}>
            {name}
          </Text>
          {creator.verified ? <Icon name="checkmark-circle" size={15} color={colors.accent} /> : null}
        </View>
        {creator.full_name ? (
          <Text variant="subhead" color="textSecondary" numberOfLines={1}>
            {handle}
          </Text>
        ) : null}
      </View>
      <View style={styles.count}>
        <Text variant="headline" style={styles.figure}>
          {creator.recipe_count}
        </Text>
        <Text variant="caption" color="textTertiary">
          tarif
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingHorizontal: ScreenPadding, paddingVertical: 14 },
  rank: { width: 22, fontVariant: ['tabular-nums'] },
  texts: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  shrink: { flexShrink: 1 },
  count: { minWidth: 40, alignItems: 'flex-end' },
  figure: { fontVariant: ['tabular-nums'] },
});
