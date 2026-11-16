import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openPaywall, openSignIn, useAppConfig, type LimitDetails } from '@/lib/access';

/**
 * Shown in place of a recipe's ingredients and steps when today's free recipes are used up: what
 * happened, when it opens again, and the two ways on (sign in for more when the user is a guest,
 * Premium for no limit). The photo and the title above it stay, so the user knows what is behind it.
 */
export function RecipeLock({ details }: { details: LimitDetails | null }) {
  const { colors } = useTheme();
  const { billing } = useAppConfig();
  const text = billing.paywall.placements.recipe_view ?? { title: 'Bugünlük tarif hakkın doldu', subtitle: 'Yarın yeniden açılır.' };
  const more = details?.sign_in_limit;
  const canSignIn = details?.tier === 'guest' && more != null && (more < 0 || more > details.limit);

  return (
    <View style={[styles.card, { backgroundColor: colors.peachSoft, borderColor: colors.peach }]}>
      <View style={[styles.well, { backgroundColor: colors.surface }]}>
        <Icon name="lock-closed-outline" size={22} color={colors.text} />
      </View>
      <Text variant="title2" align="center" accessibilityRole="header">
        {text.title}
      </Text>
      <Text variant="callout" color="textSecondary" align="center">
        {text.subtitle}
      </Text>
      {details ? (
        <Text variant="footnote" color="textTertiary" align="center">
          Bugün {details.limit} tarif açtın · Gece yarısı yenilenir
        </Text>
      ) : null}
      <View style={styles.actions}>
        <Button title="Premium’a geç" trailingIcon="arrow-forward" onPress={() => openPaywall('recipe_view', details)} />
        {canSignIn ? (
          <Button
            title={more! < 0 ? 'Giriş yap, sınırsız aç' : `Giriş yap, günde ${more} tarif aç`}
            variant="secondary"
            onPress={() => openSignIn('limit')}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, padding: 22, borderRadius: Radius.xl, borderWidth: StyleSheet.hairlineWidth },
  well: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  actions: { alignSelf: 'stretch', gap: 10, marginTop: 10 },
});
