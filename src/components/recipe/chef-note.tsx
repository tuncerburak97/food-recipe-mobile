import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { useStartGeneration } from '@/lib/queries';
import type { Generation } from '@/lib/types';
import { showToast } from '@/store/toast';

/**
 * "Sana özel": why this recipe suits the user, a per-serving nutrition strip, what it uses from
 * their kitchen and what it adds. "Başka bir tarif öner" asks again in the background.
 */
export function ChefNote({ generation, title, mine }: { generation: Generation; title: string; mine: boolean }) {
  const { colors } = useTheme();
  const start = useStartGeneration();

  const another = () => {
    const req = generation.request;
    start.mutate(
      { ...req, avoid_titles: [...(req.avoid_titles ?? []), title].slice(-10) },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast({ title: 'Yeni tarif hazırlanıyor', message: 'Hazır olunca haber vereceğiz.' });
        },
        onError: (e) => showToast({ title: describeError(e).title, message: describeError(e).message }),
      },
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.peachSoft, borderColor: colors.peach }]}>
      <View style={styles.head}>
        <View style={[styles.well, { backgroundColor: colors.surface }]}>
          <Icon name="sparkles-outline" size={17} color={colors.text} />
        </View>
        <Text variant="title3" style={styles.flex}>
          Sana özel hazırlandı
        </Text>
      </View>
      {generation.personal_note ? <Text variant="body">{generation.personal_note}</Text> : null}

      {generation.fit_reasons.length > 0 && (
        <View style={styles.reasons}>
          {generation.fit_reasons.map((r) => (
            <View key={r} style={styles.reason}>
              <Icon name="checkmark-circle" size={18} color={colors.success} />
              <Text variant="callout" style={styles.flex}>
                {r}
              </Text>
            </View>
          ))}
        </View>
      )}

      {generation.nutrition && <Nutrition values={generation.nutrition} />}

      <View style={[styles.lines, { backgroundColor: colors.surface, borderColor: colors.peach }]}>
        {generation.used_ingredients.length > 0 && <Line label="Elindekilerden" value={generation.used_ingredients.join(', ')} />}
        <Line
          label="Ek olarak"
          value={generation.extra_ingredients.length ? generation.extra_ingredients.join(', ') : 'Gerekmiyor, elindekiler yetiyor'}
          divider={generation.used_ingredients.length > 0}
        />
      </View>

      {mine && <Button title="Başka bir tarif öner" icon="refresh" variant="outline" size="md" loading={start.isPending} onPress={another} />}
    </View>
  );
}

/** Per-serving estimate in four columns: kcal, protein, carbs, fat. */
function Nutrition({ values }: { values: NonNullable<Generation['nutrition']> }) {
  const { colors } = useTheme();
  const cells = [
    { label: 'Kalori', value: `${values.calories}`, unit: 'kcal' },
    { label: 'Protein', value: `${values.protein_g}`, unit: 'g' },
    { label: 'Karb.', value: `${values.carbs_g}`, unit: 'g' },
    { label: 'Yağ', value: `${values.fat_g}`, unit: 'g' },
  ];
  return (
    <View style={styles.nutrition}>
      <Text variant="footnote" color="textSecondary">
        Porsiyon başına, yaklaşık
      </Text>
      <View style={[styles.cells, { backgroundColor: colors.surface, borderColor: colors.peach }]}>
        {cells.map((c, i) => (
          <View
            key={c.label}
            accessible
            accessibilityLabel={`${c.label} ${c.value} ${c.unit}`}
            style={[styles.cell, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
            <Text variant="caption" color="textTertiary">
              {c.label}
            </Text>
            <Text variant="title3">
              {c.value}
              <Text variant="footnote" color="textSecondary">
                {' '}
                {c.unit}
              </Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Line({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.line, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      <Text variant="footnote" weight="700" color="textSecondary">
        {label}
      </Text>
      <Text variant="callout">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 16, padding: 18, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  well: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  reasons: { gap: 8 },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  nutrition: { gap: 8 },
  cells: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingVertical: 12 },
  cell: { flex: 1, gap: 2, paddingHorizontal: 10 },
  lines: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, paddingHorizontal: 14 },
  line: { gap: 2, paddingVertical: 12 },
});
