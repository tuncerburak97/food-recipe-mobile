import { StyleSheet, View } from 'react-native';

import { ListGroup } from '@/components/ui/list';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { capitalize, formatAmount } from '@/lib/format';
import type { Ingredient, IngredientGroup } from '@/lib/types';

/**
 * "Bu adımda": the ingredient group a step uses, as a grouped list. Larger than the recipe page's
 * list because it is read from arm's length: name on the left, amount right-aligned in bold.
 */
export function StepIngredients({ group }: { group: IngredientGroup }) {
  return (
    <ListGroup title={`Bu adımda · ${group.name}`}>
      {group.ingredients.map((ing, i) => (
        <Row key={i} ingredient={ing} first={i === 0} />
      ))}
    </ListGroup>
  );
}

function Row({ ingredient: ing, first }: { ingredient: Ingredient; first: boolean }) {
  const { colors } = useTheme();
  const measured = ing.quantity != null;
  const amount = formatAmount(ing);
  const note = [ing.preparation, ing.notes, ing.optional ? 'isteğe bağlı' : null].filter(Boolean).join(', ');

  return (
    <View
      accessible
      accessibilityLabel={`${amount ? `${amount} ` : ''}${ing.name}${note ? `, ${note}` : ''}`}
      style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      <View style={styles.texts}>
        <Text variant="title3">{capitalize(ing.name)}</Text>
        {note.length > 0 && (
          <Text variant="subhead" color="textTertiary">
            {note}
          </Text>
        )}
      </View>
      {amount ? (
        <Text
          variant="title3"
          weight={measured ? '700' : '500'}
          color={measured ? 'text' : 'textSecondary'}
          align="right"
          style={styles.amount}>
          {measured ? amount : amount.toLocaleLowerCase('tr-TR')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 12, paddingHorizontal: 16 },
  texts: { flex: 1, gap: 2 },
  amount: { maxWidth: '45%', fontVariant: ['tabular-nums'] },
});
