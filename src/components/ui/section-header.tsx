import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  title: string;
  subtitle?: string;
  /** A "Tümü ›" style link on the right. */
  action?: { label: string; onPress: () => void };
}

/** Title of a content section, with an optional link to see everything. */
export function SectionHeader({ title, subtitle, action }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text variant="title2" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subhead" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`${title}: ${action.label}`}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text variant="subhead" weight="700" color="accentText">
            {action.label}
          </Text>
          <Icon name="chevron-forward" size={14} color={colors.accentText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  flex: { flex: 1, gap: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 28 },
  pressed: { opacity: 0.6 },
});
