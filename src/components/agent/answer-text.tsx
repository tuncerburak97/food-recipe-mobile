import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

/** "**bold**" spans of one line. */
function Spans({ line }: { line: string }) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} variant="body" weight="600">
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </>
  );
}

/**
 * The assistant's words, without a bubble: plain reading text on the sheet. Handles the little
 * formatting the model uses: **bold**, line breaks and "-" / "•" lists.
 */
export function AnswerText({ text }: { text: string }) {
  const { colors } = useTheme();
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return (
    <View style={styles.box}>
      {lines.map((raw, i) => {
        const bullet = /^\s*([-•*]|\d+\.)\s+/.exec(raw);
        if (bullet) {
          return (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <Text variant="body" style={styles.flex}>
                <Spans line={raw.slice(bullet[0].length)} />
              </Text>
            </View>
          );
        }
        return (
          <Text key={i} variant="body">
            <Spans line={raw} />
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 6 },
  bulletRow: { flexDirection: 'row', gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 9 },
  flex: { flex: 1 },
});
