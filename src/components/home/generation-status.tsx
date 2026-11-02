import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list';
import { useTheme } from '@/hooks/use-theme';
import type { GenerationJob } from '@/lib/types';

/**
 * A slim row on Home about background recipes: "hazırlanıyor" while one is pending, "hazır" when a
 * finished one has not been opened yet. Nothing otherwise.
 */
export function GenerationStatus({ jobs }: { jobs: GenerationJob[] }) {
  const { colors } = useTheme();
  const pending = jobs.filter((j) => j.status === 'pending');
  const ready = jobs.find((j) => j.status === 'done' && !j.seen && j.entry_id);
  if (!pending.length && !ready) return null;

  const isReady = !!ready && !pending.length;
  const open = () => (isReady ? router.push(`/recipe/${ready.entry_id}`) : router.push('/inbox'));
  return (
    <ListGroup>
      <ListRow
        first
        leading={
          <View style={[styles.well, { backgroundColor: isReady ? colors.successSoft : colors.surfaceMuted }]}>
            {isReady ? <Icon name="checkmark" size={18} color={colors.success} /> : <ActivityIndicator size="small" color={colors.textSecondary} />}
          </View>
        }
        title={pending.length ? (pending.length > 1 ? `${pending.length} tarif hazırlanıyor` : 'Tarifin hazırlanıyor') : 'Tarifin hazır'}
        subtitle={pending.length ? 'Hazır olunca haber vereceğiz' : (ready?.title ?? undefined)}
        subtitleLines={1}
        onPress={open}
      />
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  well: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
