import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openPaywall, usePremium } from '@/lib/access';
import { useMe } from '@/lib/queries';

/**
 * A quiet line at the top of Home's sheet for free users: how many recipes are left today once
 * they run low, or (after a few days of use) an invitation to try Premium. Nothing for Premium
 * users, or when the server has limits switched off. When and what it says is set on the server.
 */
export function AccessStrip() {
  const { colors } = useTheme();
  const { config, on, premium, remaining } = usePremium();
  const me = useMe().data;
  // When this Home was opened; "days of use" only needs the day, not the second.
  const [now] = useState(() => Date.now());
  if (!on || premium) return null;

  const { nudges } = config.billing;
  const left = remaining('recipe_view');
  let title: string | null = null;
  let text = '';
  if (left != null && nudges.usage_meter_below > 0 && left <= nudges.usage_meter_below) {
    title = left === 0 ? 'Bugünlük tarif hakkın doldu' : `Bugün ${left} tarif hakkın kaldı`;
    text = 'Premium ile sınırsız aç';
  } else if (nudges.home_banner_after_days > 0 && nudges.home_banner_title && me?.createdAt) {
    const days = (now - new Date(me.createdAt).getTime()) / 86_400_000;
    if (days >= nudges.home_banner_after_days) {
      title = nudges.home_banner_title;
      text = nudges.home_banner_text;
    }
  }
  if (!title) return null;

  return (
    <Pressable
      onPress={() => openPaywall('home')}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${text}`}
      style={({ pressed }) => [styles.strip, { backgroundColor: colors.peachSoft, borderColor: colors.peach }, pressed && { opacity: 0.8 }]}>
      <View style={[styles.well, { backgroundColor: colors.surface }]}>
        <Icon name="sparkles-outline" size={17} color={colors.text} />
      </View>
      <View style={styles.texts}>
        <Text variant="headline" numberOfLines={1}>
          {title}
        </Text>
        {text ? (
          <Text variant="footnote" color="textSecondary" numberOfLines={1}>
            {text}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 12, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  well: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
});
