import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { translatedLine } from '@/lib/format';
import type { Recipe } from '@/lib/types';

/**
 * One quiet line under the title when the recipe was written from a video in another language:
 * "İngilizce videodan çevrildi · ölçüler Türk mutfağına uyarlandı". Nothing for Turkish recipes.
 */
export function TranslatedNote({ recipe, fromVideo }: { recipe: Recipe; fromVideo: boolean }) {
  const { colors } = useTheme();
  const line = translatedLine(recipe, fromVideo);
  if (!line) return null;
  return (
    <View style={styles.row} accessible accessibilityLabel={line}>
      <Icon name="language-outline" size={14} color={colors.textTertiary} style={styles.icon} />
      <Text variant="footnote" color="textSecondary" style={styles.text}>
        {line}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  icon: { marginTop: 1 },
  text: { flex: 1 },
});
