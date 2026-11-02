import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, ZoomIn } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';

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

/** The last page: the mark, a short thank-you and the numbers of this cook. Actions live in the footer. */
export function FinishedSummary({ name, total, doneCount, minutes }: { name?: string; total: number; doneCount: number; minutes: number | null }) {
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
    </View>
  );
}

const styles = StyleSheet.create({
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
