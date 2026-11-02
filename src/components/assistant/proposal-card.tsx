import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import type { AssistantProposal } from '@/lib/types';

interface Props {
  proposal: AssistantProposal;
  state: 'pending' | 'applying' | 'applied' | 'dismissed';
  onApply: () => void;
  onDismiss: () => void;
  onOpen?: () => void;
}

/** The assistant's suggested change to the recipe, with "apply to my recipe" / "not now". */
export function ProposalCard({ proposal, state, onApply, onDismiss, onOpen }: Props) {
  const { colors } = useTheme();
  if (state === 'dismissed') return null;
  const applied = state === 'applied';

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.stretch}>
      <Card>
        <View style={styles.head}>
          <View style={[styles.well, { backgroundColor: applied ? colors.successSoft : colors.surfaceMuted }]}>
            <Icon name={applied ? 'checkmark' : 'create-outline'} size={18} color={applied ? colors.success : colors.text} />
          </View>
          <View style={styles.flex}>
            <Text variant="title3" accessibilityRole="header">
              {applied ? 'Tarifine uygulandı' : 'Tarifinde değişecekler'}
            </Text>
            {!applied ? (
              <Text variant="subhead" color="textSecondary">
                Onaylarsan tarifinin sana özel sürümü kaydedilir.
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.changes, { borderTopColor: colors.border }]}>
          {proposal.changes.map((c) => (
            <View key={c} style={styles.change}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <Text variant="callout" style={styles.flex}>
                {c}
              </Text>
            </View>
          ))}
        </View>

        {applied ? (
          <>
            <Text variant="subhead" color="textSecondary">
              Bu sürüm sadece senin tarif defterinde. İstediğin zaman orijinaline dönebilirsin.
            </Text>
            {onOpen ? <Button title="Tarifimi aç" variant="dark" icon="book-outline" onPress={onOpen} /> : null}
          </>
        ) : (
          <View style={styles.actions}>
            <Button title="Tarifime uygula" icon="checkmark" loading={state === 'applying'} onPress={onApply} />
            <Button title="Şimdilik değil" variant="ghost" size="md" disabled={state === 'applying'} onPress={onDismiss} />
          </View>
        )}
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stretch: { alignSelf: 'stretch' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  well: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  changes: { gap: 10, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  change: { flexDirection: 'row', gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  actions: { gap: 4 },
});
