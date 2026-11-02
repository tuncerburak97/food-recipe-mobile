import { IconButton } from '@/components/ui/icon-button';
import { TextField } from '@/components/ui/text-field';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  /** Called with the trimmed text when the user taps + or the return key. */
  onSubmit: (text: string) => void;
  /** Spoken name of the field ("Dolabına ekle"). */
  label: string;
  placeholder: string;
  help?: string;
  busy?: boolean;
}

/** A field to type one or more names (comma separated) with a round + button inside it. */
export function AddField({ value, onChangeText, onSubmit, label, placeholder, help, busy }: Props) {
  const text = value.trim();
  const submit = () => {
    if (text && !busy) onSubmit(text);
  };
  return (
    <TextField
      accessibilityLabel={label}
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={submit}
      submitBehavior="submit"
      placeholder={placeholder}
      autoCorrect={false}
      autoCapitalize="none"
      returnKeyType="done"
      help={help}
      trailing={<IconButton icon="add" label={label} tone="accent" size={40} disabled={!text} busy={busy} onPress={submit} />}
    />
  );
}
