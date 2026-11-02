import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ScreenPadding, TouchSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { capitalize } from '@/lib/format';
import { shoppingAmount, type ShoppingItem } from '@/lib/kitchen';

/** "Menemen için", "Menemen ve 2 tarif daha için". */
function recipesLine(item: ShoppingItem): string | null {
  const [first, ...rest] = item.recipes;
  if (!first) return null;
  return rest.length ? `${first.title} ve ${rest.length} tarif daha için` : `${first.title} için`;
}

interface Props {
  item: ShoppingItem;
  onToggle: () => void;
  onRemove: () => void;
}

/**
 * One line of the shopping list: a big tick area (round box, name, amount and what it is for) and a
 * quiet remove button. Ticked items fade and are struck through but keep their place.
 */
export function ShoppingRow({ item, onToggle, onRemove }: Props) {
  const { colors } = useTheme();
  const name = capitalize(item.name);
  const detail = [shoppingAmount(item), recipesLine(item)].filter(Boolean).join(' · ');

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        accessibilityLabel={[name, detail].filter(Boolean).join(', ')}
        style={({ pressed }) => [styles.main, pressed && { backgroundColor: colors.surfaceMuted }]}>
        <View
          style={[
            styles.box,
            item.checked ? { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong } : { borderColor: colors.textTertiary },
          ]}>
          {item.checked ? <Icon name="checkmark" size={16} color={colors.onAccent} /> : null}
        </View>
        <View style={[styles.texts, item.checked && styles.done]}>
          <Text variant="headline" numberOfLines={2} style={item.checked && styles.strike}>
            {name}
          </Text>
          {detail ? (
            <Text variant="subhead" color="textSecondary" numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        onPress={onRemove}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`${name}, listeden çıkar`}
        style={({ pressed }) => [styles.remove, pressed && { backgroundColor: colors.surfaceMuted }]}>
        <Icon name="close" size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: ScreenPadding - 10 },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 64, paddingVertical: 12, paddingLeft: ScreenPadding, paddingRight: 8 },
  box: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  done: { opacity: 0.4 },
  strike: { textDecorationLine: 'line-through' },
  remove: { width: TouchSize, height: TouchSize, borderRadius: TouchSize / 2, alignItems: 'center', justifyContent: 'center' },
});
