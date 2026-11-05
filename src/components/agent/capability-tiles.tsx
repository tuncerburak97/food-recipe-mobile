import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CAPABILITIES, type GuideKind } from '@/lib/agent/capabilities';

/** The empty chat: what the assistant can do, two tiles per row, each with a one-line hint. */
export function CapabilityGrid({ onPick }: { onPick: (kind: GuideKind) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      {CAPABILITIES.map((c) => (
        <Pressable
          key={c.kind}
          onPress={() => onPick(c.kind)}
          accessibilityRole="button"
          accessibilityLabel={`${c.title}. ${c.hint}`}
          style={({ pressed }) => [styles.tile, { backgroundColor: colors.surfaceMuted }, pressed && styles.pressed]}>
          <View style={[styles.well, { backgroundColor: colors.accentSoft }]}>
            <Icon name={c.icon} size={18} color={colors.accentText} />
          </View>
          <Text variant="headline" numberOfLines={1}>
            {c.title}
          </Text>
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            {c.hint}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The same choices as one swipeable row, above the message box during a conversation. */
export function CapabilityStrip({ onPick }: { onPick: (kind: GuideKind) => void }) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.strip} style={styles.bleed}>
      {CAPABILITIES.map((c) => (
        <Pressable
          key={c.kind}
          onPress={() => onPick(c.kind)}
          accessibilityRole="button"
          accessibilityLabel={`${c.title}. ${c.hint}`}
          style={({ pressed }) => [styles.pill, { backgroundColor: colors.surfaceMuted }, pressed && styles.pressed]}>
          <Icon name={c.icon} size={15} color={colors.accentText} />
          <Text variant="subhead" numberOfLines={1}>
            {c.title}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { flexBasis: '47%', flexGrow: 1, gap: 4, padding: 12, borderRadius: Radius.md, minHeight: 96 },
  well: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  strip: { gap: 8, paddingHorizontal: 20 },
  bleed: { marginHorizontal: -20 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18 },
  pressed: { opacity: 0.7 },
});
