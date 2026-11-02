import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export type StageState = 'todo' | 'active' | 'done' | 'failed';

export interface Stage {
  label: string;
  hint?: string;
  state: StageState;
}

const MARK = 28;

/**
 * What happens to the recording, as a short vertical timeline: done stages get a check, the one in
 * progress a spinner, a failed one a red mark. Read out as one line per stage.
 */
export function VoiceStages({ stages }: { stages: Stage[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.list}>
      {stages.map((s, i) => (
        <View
          key={s.label}
          style={styles.row}
          accessible
          accessibilityLabel={`${s.label}: ${{ todo: 'sırada', active: 'şimdi', done: 'tamam', failed: 'olmadı' }[s.state]}`}>
          <View style={styles.markColumn}>
            <Mark index={i} state={s.state} />
            {i < stages.length - 1 ? (
              <View style={[styles.line, { backgroundColor: s.state === 'done' ? colors.accent : colors.border }]} />
            ) : null}
          </View>
          <View style={styles.texts}>
            <Text variant="headline" color={s.state === 'todo' ? 'textTertiary' : s.state === 'failed' ? 'danger' : 'text'}>
              {s.label}
            </Text>
            {s.hint && s.state === 'active' ? (
              <Animated.View entering={FadeIn.duration(240)}>
                <Text variant="subhead" color="textSecondary">
                  {s.hint}
                </Text>
              </Animated.View>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

function Mark({ index, state }: { index: number; state: StageState }) {
  const { colors } = useTheme();
  switch (state) {
    case 'done':
      return (
        <View style={[styles.mark, { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong }]}>
          <Icon name="checkmark" size={15} color={colors.onAccent} />
        </View>
      );
    case 'active':
      return (
        <View style={[styles.mark, { backgroundColor: colors.surface, borderColor: colors.accentStrong }]}>
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      );
    case 'failed':
      return (
        <View style={[styles.mark, { backgroundColor: colors.dangerSoft, borderColor: colors.dangerSoft }]}>
          <Icon name="alert" size={15} color={colors.danger} />
        </View>
      );
    default:
      return (
        <View style={[styles.mark, { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted }]}>
          <Text variant="footnote" weight="700" color="textTertiary" style={styles.number}>
            {index + 1}
          </Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  list: { gap: 0 },
  row: { flexDirection: 'row', gap: 14, minHeight: 64 },
  markColumn: { alignItems: 'center', width: MARK },
  mark: { width: MARK, height: MARK, borderRadius: MARK / 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, borderRadius: 1, marginVertical: 4 },
  texts: { flex: 1, gap: 2, paddingTop: 3, paddingBottom: 18 },
  number: { fontVariant: ['tabular-nums'] },
});
