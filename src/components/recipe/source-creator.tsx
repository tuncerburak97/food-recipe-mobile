import { router } from 'expo-router';

import { Avatar } from '@/components/ui/avatar';
import { ListRow } from '@/components/ui/list';
import type { RecipeSource } from '@/lib/types';

/** The Instagram account a recipe came from, as a row; opens that account's recipes. */
export function SourceCreator({ source, first = true }: { source: RecipeSource; first?: boolean }) {
  const name = source.ownerFullName || source.ownerUsername;
  return (
    <ListRow
      first={first}
      leading={<Avatar name={name} uri={source.ownerAvatarUrl} size={38} />}
      title={name}
      subtitle={`@${source.ownerUsername}${source.ownerVerified ? ' · Onaylı hesap' : ''}`}
      accessibilityHint="Bu hesabın tariflerini açar"
      onPress={() => router.push(`/creator/${encodeURIComponent(source.ownerUsername)}`)}
    />
  );
}
