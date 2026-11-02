import * as Haptics from 'expo-haptics';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';

import { CookJournalForm } from '@/components/journal/cook-journal-form';
import { clearDraft, hasUnsaved, saveDraft, useDraftKey, useJournalDraft } from '@/components/journal/draft';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { StickyFooter } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';
import { journalErrorText } from '@/lib/journal';
import type { RecipeEntry } from '@/lib/types';

/** The "done" mark: a solid accent circle with a check, set in a soft accent ring. */
export function DoneMark({ size = 88 }: { size?: number }) {
  const { colors } = useTheme();
  const ring = Math.round(size * 1.36);
  return (
    <View
      style={[styles.center, { width: ring, height: ring, borderRadius: ring / 2, backgroundColor: colors.accentSoft }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.accentStrong }]}>
        <Icon name="checkmark" size={Math.round(size * 0.5)} color={colors.onAccent} />
      </View>
    </View>
  );
}

/** A short, calm "well done" over the screen when a step is completed. Taps pass through. */
export function Celebration({ index, total }: { index: number; total: number }) {
  const { colors } = useTheme();
  const left = total - index;
  const title = left === 0 ? 'Son adım da tamam' : `Adım ${index} tamam`;
  const sub = left === 0 ? 'Tüm adımlar bitti' : left === 1 ? 'Bir adım kaldı' : `${left} adım kaldı`;
  return (
    <Animated.View
      entering={FadeIn.duration(140)}
      exiting={FadeOut.duration(200)}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title}, ${sub}`}
      style={[StyleSheet.absoluteFill, styles.celebrate, { backgroundColor: `${colors.surface}EB` }]}>
      <Animated.View entering={ZoomIn.duration(240).easing(Easing.out(Easing.cubic))}>
        <DoneMark size={96} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(80).duration(220)} style={styles.texts}>
        <Text variant="title" align="center">
          {title}
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          {sub}
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * The last page: the mark, a short thank-you, the numbers of this cook and "Nasıl oldu?" for the
 * cook journal. Actions live in the footer (`FinishedFooter`).
 */
export function FinishedSummary({
  entry,
  name,
  total,
  doneCount,
  minutes,
}: {
  /** The recipe that was cooked (for the cook journal). */
  entry?: RecipeEntry;
  name?: string;
  total: number;
  doneCount: number;
  minutes: number | null;
}) {
  const { colors } = useTheme();
  const all = doneCount === total;
  const stats = [
    { label: 'Adım', value: `${doneCount}/${total}` },
    ...(minutes != null ? [{ label: 'Süre', value: `${minutes} dk` }] : []),
  ];
  return (
    <View style={styles.finished}>
      <Animated.View entering={ZoomIn.duration(260).easing(Easing.out(Easing.cubic))}>
        <DoneMark size={88} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(120).duration(260)} style={styles.texts}>
        <Text variant="display" align="center" accessibilityRole="header">
          Afiyet olsun{name ? `, ${name}` : ''}
        </Text>
        <Text variant="body" color="textSecondary" align="center" style={styles.message}>
          {all ? 'Bütün adımları tamamladın. Ellerine sağlık.' : 'Ellerine sağlık. İşaretlemediğin adımlara yine göz atabilirsin.'}
        </Text>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(200).duration(260)} style={[styles.stats, { borderColor: colors.border }]}>
        {stats.map((s, i) => (
          <View
            key={s.label}
            accessible
            accessibilityLabel={`${s.label}: ${s.value}`}
            style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
            <Text variant="overline" color="textTertiary" align="center">
              {upperTr(s.label)}
            </Text>
            <Text variant="title" align="center" style={styles.tabular}>
              {s.value}
            </Text>
          </View>
        ))}
      </Animated.View>
      {entry ? (
        <Animated.View entering={FadeInDown.delay(280).duration(260)} style={styles.journal}>
          <CookJournalForm entry={entry} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * The finished page's footer, with one main action: "Günlüğe kaydet" once something is entered in
 * "Nasıl oldu?", otherwise "Tarife dön". Closing is never blocked: "Tarife dön" stays one tap away,
 * and a save already started finishes on its own.
 */
export function FinishedFooter({
  entry,
  onClose,
  onReview,
  onRestart,
}: {
  entry: RecipeEntry;
  onClose: () => void;
  /** "Adımlara göz at". */
  onReview: () => void;
  /** "Baştan pişir". */
  onRestart: () => void;
}) {
  const key = useDraftKey(entry.id);
  const draft = useJournalDraft(key);
  const unsaved = hasUnsaved(draft);

  const save = async () => {
    const log = await saveDraft(key, entry.id);
    Haptics.notificationAsync(log ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    if (log) AccessibilityInfo.announceForAccessibility('Günlüğe kaydedildi');
  };
  const restart = () => {
    if (draft.status === 'saved') clearDraft(key);
    onRestart();
  };

  return (
    <StickyFooter>
      {unsaved && draft.status === 'error' ? (
        <Text variant="footnote" color="danger" align="center" accessibilityLiveRegion="polite">
          {journalErrorText(draft.error)}
        </Text>
      ) : null}
      {unsaved ? (
        <Button title="Günlüğe kaydet" icon="checkmark" loading={draft.status === 'saving'} onPress={save} style={styles.main} />
      ) : (
        <Button title="Tarife dön" onPress={onClose} style={styles.main} />
      )}
      <View style={styles.row}>
        {unsaved ? (
          <Button title="Tarife dön" variant="secondary" size="md" onPress={onClose} style={styles.flex} />
        ) : (
          <Button title="Adımlara göz at" variant="secondary" size="md" onPress={onReview} style={styles.flex} />
        )}
        <Button title="Baştan pişir" variant="ghost" size="md" icon="refresh-outline" onPress={restart} style={styles.flex} />
      </View>
    </StickyFooter>
  );
}

const styles = StyleSheet.create({
  journal: { alignSelf: 'stretch', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  // Same height as the main button of the cooking steps.
  main: { minHeight: 56 },
  center: { alignItems: 'center', justifyContent: 'center' },
  celebrate: { alignItems: 'center', justifyContent: 'center', gap: 22, zIndex: 50 },
  texts: { alignItems: 'center', gap: 6, paddingHorizontal: 24 },
  finished: { alignItems: 'center', gap: 24, paddingTop: 12 },
  message: { maxWidth: 320 },
  stats: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  stat: { flex: 1, gap: 4, alignItems: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
});
