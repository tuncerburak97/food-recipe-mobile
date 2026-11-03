import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const AVATAR_SIZE = 32;
/** Space the avatar takes on the left of assistant messages; follow-ups line up with it. */
export const AVATAR_INDENT = AVATAR_SIZE + 10;

/** The assistant's face: the AI chef. */
export function AssistantAvatar({ size = AVATAR_SIZE }: { size?: number }) {
  return <ChefAvatar size={size} style={styles.avatar} />;
}

interface Props {
  role: 'user' | 'assistant';
  text: string;
  error?: boolean;
  /** Extra content under an assistant message (proposal card, retry button). */
  children?: ReactNode;
}

/**
 * One message. The user's are ink bubbles on the right; the assistant's are white with a hairline
 * on the left, after its mark. Lines starting with "•" are laid out as a list with a hanging indent.
 */
export function ChatBubble({ role, text, error, children }: Props) {
  const { colors } = useTheme();
  const mine = role === 'user';
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  const tint = mine ? colors.onInk : error ? colors.danger : colors.text;

  return (
    <Animated.View entering={FadeInUp.duration(220)} style={[styles.row, mine ? styles.right : styles.left]}>
      {!mine ? <AssistantAvatar /> : null}
      <View style={[styles.col, mine && styles.colRight]}>
        <View
          accessible
          accessibilityLabel={`${mine ? 'Sen' : 'Asistan'}: ${text}`}
          style={[
            styles.bubble,
            mine
              ? [styles.mine, { backgroundColor: colors.ink }]
              : [styles.theirs, { backgroundColor: error ? colors.dangerSoft : colors.surface, borderColor: error ? colors.dangerSoft : colors.border }],
          ]}>
          {lines.map((line, i) => {
            const bullet = line.trimStart().startsWith('•');
            const content = bullet ? line.trimStart().slice(1).trim() : line;
            return bullet ? (
              <View key={i} style={styles.bulletRow}>
                <View style={[styles.dot, { backgroundColor: mine ? colors.onInk : colors.accent }]} />
                <Text variant="body" tint={tint} style={styles.flex}>
                  {content}
                </Text>
              </View>
            ) : (
              <Text key={i} variant="body" tint={tint}>
                {content}
              </Text>
            );
          })}
        </View>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  left: { justifyContent: 'flex-start', paddingRight: 12 },
  right: { justifyContent: 'flex-end', paddingLeft: 52 },
  avatar: { marginTop: 2 },
  col: { flexShrink: 1, gap: 10 },
  colRight: { alignItems: 'flex-end' },
  bubble: { borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 11, gap: 6 },
  mine: { borderBottomRightRadius: 6 },
  theirs: { borderTopLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth },
  bulletRow: { flexDirection: 'row', gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 9 },
  flex: { flex: 1 },
});
