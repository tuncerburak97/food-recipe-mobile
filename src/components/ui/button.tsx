import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { ButtonHeight, Radius, type ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * primary: the one main action of a screen (warm orange, white text).
 * dark: ink fill, for a strong second action next to photos or on cream.
 * secondary: quiet filled pill (sunken fill). outline: white with a hairline.
 * ghost: text only. danger: red text on the sunken fill.
 * `accent` is kept as an alias of primary for older call sites.
 */
type Variant = 'primary' | 'accent' | 'dark' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';

interface Props {
  title: string;
  onPress?: () => void;
  icon?: IconName;
  /** Small icon after the label (e.g. "arrow-forward"); null or omitted shows none. */
  trailingIcon?: IconName | null;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  /** Outer layout only (margins, flex, alignSelf). */
  style?: StyleProp<ViewStyle>;
}

function palette(variant: Variant, c: ThemeColors): { bg: string; fg: string; border: string } {
  switch (variant) {
    case 'primary':
    case 'accent':
      return { bg: c.accentStrong, fg: c.onAccent, border: c.accentStrong };
    case 'dark':
      return { bg: c.ink, fg: c.onInk, border: c.ink };
    case 'secondary':
      return { bg: c.surfaceMuted, fg: c.text, border: c.surfaceMuted };
    case 'outline':
      return { bg: c.surface, fg: c.text, border: c.border };
    case 'ghost':
      return { bg: 'transparent', fg: c.textSecondary, border: 'transparent' };
    case 'danger':
      return { bg: c.dangerSoft, fg: c.danger, border: c.dangerSoft };
  }
}

const HEIGHT: Record<Size, number> = { lg: ButtonHeight, md: 44, sm: 36 };

export function Button({
  title,
  onPress,
  icon,
  trailingIcon,
  variant = 'primary',
  size = 'lg',
  loading,
  disabled,
  accessibilityHint,
  style,
}: Props) {
  const { colors } = useTheme();
  const p = palette(variant, colors);
  const inactive = disabled || loading;
  const iconSize = size === 'sm' ? 15 : 18;

  return (
    <PressableScale
      haptic
      scaleTo={0.98}
      disabled={inactive}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.base,
        {
          minHeight: HEIGHT[size],
          paddingHorizontal: size === 'sm' ? 14 : size === 'md' ? 18 : 22,
          backgroundColor: p.bg,
          borderColor: p.border,
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={iconSize} color={p.fg} /> : null}
          <Text variant={size === 'sm' ? 'subhead' : 'headline'} weight={size === 'sm' ? '600' : undefined} tint={p.fg} numberOfLines={1} style={styles.label}>
            {title}
          </Text>
          {trailingIcon ? <Icon name={trailingIcon} size={iconSize - 1} color={p.fg} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { flexShrink: 1 },
});
