import Ionicons from '@expo/vector-icons/Ionicons';
import type { StyleProp, TextStyle } from 'react-native';

/**
 * The app's only icon set: Ionicons, outline glyphs (filled only for small status marks such as
 * "checkmark-circle"). Icons are decorative; the interactive parent provides the spoken label.
 */
export type IconName = keyof typeof Ionicons.glyphMap;

interface Props {
  name: IconName;
  size?: number;
  color: string;
  style?: StyleProp<TextStyle>;
}

export function Icon({ name, size = 20, color, style }: Props) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
