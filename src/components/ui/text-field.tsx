import { useState, type ReactNode, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { Fonts, Radius, TouchSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** Visible label above the field; also the spoken name. Omit only when the screen title says it. */
  label?: string;
  /** Spoken name when there is no visible label. */
  accessibilityLabel?: string;
  error?: string | null;
  help?: string;
  /** Element inside the field on the right, e.g. a small add button. */
  trailing?: ReactNode;
  /** 'sunken' (muted fill) on white sheets, 'raised' (white + hairline) on the cream page. */
  tone?: 'sunken' | 'raised';
  ref?: Ref<TextInputInstance>;
};

/** A labelled input: the border darkens on focus and turns red with an error message. */
export function TextField({ label, accessibilityLabel, error, help, trailing, tone = 'sunken', multiline, ref, onFocus, onBlur, ...input }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.danger : focused ? colors.text : tone === 'raised' ? colors.border : colors.surfaceMuted;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="subhead" weight="600" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.box,
          multiline && styles.multiline,
          { borderColor, backgroundColor: tone === 'raised' ? colors.surface : colors.surfaceMuted },
          trailing ? styles.withTrailing : null,
        ]}>
        <TextInput
          ref={ref}
          {...input}
          multiline={multiline}
          accessibilityLabel={label ?? accessibilityLabel}
          accessibilityHint={error ?? help}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.accent}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[styles.input, multiline && styles.inputMultiline, { color: colors.text }]}
        />
        {trailing}
      </View>
      {error ? (
        <Text variant="footnote" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : help ? (
        <Text variant="footnote" color="textTertiary">
          {help}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TouchSize + 4,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
  },
  withTrailing: { paddingRight: 6, gap: 8 },
  multiline: { alignItems: 'flex-start', paddingVertical: 4 },
  input: { flex: 1, minHeight: TouchSize, fontFamily: Fonts.regular, fontSize: 16, outlineWidth: 0 },
  inputMultiline: { minHeight: 96, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
});
