import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

const STEPS = [
  'Instagram’da ya da YouTube’da yemek videosunu aç.',
  'Videonun altındaki uçak (Paylaş) simgesine dokun.',
  '“Bağlantıyı kopyala”ya dokun ve buraya dön.',
];

/** "Link nasıl kopyalanır?": three numbered steps and the share-sheet shortcut. */
export function LinkGuide() {
  const { colors } = useTheme();
  return (
    <Card title="Link nasıl kopyalanır?">
      <View style={styles.steps}>
        {STEPS.map((text, i) => (
          <View key={text} style={styles.row} accessible accessibilityLabel={`${i + 1}. ${text}`}>
            <View style={[styles.number, { backgroundColor: colors.surfaceMuted }]}>
              <Text variant="subhead" weight="700" style={styles.numeral}>
                {i + 1}
              </Text>
            </View>
            <Text variant="callout" style={styles.flex}>
              {text}
            </Text>
          </View>
        ))}
      </View>
      <View style={[styles.tip, { borderTopColor: colors.border }]}>
        <Icon name="share-outline" size={16} color={colors.textSecondary} style={styles.tipIcon} />
        <Text variant="subhead" color="textSecondary" style={styles.flex}>
          Daha kısası: Instagram’da ya da YouTube’da Paylaş menüsünden “Tarif Defteri”ni seçersen link kendiliğinden gelir.
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  steps: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  number: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  numeral: { fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  tipIcon: { marginTop: 1 },
});
