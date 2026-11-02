import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Segment<T extends string> {
  value: T;
  label: string;
  badge?: number;
}

interface Props<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Spoken name of the group, e.g. "Tarif bölümü". */
  label?: string;
  /** 'sunken' on white sheets, 'raised' on the cream page. */
  tone?: 'sunken' | 'raised';
}

/** Equal-width tabs on a pill track; the white thumb slides to the selected one. */
export function SegmentedControl<T extends string>({ segments, value, onChange, label, tone = 'sunken' }: Props<T>) {
  const { colors, isDark } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((s) => s.value === value));
  const segmentWidth = width > 0 ? (width - 8) / segments.length : 0;

  const thumb = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: withSpring(index * segmentWidth, { damping: 24, stiffness: 280 }) }],
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[
        styles.track,
        tone === 'sunken'
          ? { backgroundColor: colors.surfaceMuted }
          : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
      ]}>
      {width > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            tone === 'sunken'
              ? { backgroundColor: isDark ? colors.border : colors.surface, boxShadow: `0 1px 4px ${colors.shadow}` }
              : { backgroundColor: colors.accentStrong },
            thumb,
          ]}
        />
      )}
      {segments.map((s) => {
        const active = s.value === value;
        const fg = active ? (tone === 'raised' ? colors.onAccent : colors.text) : colors.textSecondary;
        return (
          <Pressable
            key={s.value}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={s.badge ? `${s.label}, ${s.badge}` : s.label}
            onPress={() => {
              if (!active) Haptics.selectionAsync();
              onChange(s.value);
            }}>
            <Text variant="subhead" weight={active ? '700' : '600'} tint={fg} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.label}>
              {s.label}
            </Text>
            {s.badge != null && s.badge > 0 && (
              <View style={[styles.badge, { backgroundColor: active ? colors.accentSoft : colors.border }]}>
                <Text variant="caption" tint={active ? colors.accentText : colors.textSecondary} style={styles.badgeText}>
                  {s.badge}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: Radius.pill, padding: 4, height: 46 },
  thumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: Radius.pill },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6, overflow: 'hidden' },
  label: { flexShrink: 1 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, lineHeight: 14 },
});
