import { router } from 'expo-router';

import { ListGroup, ListRow } from '@/components/ui/list';
import { usePantry, useShopping } from '@/lib/kitchen';

/** "Mutfağım" in the Profil tab: the ways into "Dolabım" and the shopping list, with their counts. */
export function KitchenListGroup() {
  const pantry = usePantry().data;
  const shopping = useShopping().data;
  const left = shopping ? shopping.count - shopping.checked : 0;
  return (
    <ListGroup title="Mutfağım">
      <ListRow
        first
        icon="file-tray-stacked-outline"
        title="Dolabım"
        subtitle="Evde olan malzemeler"
        value={pantry ? `${pantry.count} malzeme` : undefined}
        onPress={() => router.push('/pantry')}
      />
      <ListRow
        icon="cart-outline"
        title="Alışveriş listesi"
        subtitle="Tariflerde eksik olanlar"
        value={shopping ? (left > 0 ? `${left} ürün` : 'Boş') : undefined}
        onPress={() => router.push('/shopping')}
      />
    </ListGroup>
  );
}
