import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Diameter of a stop. */
const DOT = 32;
/** Width of one stop including its share of the line; the tap target. */
const ITEM = 52;
const HEIGHT = 48;
const LINE = 2;

interface Props {
  /** Step orders, in order. */
  steps: number[];
  done: number[];
  /** 0 = preparation, 1..n = steps, n+1 = finished. */
  page: number;
  onOpen: (page: number) => void;
}

/**
 * The road through the recipe: a compact "Adım 3/8 · 2 tamamlandı" line, then one stop for the
 * preparation and one per step on a single progress line. The line fills up to where the cook is;
 * done stops are filled with a check, the current one has an accent ring. Every stop can be tapped.
 */
export function StepRail({ steps, done, page, onOpen }: Props) {
  const { colors } = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const total = steps.length;

  useEffect(() => {
    // Keep the current stop in view on long recipes (two stops of context on its left).
    scroll.current?.scrollTo({ x: Math.max(0, (page - 2) * ITEM), animated: true });
  }, [page]);

  const where = page === 0 ? 'Hazırlık' : page > total ? 'Bitti' : `Adım ${page}/${total}`;
  const detail = page === 0 ? `${total} adım` : page > total ? `${done.length}/${total} adım tamamlandı` : `${done.length} tamamlandı`;

  return (
    <View style={[styles.wrap, { borderBottomColor: colors.border }]}>
      <Text variant="subhead" weight="700" style={styles.head} accessibilityRole="header">
        {where}
        <Text variant="subhead" color="textSecondary">
          {` · ${detail}`}
        </Text>
      </Text>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.row}>
        <Stop
          label="Hazırlık"
          icon="basket-outline"
          current={page === 0}
          done={page > 0}
          lineIn={null}
          lineOut={total > 0 ? page >= 1 : null}
          onPress={() => onOpen(0)}
        />
        {steps.map((order, i) => {
          const at = i + 1;
          return (
            <Stop
              key={order}
              label={`Adım ${at}`}
              number={at}
              current={page === at}
              done={done.includes(order)}
              lineIn={page >= at}
              lineOut={at < total ? page >= at + 1 : null}
              onPress={() => onOpen(at)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

function Stop({
  label,
  number,
  icon,
  current,
  done,
  lineIn,
  lineOut,
  onPress,
}: {
  label: string;
  number?: number;
  icon?: IconName;
  current: boolean;
  done: boolean;
  /** Line on the left: true = reached (filled), false = ahead, null = none (first stop). */
  lineIn: boolean | null;
  /** Line on the right, same meaning (null on the last stop). */
  lineOut: boolean | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const look = done
    ? { backgroundColor: colors.accentStrong, borderColor: colors.accentStrong, borderWidth: 2 }
    : current
      ? { backgroundColor: colors.surface, borderColor: colors.accent, borderWidth: 2 }
      : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 };
  const glyph = current ? colors.accentText : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      accessibilityRole="button"
      accessibilityLabel={`${label}${done ? ', tamamlandı' : ''}${current ? ', şu an buradasın' : ''}`}
      accessibilityState={{ selected: current }}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      {lineIn != null && <View style={[styles.line, styles.lineIn, { backgroundColor: lineIn ? colors.accent : colors.border }]} />}
      {lineOut != null && <View style={[styles.line, styles.lineOut, { backgroundColor: lineOut ? colors.accent : colors.border }]} />}
      {current && <View style={[styles.halo, { backgroundColor: colors.accentSoft }]} />}
      <View style={[styles.dot, look]}>
        {done ? (
          <Animated.View key="done" entering={ZoomIn.duration(200)}>
            <Icon name="checkmark" size={17} color={colors.onAccent} />
          </Animated.View>
        ) : icon ? (
          <Icon name={icon} size={16} color={glyph} />
        ) : (
          <Text variant="callout" weight="700" tint={glyph} style={styles.number}>
            {number}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { paddingHorizontal: ScreenPadding },
  bleed: { flexGrow: 0 },
  // The first dot lines up with the screen padding.
  row: { paddingHorizontal: ScreenPadding - (ITEM - DOT) / 2 },
  item: { width: ITEM, height: HEIGHT, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  line: { position: 'absolute', top: (HEIGHT - LINE) / 2, height: LINE },
  lineIn: { left: 0, width: ITEM / 2 },
  lineOut: { left: ITEM / 2, right: 0 },
  halo: { position: 'absolute', width: DOT + 10, height: DOT + 10, borderRadius: (DOT + 10) / 2 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  number: { fontVariant: ['tabular-nums'] },
});
