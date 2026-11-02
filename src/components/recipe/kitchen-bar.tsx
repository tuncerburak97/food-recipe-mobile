import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { capitalize, scaleIngredient } from '@/lib/format';
import { ingredientNames, shoppingItems, useAddShopping, useIngredientCheck, useShopping, type ShoppingAdd } from '@/lib/kitchen';
import type { Ingredient, RecipeEntry } from '@/lib/types';
import { showToast } from '@/store/toast';

/** The amount to buy: the upper end of a range ("2–3" -> 3), scaled to the chosen servings. */
function toShoppingItem(ing: Ingredient, factor: number, entryId: number): ShoppingAdd {
  const scaled = scaleIngredient(ing, factor);
  return { name: ing.name, quantity: scaled.quantity_max ?? scaled.quantity, unit: scaled.unit, entry_id: entryId };
}

/**
 * Below the ingredient list: what is missing from the user's pantry and a button that puts it on
 * the shopping list. Owned by the pantry and shopping list feature.
 *
 * "3 malzeme eksik: krema, dereotu, limon" + "Eksikleri listeye ekle"; "Hepsi dolabında" when
 * nothing is missing; without a pantry, an invitation to fill it (and to list everything instead).
 */
export function KitchenBar({ entry, factor }: { entry: RecipeEntry; factor: number }) {
  const { colors } = useTheme();
  const groups = entry.recipe.ingredient_groups;
  const names = ingredientNames(groups);
  const check = useIngredientCheck(names);
  const shopping = useShopping();
  const add = useAddShopping();

  if (names.length === 0) return null;
  if (!check.data) {
    if (check.isError) {
      return (
        <View style={[styles.card, { borderColor: colors.border }]}>
          <Text variant="subhead" color="textSecondary" style={styles.flex}>
            Dolabın kontrol edilemedi
          </Text>
          <Button title="Tekrar dene" variant="ghost" size="sm" onPress={() => void check.refetch()} />
        </View>
      );
    }
    return (
      <SkeletonPulse>
        <SkeletonBlock height={76} radius={Radius.lg} />
      </SkeletonPulse>
    );
  }

  const { pantryCount, byName } = check.data;
  const all = groups.flatMap((g) => g.ingredients).filter((i) => i.name.trim());
  const required = all.filter((i) => !i.optional && !i.to_taste);
  const status = (i: Ingredient) => byName[i.name]?.status ?? 'missing';
  const missing = pantryCount > 0 ? required.filter((i) => status(i) === 'missing') : required.filter((i) => status(i) !== 'staple');
  // One name per ingredient key ("un" in two groups is one thing to buy).
  const missingNames: string[] = [];
  const missingKeys = new Set<string>();
  for (const i of missing) {
    const key = byName[i.name]?.key ?? i.name;
    if (!missingKeys.has(key)) {
      missingKeys.add(key);
      missingNames.push(i.name);
    }
  }
  const listed = new Set(shoppingItems(shopping.data).map((i) => i.key));
  const onList = missingKeys.size > 0 && [...missingKeys].every((k) => listed.has(k));

  const addMissing = () => {
    const entryId = Number(entry.id);
    add.mutate(
      { items: missing.map((i) => toShoppingItem(i, factor, entryId)) },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast({
            title: missingKeys.size === 1 ? `${capitalize(missingNames[0])} listene eklendi` : `${missingKeys.size} malzeme listene eklendi`,
            action: { label: 'Listeyi aç', onPress: () => router.push('/shopping') },
          });
        },
        onError: (e) => showToast({ title: describeError(e).title, message: describeError(e).message }),
      },
    );
  };
  const openList = () => router.push('/shopping');

  if (pantryCount === 0) {
    return (
      <View style={[styles.card, styles.column, { borderColor: colors.border }]}>
        <View style={styles.texts}>
          <Text variant="headline">Evde neler var?</Text>
          <Text variant="subhead" color="textSecondary">
            Dolabına bir kez ekle, her tarifte neyin eksik olduğunu gösterelim.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button title="Dolabımı doldur" variant="secondary" size="md" onPress={() => router.push('/pantry')} />
          {missingKeys.size > 0 ? (
            onList ? (
              <Button title="Listeyi aç" variant="ghost" size="md" onPress={openList} />
            ) : (
              <Button title="Hepsini listeye ekle" variant="ghost" size="md" loading={add.isPending} onPress={addMissing} />
            )
          ) : null}
        </View>
      </View>
    );
  }

  if (missingKeys.size === 0) {
    return (
      <View style={[styles.card, { borderColor: colors.border }]}>
        <View style={[styles.well, { backgroundColor: colors.successSoft }]}>
          <Icon name="checkmark" size={18} color={colors.success} />
        </View>
        <View style={[styles.texts, styles.flex]}>
          <Text variant="headline">Hepsi dolabında</Text>
          <Text variant="subhead" color="textSecondary">
            Bu tarif için eksik malzemen yok.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.column, { borderColor: colors.border }]}>
      <View style={styles.texts}>
        <Text variant="headline">{missingKeys.size} malzeme eksik</Text>
        <Text variant="subhead" color="textSecondary">
          {missingNames.join(', ')}
        </Text>
      </View>
      {onList ? (
        <View style={styles.listed}>
          <Icon name="checkmark-circle" size={16} color={colors.success} />
          <Text variant="subhead" color="textSecondary" style={styles.flex}>
            Eksikler alışveriş listende
          </Text>
          <Button title="Listeyi aç" variant="outline" size="sm" onPress={openList} />
        </View>
      ) : (
        <Button title="Eksikleri listeye ekle" icon="cart-outline" variant="secondary" size="md" loading={add.isPending} onPress={addMissing} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  column: { flexDirection: 'column', alignItems: 'stretch', gap: 14 },
  flex: { flex: 1 },
  texts: { gap: 2 },
  well: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  listed: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 },
});
