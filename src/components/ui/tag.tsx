import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'overlay';

/** A small static label ("Tarifin hazır", "Tamamlandı", "25 dk" on a photo). */
export function Tag({ label, icon, tone = 'neutral', style }: { label: string; icon?: IconName; tone?: Tone; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const look = {
    neutral: { bg: colors.surfaceMuted, fg: colors.textSecondary },
    accent: { bg: colors.accentSoft, fg: colors.accentText },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    overlay: { bg: 'rgba(20,18,16,0.62)', fg: '#FFFFFF' },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: look.bg }, style]}>
      {icon ? <Icon name={icon} size={12} color={look.fg} /> : null}
      <Text variant="caption" tint={look.fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    height: 24,
    paddingHorizontal: 9,
    borderRadius: Radius.pill,
  },
});
