import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

 
const CHEF = require('../../../assets/images/chef.png');

interface Props {
  size?: number;
  /** A white ring around the face, for when it sits on a photo or a colored card. */
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** The face of the AI chef: the recipe assistant and "Ne pişirsem?" use it. */
export function ChefAvatar({ size = 32, ring, style }: Props) {
  const { colors } = useTheme();
  const border = ring ? Math.max(2, Math.round(size * 0.06)) : 0;
  return (
    <View
      accessible={false}
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, borderWidth: border, borderColor: colors.surface },
        style,
      ]}>
      <Image source={CHEF} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
