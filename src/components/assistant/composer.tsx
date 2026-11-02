import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

/** A pill-shaped message box with a round send button; grows to a few lines while typing. */
export function Composer({ value, onChangeText, onSend, disabled }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={[styles.box, { backgroundColor: colors.surfaceMuted, borderColor: focused ? colors.text : colors.surfaceMuted }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Tarifle ilgili bir şey sor…"
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        multiline
        maxLength={800}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { color: colors.text }]}
        accessibilityLabel="Asistana mesaj"
      />
      <IconButton icon="arrow-up" label="Gönder" tone="accent" size={40} disabled={!canSend} onPress={onSend} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    paddingLeft: 18,
    paddingRight: 4,
    paddingVertical: 4,
  },
  input: { flex: 1, minHeight: 40, maxHeight: 120, fontFamily: Fonts.regular, fontSize: 16, lineHeight: 21, paddingTop: 10, paddingBottom: 10, outlineWidth: 0 },
});
