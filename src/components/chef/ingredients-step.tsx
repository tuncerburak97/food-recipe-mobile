import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Chip, ChipWrap } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { PANTRY_PICKS } from '@/lib/chef';
import { searchKey, upperTr } from '@/lib/format';
import { pantryItems, usePantry } from '@/lib/kitchen';

/** Adds the comma/line separated names in `text` to `items`, skipping duplicates (max 30). */
export function addTo(items: string[], text: string): string[] {
  const next = [...items];
  for (const part of text.split(/[,\n;]+/)) {
    const name = part.trim();
    if (name && !next.some((n) => searchKey(n) === searchKey(name))) next.push(name);
  }
  return next.slice(0, 30);
}

interface Props {
  items: string[];
  draft: string;
  setDraft: (v: string) => void;
  onChange: (items: string[]) => void;
}

/**
 * First step of "Elimde ne var?": type ingredients, fill them from "Dolabım" or pick common ones;
 * typed ones show as removable chips below. Opened from Dolabım (`/chef?pantry=1`), the pantry is
 * filled in once so the user only checks it.
 */
export function IngredientsStep({ items, draft, setDraft, onChange }: Props) {
  const { pantry: fromPantry } = useLocalSearchParams<{ pantry?: string }>();
  const pantryNames = pantryItems(usePantry().data).map((p) => p.name);
  const keys = new Set(items.map(searchKey));
  const notAdded = pantryNames.filter((n) => !keys.has(searchKey(n)));

  const filled = useRef(false);
  useEffect(() => {
    if (fromPantry !== '1' || filled.current || pantryNames.length === 0) return;
    filled.current = true;
    if (items.length === 0) onChange(addTo(items, pantryNames.join(',')));
  }, [fromPantry, pantryNames, items, onChange]);

  const addPantry = () => {
    Haptics.selectionAsync();
    onChange(addTo(items, notAdded.join(',')));
  };
  const pickKeys = new Set(PANTRY_PICKS.map((p) => searchKey(p.name)));
  // Typed ingredients that are not quick picks: listed under the picks so they can be removed.
  const typed = items.filter((n) => !pickKeys.has(searchKey(n)));
  const canAdd = draft.trim().length > 0;

  const add = () => {
    if (!canAdd) return;
    Haptics.selectionAsync();
    onChange(addTo(items, draft));
    setDraft('');
  };
  // Chip gives the haptic for taps on picks and picked items.
  const toggle = (name: string) =>
    onChange(keys.has(searchKey(name)) ? items.filter((n) => searchKey(n) !== searchKey(name)) : addTo(items, name));

  return (
    <View style={styles.wrap}>
      <TextField
        accessibilityLabel="Malzeme yaz"
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={add}
        submitBehavior="submit"
        placeholder="ör. tavuk, kabak, yoğurt"
        autoCorrect={false}
        returnKeyType="done"
        help="Birden fazlasını virgülle ayırarak yazabilirsin."
        trailing={<IconButton icon="add" label="Malzemeyi ekle" tone="accent" size={40} disabled={!canAdd} onPress={add} />}
      />

      {pantryNames.length > 0 ? (
        <Button
          title={notAdded.length > 0 ? `Dolabımdan ekle · ${notAdded.length}` : 'Dolabındakiler eklendi'}
          icon="file-tray-stacked-outline"
          variant="secondary"
          size="md"
          disabled={notAdded.length === 0 || items.length >= 30}
          accessibilityHint="Dolabım’daki malzemeleri listeye ekler"
          onPress={addPantry}
          style={styles.pantry}
        />
      ) : null}

      <View style={styles.group}>
        <Text variant="overline" color="textTertiary" style={styles.overline}>
          {upperTr('Hızlı seç')}
        </Text>
        {/* Picking only changes a chip's fill, never its size or position, so the next tap lands where the eye is. */}
        <ChipWrap>
          {PANTRY_PICKS.map((p) => (
            <Chip key={p.name} label={p.name} tone="sunken" selected={keys.has(searchKey(p.name))} onPress={() => toggle(p.name)} />
          ))}
        </ChipWrap>
      </View>

      {typed.length > 0 ? (
        <View style={styles.group}>
          <Text variant="overline" color="textTertiary" style={styles.overline}>
            {upperTr(`Eklediklerin · ${typed.length}`)}
          </Text>
          <ChipWrap>
            {typed.map((name) => (
              <Chip key={name} label={name} selected removable onPress={() => onChange(items.filter((n) => n !== name))} />
            ))}
          </ChipWrap>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 24 },
  group: { gap: 12 },
  overline: { paddingHorizontal: 2 },
  pantry: { alignSelf: 'flex-start' },
});
