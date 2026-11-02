import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TouchSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Round icon-only control.
 * - surface: white circle with a hairline (on the cream page).
 * - muted: sunken fill (on white sheets and cards).
 * - overlay: white circle with a soft shadow, for use over photos and video.
 * - accent: filled orange (a small main action, e.g. "add").
 */
type Tone = 'surface' | 'muted' | 'overlay' | 'accent';

interface Props {
  icon: IconName;
  /** Required: icon-only controls need a spoken label. */
  label: string;
  onPress: () => void;
  tone?: Tone;
  size?: number;
  disabled?: boolean;
  busy?: boolean;
  /** Small count in the corner (e.g. unseen notifications). */
  badge?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, label, onPress, tone = 'surface', size = TouchSize - 4, disabled, busy, badge, style }: Props) {
  const { colors } = useTheme();
  const look = {
    surface: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
    muted: { backgroundColor: colors.surfaceMuted },
    overlay: { backgroundColor: colors.surface, boxShadow: '0 2px 10px rgba(0,0,0,0.16)' },
    accent: { backgroundColor: colors.accentStrong },
  }[tone];
  const fg = tone === 'accent' ? colors.onAccent : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} yeni` : label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, borderRadius: size / 2, opacity: disabled ? 0.35 : pressed ? 0.7 : 1 },
        look,
        style,
      ]}>
      {busy ? <ActivityIndicator size="small" color={fg} /> : <Icon name={icon} size={Math.round(size * 0.42)} color={fg} />}
      {badge != null && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.accentStrong, borderColor: colors.background }]}>
          <Text variant="caption" tint={colors.onAccent} style={styles.badgeText}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
