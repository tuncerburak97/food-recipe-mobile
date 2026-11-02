import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { RatingPicker } from '@/components/journal/rating-picker';
import { Button } from '@/components/ui/button';
import { StickyFooter } from '@/components/ui/layout';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { NOTE_MAX, type CookRating } from '@/lib/journal';

interface Props {
  visible: boolean;
  title: string;
  /** Recipe name under the title. */
  subtitle?: string;
  initialNote?: string;
  /** Shows the verdicts above the note (editing a saved cook). */
  withRating?: boolean;
  initialRating?: CookRating;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  onSubmit: (v: { note: string; rating?: CookRating }) => void;
  onClose: () => void;
  /** Shows "Bu kaydı sil" at the end (editing a saved cook). */
  onDelete?: () => void;
}

/**
 * A modal page for the note for next time (and, when editing, the verdict). The note gets the whole
 * screen with the keyboard, so typing never hides the field or the button.
 */
export function NoteSheet({ visible, onClose, ...rest }: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent>
      {/* Keyed on visibility so each opening starts from the current values. */}
      <Body key={String(visible)} onClose={onClose} {...rest} />
    </Modal>
  );
}

function Body({ title, subtitle, initialNote, withRating, initialRating, submitLabel, busy, error, onSubmit, onClose, onDelete }: Omit<Props, 'visible'>) {
  const { colors } = useTheme();
  const [note, setNote] = useState(initialNote ?? '');
  const [rating, setRating] = useState(initialRating);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ScreenHeader leading="close" title={title} subtitle={subtitle} tone="muted" safeTop={Platform.OS !== 'ios'} onBack={onClose} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        {withRating ? (
          <View style={styles.section}>
            <Text variant="subhead" weight="600" color="textSecondary">
              Nasıl oldu?
            </Text>
            <RatingPicker value={rating} onChange={setRating} />
          </View>
        ) : null}
        <TextField
          label="Bir dahaki sefere"
          value={note}
          onChangeText={setNote}
          placeholder="Örneğin: tuzu az koy, 5 dk fazla pişir"
          multiline
          autoFocus={!withRating}
          maxLength={NOTE_MAX}
          help="Tarifi tekrar açtığında en üstte görünür."
          error={error}
        />
        {onDelete ? <Button title="Bu kaydı sil" icon="trash-outline" variant="danger" size="md" onPress={onDelete} disabled={busy} style={styles.delete} /> : null}
      </ScrollView>
      <StickyFooter>
        <Button title={submitLabel} loading={busy} onPress={() => onSubmit({ note: note.trim(), rating })} />
      </StickyFooter>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: ScreenPadding, paddingTop: 8, paddingBottom: 32, gap: 24 },
  section: { gap: 10 },
  delete: { alignSelf: 'flex-start' },
});
