import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { upperTr } from '@/lib/format';

function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 11) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

interface Props {
  name?: string;
  onProfile: () => void;
  /** Recipes that finished in the background and were not opened yet. */
  unseen?: number;
  onInbox?: () => void;
}

/** Top of Home: the avatar with the date and a greeting (opens Profil), and the notifications bell. */
export function HomeHeader({ name, onProfile, unseen = 0, onInbox }: Props) {
  const first = name?.trim().split(' ')[0];
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hello = first && first !== 'Misafir' ? `${greeting()}, ${first}` : greeting();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onProfile}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${hello}. Profil`}
        style={({ pressed }) => [styles.who, pressed && styles.pressed]}>
        <Avatar name={name || 'Misafir'} size={44} />
        <View style={styles.flex}>
          <Text variant="overline" color="textTertiary" numberOfLines={1}>
            {upperTr(today)}
          </Text>
          <Text variant="headline" numberOfLines={1}>
            {hello}
          </Text>
        </View>
      </Pressable>
      {onInbox && <IconButton icon="notifications-outline" label="Bildirimler" badge={unseen} onPress={onInbox} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  who: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  flex: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
});
