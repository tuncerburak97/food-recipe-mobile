import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { ChipWrap, Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { capitalize } from '@/lib/format';
import type { Recipe } from '@/lib/types';

/** Equipment ("Gerekenler") as quiet chips and the tips / missing details as a bulleted card. */
export function NotesCard({ recipe }: { recipe: Recipe }) {
  const { colors } = useTheme();
  const notes = [...recipe.tips, ...recipe.missing_information];
  if (recipe.estimated?.length) notes.push('≈ işaretli süre ve porsiyonlar videoda yazmadığı için tahminidir.');

  return (
    <View style={styles.wrap}>
      {recipe.equipment.length > 0 && (
        <View style={styles.section}>
          <Text variant="title3">Gerekenler</Text>
          <ChipWrap>
            {recipe.equipment.map((e) => (
              <Chip key={e} label={capitalize(e)} tone="sunken" size="sm" />
            ))}
          </ChipWrap>
        </View>
      )}
      {notes.length > 0 && (
        <Card icon="bulb-outline" title="Bilmen gerekenler">
          <View style={styles.list}>
            {notes.map((n) => (
              <View key={n} style={styles.item}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <Text variant="callout" style={styles.flex}>
                  {n}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 24 },
  section: { gap: 10 },
  list: { gap: 10 },
  item: { flexDirection: 'row', gap: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  flex: { flex: 1 },
});
