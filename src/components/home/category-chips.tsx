import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { CATEGORIES } from '@/constants/categories';
import { ScreenPadding } from '@/constants/theme';
import type { Category, CategoryCount } from '@/lib/types';

interface Props {
  value: Category | 'all';
  onChange: (value: Category | 'all') => void;
  /** Recipe counts per category: only categories with recipes are shown, largest first, with the count. */
  counts?: CategoryCount[];
  total?: number;
}

type Key = Category | 'all';
type Item = { value: Key; label: string; count?: number };
type Frame = { x: number; width: number };
type Viewport = { offset: number; width: number; content: number };

/** Scrolls the row only when the chip is (partly) hidden, so tapping a visible chip never moves the row. */
function revealChip(scroll: ScrollViewInstance | null, chip: Frame | undefined, view: Viewport, animated: boolean) {
  if (!scroll || !chip || view.width === 0) return;
  const left = chip.x - ScreenPadding;
  const right = chip.x + chip.width + ScreenPadding - view.width;
  let target: number | null = null;
  if (left < view.offset) target = left;
  else if (right > view.offset) target = right;
  if (target == null) return;
  const max = Math.max(0, view.content - view.width);
  scroll.scrollTo({ x: Math.min(max, Math.max(0, target)), animated });
}

/**
 * The category filter on the search page: one edge-to-edge row of text chips with recipe counts,
 * "Tümü" first. The selected chip fills with the accent; when it is chosen from elsewhere (a
 * category tile on Home) the row scrolls just enough to show it.
 */
export function CategoryChips({ value, onChange, counts, total }: Props) {
  const scroll = useRef<ScrollViewInstance>(null);
  const frames = useRef<Partial<Record<Key, Frame>>>({});
  const view = useRef<Viewport>({ offset: 0, width: 0, content: 0 });

  let list: Item[] = CATEGORIES;
  if (counts) {
    list = counts.map((c) => ({ value: c.category, label: CATEGORIES.find((x) => x.value === c.category)?.label ?? 'Diğer', count: c.count }));
    // Keep the selected category visible even if it has no recipes (e.g. opened from a link).
    if (value !== 'all' && !list.some((c) => c.value === value)) {
      const meta = CATEGORIES.find((c) => c.value === value);
      if (meta) list = [...list, { ...meta, count: 0 }];
    }
  }
  const items: Item[] = [{ value: 'all', label: 'Tümü', count: total }, ...list];

  useEffect(() => {
    revealChip(scroll.current, frames.current[value], view.current, true);
  }, [value]);

  // Layout can arrive in any order (chips, row, content); whichever comes last brings the selection into view.
  const settle = () => revealChip(scroll.current, frames.current[value], view.current, false);

  return (
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.row}
      scrollEventThrottle={32}
      onLayout={(e) => {
        view.current.width = e.nativeEvent.layout.width;
        settle();
      }}
      onContentSizeChange={(w) => {
        view.current.content = w;
        settle();
      }}
      onScroll={(e) => {
        view.current.offset = e.nativeEvent.contentOffset.x;
      }}>
      {items.map((c) => (
        <View
          key={c.value}
          onLayout={(e) => {
            frames.current[c.value] = { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width };
            if (c.value === value) settle();
          }}>
          <Chip label={c.label} count={c.count} selected={c.value === value} onPress={() => onChange(c.value)} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -ScreenPadding, flexGrow: 0 },
  row: { paddingHorizontal: ScreenPadding, gap: 8, alignItems: 'center' },
});
