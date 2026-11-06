import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CAPABILITIES, type GuideKind } from '@/lib/agent/capabilities';

/** The empty chat: what the assistant can do, three small tiles per row (icon and name). */
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
            <Icon name={c.icon} size={16} color={colors.accentText} />
          </View>
          <Text variant="subhead" numberOfLines={1}>
            {c.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The same choices as pills that wrap onto lines, all in view (above the keyboard, by the message box). */
export function CapabilityStrip({ onPick }: { onPick: (kind: GuideKind) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.pills}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { flexBasis: '30%', flexGrow: 1, alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 6, borderRadius: Radius.md },
  well: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18 },
  pressed: { opacity: 0.7 },
});
