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
  /** 'raised' (white with a hairline) on the cream page, 'sunken' (muted fill) on white sheets. */
  tone?: 'raised' | 'sunken';
}

export function SearchField({ value = '', onChangeText, placeholder = 'Tarif ya da malzeme ara', autoFocus, onPress, tone = 'raised' }: Props) {
  const { colors } = useTheme();
  const box = [
    styles.box,
    tone === 'raised'
      ? { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth }
      : { backgroundColor: colors.surfaceMuted },
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        style={({ pressed }) => [box, pressed && styles.pressed]}>
        <Icon name="search" size={18} color={colors.textSecondary} />
        <Text variant="callout" color="textTertiary" numberOfLines={1} style={styles.flex}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={box}>
      <Icon name="search" size={18} color={colors.textSecondary} />
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
  flex: { flex: 1 },
  pressed: { opacity: 0.8 },
  input: { flex: 1, fontSize: 15, minHeight: TouchSize, fontFamily: Fonts.regular, outlineWidth: 0 },
});
