import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TabBarHeight } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Ana sayfa', icon: 'home-outline', active: 'home' },
  search: { label: 'Ara', icon: 'search-outline', active: 'search' },
  'my-recipes': { label: 'Tariflerim', icon: 'book-outline', active: 'book' },
  settings: { label: 'Profil', icon: 'person-outline', active: 'person' },
};

/**
 * Full-width bar docked to the bottom: five equal slots, icon over a short label. The middle slot is
 * "Ekle", a filled orange button that opens the add chooser (from what I have / from a video).
 */
export function TabBar({ state, navigateToTab }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const routes = state.routes.filter((r) => TABS[r.name]);

  const item = (route: (typeof state.routes)[number]) => {
    const tab = TABS[route.name];
    const focused = state.routes[state.index]?.key === route.key;
    const color = focused ? colors.accentText : colors.textTertiary;
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        onPress={() => {
          if (focused) return;
          Haptics.selectionAsync();
          navigateToTab(route.key);
        }}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
        <Icon name={focused ? tab.active : tab.icon} size={22} color={color} />
        <Text variant="caption" weight={focused ? '700' : '600'} tint={color} numberOfLines={1} style={styles.label}>
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {routes.slice(0, 2).map(item)}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push('/create');
        }}
        accessibilityRole="button"
        accessibilityLabel="Tarif ekle"
        accessibilityHint="Elindekilerle ya da bir videodan tarif ekler"
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
        <View style={[styles.add, { backgroundColor: colors.accentStrong }]}>
          <Icon name="add" size={24} color={colors.onAccent} />
        </View>
        <Text variant="caption" weight="700" color="text" style={styles.label}>
          Ekle
        </Text>
      </Pressable>
      {routes.slice(2).map(item)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 6 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: TabBarHeight - 14 },
  pressed: { opacity: 0.6 },
  label: { fontSize: 10.5, lineHeight: 13 },
  add: { width: 44, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
