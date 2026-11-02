import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { RecipeCard } from '@/components/recipe/recipe-card';
import { ListGroup, ListRow } from '@/components/ui/list';
import { SectionHeader } from '@/components/ui/section-header';
import { ScreenPadding } from '@/constants/theme';
import { refreshKitchenMatches, useKitchenSuggestions, usePantry, useShopping } from '@/lib/kitchen';
import { useMe } from '@/lib/queries';

const RAIL_CARD = 156;

/**
 * Home: what the user can cook now with their pantry, and the shortcuts to "Dolabım" and the
 * shopping list. Owned by the pantry and shopping list feature.
 *
 * With a pantry: a "Bu akşam yapabileceklerin" rail (recipes with at most one missing ingredient,
 * their own first) and two compact rows. Without one: a single row that invites them to fill it.
 */
export function KitchenShortcuts() {
  const client = useQueryClient();
  const me = useMe().data;
  const pantry = usePantry();
  const shopping = useShopping();
  const suggestions = useKitchenSuggestions();

  // Saving or removing a recipe changes what can be cooked.
  const recipeCount = me?.recipeCount;
  const lastCount = useRef(recipeCount);
  useEffect(() => {
    if (lastCount.current !== undefined && recipeCount !== lastCount.current) refreshKitchenMatches(client);
    lastCount.current = recipeCount;
  }, [recipeCount, client]);

  const pantryCount = pantry.data?.count ?? 0;
  // Nothing until the pantry (and what it can cook) is known, so Home does not jump between layouts.
  if (pantry.isPending || (pantryCount > 0 && suggestions.isPending)) return null;

  const shoppingLeft = shopping.data ? shopping.data.count - shopping.data.checked : 0;
  const openPantry = () => router.push('/pantry');
  const openShopping = () => router.push('/shopping');

  if (pantry.data && pantryCount === 0) {
    return (
      <ListGroup>
        <ListRow
          first
          icon="file-tray-stacked-outline"
          title="Dolabını oluştur"
          subtitle="Evde olanları ekle, bu akşam ne yapabileceğini gösterelim"
          onPress={openPantry}
        />
        {shoppingLeft > 0 ? <ListRow icon="cart-outline" title="Alışveriş listesi" value={`${shoppingLeft} ürün`} onPress={openShopping} /> : null}
      </ListGroup>
    );
  }

  const items = suggestions.data?.items ?? [];
  return (
    <View style={styles.wrap}>
      {items.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Bu akşam yapabileceklerin" subtitle="Dolabındakilerle, en fazla bir eksikle" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.rail}>
            {items.map((s) => (
              <RecipeCard key={s.entry.id} entry={s.entry} width={RAIL_CARD} mine={s.saved} />
            ))}
          </ScrollView>
        </View>
      ) : null}
      <ListGroup>
        <ListRow
          first
          icon="file-tray-stacked-outline"
          title="Dolabım"
          value={pantry.data ? `${pantryCount} malzeme` : undefined}
          onPress={openPantry}
        />
        <ListRow
          icon="cart-outline"
          title="Alışveriş listesi"
          value={shopping.data ? (shoppingLeft > 0 ? `${shoppingLeft} ürün` : 'Boş') : undefined}
          onPress={openShopping}
        />
      </ListGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 20 },
  section: { gap: 14 },
  bleed: { marginHorizontal: -ScreenPadding },
  rail: { paddingHorizontal: ScreenPadding, gap: 14 },
});
