import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { initials } from '@/lib/format';

/** Round photo, or the person's initials on warm peach when there is no photo (or it fails to load). */
export function Avatar({ name, uri, size = 32, ring }: { name: string; uri?: string; size?: number; ring?: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.inner,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.peach },
        ring && { borderWidth: Math.max(2, size * 0.04), borderColor: colors.surface },
      ]}>
      {/* Initials sit under the photo, so they show while it loads or when the link has expired. */}
      <Text tint={colors.onPeach} weight="700" style={{ fontSize: size * 0.36, lineHeight: size * 0.46 }}>
        {initials(name)}
      </Text>
      {uri ? <Image source={uri} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
});
