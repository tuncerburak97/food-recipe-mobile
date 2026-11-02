import { Tabs } from 'expo-router/tabs';

import { TabBar } from '@/components/ui/tab-bar';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="my-recipes" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
