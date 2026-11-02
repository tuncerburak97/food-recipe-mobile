import { use } from 'react';
import { useColorScheme } from 'react-native';

import { Colors, type ThemeColors } from '@/constants/theme';
import { AppearanceContext } from '@/store/appearance';

/** Colors for the user's appearance choice; light by default, whatever the phone's setting. */
export function useTheme(): { colors: ThemeColors; isDark: boolean } {
  const choice = use(AppearanceContext)?.appearance ?? 'light';
  const system = useColorScheme();
  const isDark = choice === 'dark' || (choice === 'system' && system === 'dark');
  return { colors: isDark ? Colors.dark : Colors.light, isDark };
}
