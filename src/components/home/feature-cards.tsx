import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * The app's two main jobs side by side, equally easy to find: cook from what you have (the orange
 * tile) and turn an Instagram video into a recipe.
 */
export function FeatureCards() {
  return (
    <View style={styles.row}>
      <FeatureCard
        filled
        icon="basket-outline"
        title="Elimde ne var?"
        text="Malzemeleri seç, sana uygun tarif hazırlansın"
        onPress={() => router.push('/chef')}
      />
      <FeatureCard
        icon="logo-instagram"
        title="Videodan tarif"
        text="Reels linkini yapıştır, adım adım tarif olsun"
        onPress={() => router.push('/add')}
      />
    </View>
  );
}

interface CardProps {
  filled?: boolean;
  icon: IconName;
  title: string;
  text: string;
  onPress: () => void;
}

function FeatureCard({ filled, icon, title, text, onPress }: CardProps) {
  const { colors } = useTheme();
  const fg = filled ? colors.onAccent : colors.text;
  return (
    <PressableScale
      haptic
      scaleTo={0.98}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${text}`}
      style={[
        styles.card,
        filled
          ? { backgroundColor: colors.accentStrong }
          : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
      ]}>
      <View style={styles.top}>
        <View style={[styles.well, !filled && { backgroundColor: colors.surfaceMuted }]}>
          {/* On the filled card the well is a faint wash of the text color, so it reads on blue and on the light dark-mode pill. */}
          {filled ? <View style={[StyleSheet.absoluteFill, styles.wash, { backgroundColor: fg }]} /> : null}
          <Icon name={icon} size={20} color={fg} />
        </View>
        <Icon name="arrow-forward" size={18} color={filled ? colors.onAccent : colors.textTertiary} />
      </View>
      <View style={styles.text}>
        <Text variant="title3" tint={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {title}
        </Text>
        <Text variant="footnote" tint={fg} style={filled ? styles.soft : { color: colors.textSecondary }} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, minHeight: 150, padding: 16, borderRadius: Radius.xl, justifyContent: 'space-between', gap: 18 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  well: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  wash: { opacity: 0.16 },
  text: { gap: 4 },
  soft: { opacity: 0.88 },
});
