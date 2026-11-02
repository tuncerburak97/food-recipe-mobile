import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { capitalize, formatAmount, scaleIngredient, upperTr } from '@/lib/format';
import { ingredientNames, useIngredientCheck } from '@/lib/kitchen';
import type { Ingredient, IngredientGroup } from '@/lib/types';

interface Props {
  groups: IngredientGroup[];
  /** Multiplier from the servings stepper (2 = double the amounts). */
  factor?: number;
  /** false shows a read-only list (no tick boxes). */
  checkable?: boolean;
}

/**
 * Ingredients as a shopping / prep checklist, one bordered card per group. Each row: a round tick
 * box, the ingredient, and its amount right-aligned in a steady column so amounts scan straight
 * down. Tapping a row ticks it off and fades it. Ingredients in the user's pantry get a quiet
 * "evde" after their name (also in cook mode, so it stays small).
 */
export function IngredientChecklist({ groups, factor = 1, checkable = true }: Props) {
  const { colors } = useTheme();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const grouped = groups.length > 1 || groups[0]?.source !== 'default';
  const pantry = useIngredientCheck(ingredientNames(groups)).data;
  const atHome = (name: string) => !!pantry && pantry.pantryCount > 0 && pantry.byName[name]?.status === 'have';

  const toggle = (key: string) => {
    Haptics.selectionAsync();
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <View style={styles.wrap}>
      {groups.map((g) => {
        const done = g.ingredients.filter((_, i) => checked.has(`${g.id}-${i}`)).length;
        return (
          <View key={g.id} style={styles.group}>
            {grouped && (
              <View style={styles.heading}>
                <Text variant="overline" color="textTertiary" style={styles.flex}>
                  {upperTr(g.name)}
                </Text>
                {checkable && done > 0 ? (
                  <Text variant="footnote" color="textTertiary">
                    {done}/{g.ingredients.length}
                  </Text>
                ) : null}
              </View>
            )}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {g.ingredients.map((ing, i) => {
                const key = `${g.id}-${i}`;
                return (
                  <Row
                    key={key}
                    ingredient={scaleIngredient(ing, factor)}
                    first={i === 0}
                    checked={checked.has(key)}
                    atHome={atHome(ing.name)}
                    onPress={checkable ? () => toggle(key) : undefined}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

interface RowProps {
  ingredient: Ingredient;
  first: boolean;
  checked: boolean;
  /** In the user's pantry ("Dolabım"). */
  atHome?: boolean;
  onPress?: () => void;
}

function Row({ ingredient: ing, first, checked, atHome, onPress }: RowProps) {
  const { colors } = useTheme();
  const measured = ing.quantity != null;
  const amount = formatAmount(ing);
  const note = [ing.preparation, ing.notes, ing.optional ? 'isteğe bağlı' : null].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'checkbox' : 'text'}
      accessibilityState={onPress ? { checked } : undefined}
      accessibilityLabel={`${amount ? `${amount} ` : ''}${ing.name}${atHome ? ', evde' : ''}${note ? `, ${note}` : ''}`}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        pressed && onPress && { backgroundColor: colors.surfaceMuted },
      ]}>
      {onPress ? (
        <View
          style={[
            styles.box,
            checked ? { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong } : { borderColor: colors.textTertiary },
          ]}>
          {checked ? <Icon name="checkmark" size={14} color={colors.onAccent} /> : null}
        </View>
      ) : (
        <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
      )}
      <View style={[styles.text, checked && styles.done]}>
        <Text variant="callout" weight="600" style={checked && styles.strike}>
          {capitalize(ing.name)}
          {/* Inline, so rows do not grow when the pantry answer arrives. */}
          {atHome ? (
            <Text variant="footnote" weight="600" color="success">
              {'  evde'}
            </Text>
          ) : null}
        </Text>
        {note.length > 0 && (
          <Text variant="footnote" color="textTertiary" style={checked && styles.strike}>
            {note}
          </Text>
        )}
      </View>
      {amount ? (
        <Text
          variant="callout"
          weight={measured ? '700' : '500'}
          color={measured ? 'text' : 'textTertiary'}
          align="right"
          style={[styles.amount, checked && styles.done]}>
          {measured ? amount : amount.toLocaleLowerCase('tr-TR')}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 20 },
  group: { gap: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  flex: { flex: 1 },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56, paddingVertical: 12, paddingHorizontal: 16 },
  box: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 9 },
  text: { flex: 1, gap: 2 },
  amount: { maxWidth: '42%', fontVariant: ['tabular-nums'] },
  done: { opacity: 0.4 },
  strike: { textDecorationLine: 'line-through' },
});
