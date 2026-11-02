import { StyleSheet, View } from 'react-native';

import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { stepHints, videoClock } from '@/lib/format';
import { stepClip } from '@/lib/step-clip';
import type { Recipe } from '@/lib/types';

/**
 * The method as a numbered timeline: a round number on a thin line, the instruction, and its
 * time / temperature / heat as small tags. A step said in the reel also shows where ("Videoda 0:12");
 * cook mode plays that part of the video with the step.
 */
export function StepList({ recipe }: { recipe: Recipe }) {
  const { colors } = useTheme();
  const last = recipe.steps.length - 1;

  return (
    <View>
      {recipe.steps.map((s, i) => {
        const clip = stepClip(s);
        const hints = stepHints(recipe, s);
        const moment = clip ? `Videoda ${videoClock(clip.start)}` : null;
        const spoken = [...hints, ...(moment ? [moment] : [])];
        return (
          <View key={s.order} style={styles.step} accessible accessibilityLabel={`Adım ${s.order}. ${s.text}${spoken.length ? `. ${spoken.join(', ')}` : ''}`}>
            <View style={styles.rail}>
              <View style={[styles.num, { backgroundColor: colors.accentSoft }]}>
                <Text variant="subhead" weight="800" color="accentText">
                  {s.order}
                </Text>
              </View>
              {i < last && <View style={[styles.line, { backgroundColor: colors.border }]} />}
            </View>
            <View style={[styles.body, i < last && styles.bodySpaced]}>
              <Text variant="body">{s.text}</Text>
              {(hints.length > 0 || moment) && (
                <View style={styles.hints}>
                  {hints.map((h) => (
                    <Tag key={h} label={h} />
                  ))}
                  {moment && <Tag label={moment} />}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: 14 },
  rail: { alignItems: 'center', width: 32 },
  num: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, borderRadius: 1, marginVertical: 6 },
  body: { flex: 1, gap: 10, paddingTop: 4 },
  bodySpaced: { paddingBottom: 22 },
  hints: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
