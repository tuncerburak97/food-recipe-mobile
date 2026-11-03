import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, Radius, TouchSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  value?: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** When set, the field is a button (e.g. on Home it opens the search tab). */
  onPress?: () => void;
  /**
   * 'raised' (white with a hairline) on the page, 'sunken' (muted fill) on white sheets, 'prominent'
   * (taller, crisp border and a soft shadow) for Home's main search.
   */
  tone?: 'raised' | 'sunken' | 'prominent';
}

export function SearchField({ value = '', onChangeText, placeholder = 'Tarif ya da malzeme ara', autoFocus, onPress, tone = 'raised' }: Props) {
  const { colors, isDark } = useTheme();
  const prominent = tone === 'prominent';
  const box = [
    styles.box,
    prominent
      ? // A slightly darker edge than the hairline cards, so the main search reads first.
        [styles.prominent, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#D3D9E1', shadowColor: colors.text }]
      : tone === 'raised'
        ? { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }
        : { backgroundColor: colors.surfaceMuted },
  ];
  const iconColor = prominent ? colors.text : colors.textSecondary;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        style={({ pressed }) => [box, pressed && styles.pressed]}>
        <Icon name="search" size={prominent ? 20 : 18} color={iconColor} />
        <Text variant={prominent ? 'body' : 'callout'} color={prominent ? 'textSecondary' : 'textTertiary'} numberOfLines={1} style={styles.flex}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={box}>
      <Icon name="search" size={prominent ? 20 : 18} color={iconColor} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        selectionColor={colors.accent}
        accessibilityLabel={placeholder}
        style={[styles.input, { color: colors.text }]}
      />
      {value.length > 0 && (
        <Pressable hitSlop={12} onPress={() => onChangeText?.('')} accessibilityRole="button" accessibilityLabel="Aramayı temizle">
          <Icon name="close-circle" size={19} color={colors.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: TouchSize,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
  },
  prominent: {
    minHeight: 54,
    paddingHorizontal: 18,
    gap: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  input: { flex: 1, fontSize: 15, minHeight: TouchSize, fontFamily: Fonts.regular, outlineWidth: 0 },
});
