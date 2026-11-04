import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChefAvatar } from '@/components/ui/chef-avatar';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Home's way into the assistant: tap to type, the mic to say it ("elimde pirinç var"). */
export function AskBar() {
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.accentSoft }]}>
      <Pressable
        onPress={() => router.push('/agent')}
        accessibilityRole="button"
        accessibilityLabel="AI Şef’e sor"
        accessibilityHint="Tarif, malzeme ya da hesap sorabileceğin sohbeti açar"
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}>
        <ChefAvatar size={36} />
        <View style={styles.text}>
          <Text variant="headline" numberOfLines={1}>
            AI Şef’e sor
          </Text>
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            “Elimde pirinç var, ne yapabilirim?”
          </Text>
        </View>
      </Pressable>
      <IconButton icon="mic" label="Sesle sor" tone="accent" size={40} onPress={() => router.push({ pathname: '/agent', params: { voice: '1' } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6, borderRadius: Radius.pill, minHeight: 52 },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 10, paddingVertical: 6, borderRadius: Radius.pill },
  text: { flex: 1, gap: 1 },
  pressed: { opacity: 0.7 },
});
