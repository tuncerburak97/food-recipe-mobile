import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';
import { cookedLine, photoSource, ratingLabel, useJournalSummary } from '@/lib/journal';
import type { RecipeEntry } from '@/lib/types';

/**
 * Cook journal on the recipe page: how many times the user cooked it and their note for next time
 * ("tuzu az koy"). Renders nothing until the user has cooked it. Owned by the cook journal feature.
 */
export function JournalNote({ entry }: { entry: RecipeEntry }) {
  const { colors } = useTheme();
  const summary = useJournalSummary(entry.id).data;
  if (!summary || summary.count === 0 || !summary.lastCookedAt) return null;

  const line = cookedLine(summary.count, summary.lastCookedAt);
  const note = summary.lastNote;
  const verdict = ratingLabel(summary.lastRating);
  const photo = summary.photos[0];

  return (
    <Animated.View entering={FadeIn.duration(220)}>
      <Pressable
        onPress={() => router.push({ pathname: '/journal', params: { entryId: entry.id } })}
        accessibilityRole="button"
        accessibilityLabel={[note ? `Bir dahaki sefere: ${note}` : null, line, !note && verdict ? `Son seferinde: ${verdict}` : null].filter(Boolean).join('. ')}
        accessibilityHint="Bu tarifi pişirdiğin zamanları açar"
        style={({ pressed }) => [styles.card, { backgroundColor: colors.peachSoft, borderColor: colors.peach, opacity: pressed ? 0.85 : 1 }]}>
        {photo ? <Image source={photoSource(photo.url)} style={[styles.photo, { backgroundColor: colors.peach }]} contentFit="cover" transition={150} /> : null}
        <View style={styles.texts}>
          {note ? (
            <>
              <Text variant="overline" color="textTertiary">
                {upperTr('Bir dahaki sefere')}
              </Text>
              <Text variant="body" numberOfLines={4}>
                {note}
              </Text>
              <Text variant="footnote" color="textSecondary">
                {line}
              </Text>
            </>
          ) : (
            <>
              <Text variant="headline">{line}</Text>
              {verdict ? (
                <Text variant="footnote" color="textSecondary">
                  Son seferinde: {verdict}
                </Text>
              ) : null}
            </>
          )}
        </View>
        <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  photo: { width: 56, height: 56, borderRadius: Radius.md },
  texts: { flex: 1, gap: 3 },
});
