import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { updateDraft, useDraftKey, useJournalDraft } from '@/components/journal/draft';
import { NoteSheet } from '@/components/journal/note-sheet';
import { PhotoTile } from '@/components/journal/photo-tile';
import { RatingPicker } from '@/components/journal/rating-picker';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ratingLabel } from '@/lib/journal';
import type { RecipeEntry } from '@/lib/types';

const TILE = 96;

/**
 * "Nasıl oldu?" on the finished page: a verdict, a photo and a note for next time, all optional.
 * The footer saves it ("Günlüğe kaydet"); once saved this turns into a short confirmation.
 */
export function CookJournalForm({ entry }: { entry: RecipeEntry }) {
  const key = useDraftKey(entry.id);
  const draft = useJournalDraft(key);
  const [writing, setWriting] = useState(false);
  const saving = draft.status === 'saving';

  if (draft.status === 'saved') return <Saved rating={ratingLabel(draft.rating)} note={draft.note.trim()} photoUri={draft.photo?.uri} />;

  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <Text variant="title2" accessibilityRole="header">
          Nasıl oldu?
        </Text>
        <Text variant="subhead" color="textSecondary">
          İstersen kısa bir not bırak. Tarifi bir dahaki açışında en üstte durur.
        </Text>
      </View>

      <RatingPicker value={draft.rating} onChange={(rating) => updateDraft(key, { rating })} disabled={saving} />

      <View style={styles.row}>
        <PhotoTile photo={draft.photo} onChange={(photo) => updateDraft(key, { photo })} size={TILE} disabled={saving} />
        <NoteButton note={draft.note.trim()} onPress={() => setWriting(true)} disabled={saving} />
      </View>

      <NoteSheet
        visible={writing}
        title={draft.note.trim() ? 'Notu düzenle' : 'Not ekle'}
        subtitle={entry.recipe.title}
        initialNote={draft.note}
        submitLabel="Tamam"
        onSubmit={({ note }) => {
          updateDraft(key, { note });
          setWriting(false);
        }}
        onClose={() => setWriting(false)}
      />
    </View>
  );
}

/** Looks like a field; opens the note page, where the keyboard has room. */
function NoteButton({ note, onPress, disabled }: { note: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={note ? `Bir dahaki sefere: ${note}` : 'Bir dahaki sefere için not ekle'}
      accessibilityHint={note ? 'Notu düzenler' : undefined}
      style={({ pressed }) => [
        styles.note,
        { backgroundColor: pressed ? colors.border : colors.surfaceMuted, opacity: disabled ? 0.5 : 1 },
      ]}>
      {note ? (
        <>
          <Text variant="callout" numberOfLines={3}>
            {note}
          </Text>
          <Text variant="footnote" weight="600" color="accentText">
            Düzenle
          </Text>
        </>
      ) : (
        <>
          <Text variant="callout" weight="600" color="textSecondary">
            Bir dahaki sefere…
          </Text>
          <Text variant="footnote" color="textTertiary" numberOfLines={2}>
            Örneğin: tuzu az koy, 5 dk fazla pişir
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** The confirmation after saving: what was kept, where it will show up. */
function Saved({ rating, note, photoUri }: { rating?: string; note: string; photoUri?: string }) {
  const { colors } = useTheme();
  const detail = [rating, note].filter(Boolean).join(' · ');
  return (
    <Animated.View
      entering={FadeIn.duration(240)}
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={['Günlüğe kaydedildi', detail].filter(Boolean).join('. ')}
      style={[styles.saved, { backgroundColor: colors.surfaceMuted }]}>
      <Icon name="checkmark-circle" size={22} color={colors.success} />
      <View style={styles.savedTexts}>
        <Text variant="headline">Günlüğe kaydedildi</Text>
        <Text variant="subhead" color="textSecondary" numberOfLines={2}>
          {detail || 'Pişirdiklerim’de görebilirsin.'}
        </Text>
      </View>
      {photoUri ? <Image source={photoUri} style={styles.savedPhoto} contentFit="cover" /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: { alignSelf: 'stretch', gap: 14 },
  head: { gap: 4 },
  row: { flexDirection: 'row', gap: 10 },
  note: { flex: 1, minHeight: TILE, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, gap: 4, justifyContent: 'space-between' },
  saved: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: Radius.lg },
  savedTexts: { flex: 1, gap: 2 },
  savedPhoto: { width: 52, height: 52, borderRadius: Radius.sm },
});
