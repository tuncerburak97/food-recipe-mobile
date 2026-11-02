import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { QuestionStep } from '@/components/onboarding/question-step';
import { COPY, MAX_DISLIKES } from '@/components/onboarding/steps';
import { Button } from '@/components/ui/button';
import { Chip, ChipWrap } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { DISLIKE_SUGGESTIONS } from '@/lib/profile';

const key = (s: string) => s.trim().toLocaleLowerCase('tr');

/** "Mantar" and "mantar " are the same thing; the first letter is capitalised for display. */
function normalise(s: string) {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.charAt(0).toLocaleUpperCase('tr') + t.slice(1);
}

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  onNext: () => void;
}

/** The dislikes question of onboarding. */
export function DislikesStep({ values, onChange, onNext }: Props) {
  return (
    <QuestionStep
      title={COPY.dislikes.title}
      subtitle={COPY.dislikes.subtitle}
      footer={
        <Button title={values.length ? `Devam · ${values.length} seçili` : 'Yok, devam et'} trailingIcon="arrow-forward" onPress={onNext} />
      }>
      <DislikesPicker values={values} onChange={onChange} />
    </QuestionStep>
  );
}

/** Quick picks plus a free-text field for anything else (max 15 in total). Also used on the profile screen. */
export function DislikesPicker({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const keys = new Set(values.map(key));
  const full = values.length >= MAX_DISLIKES;
  const custom = values.filter((v) => !DISLIKE_SUGGESTIONS.some((s) => key(s) === key(v)));
  const canAdd = !!draft.trim() && !full;

  const toggle = (item: string) => {
    if (keys.has(key(item))) onChange(values.filter((v) => key(v) !== key(item)));
    else if (!full) onChange([...values, item]);
  };

  const add = () => {
    const item = normalise(draft);
    if (!item) return;
    if (!keys.has(key(item)) && !full) onChange([...values, item]);
    setDraft('');
  };

  return (
    <View style={styles.picker}>
      <View style={styles.block}>
        <Text variant="subhead" weight="600" color="textSecondary">
          Sık seçilenler
        </Text>
        <ChipWrap>
          {DISLIKE_SUGGESTIONS.map((s) => {
            const selected = keys.has(key(s));
            return (
              <Chip
                key={s}
                label={s}
                tone="sunken"
                selected={selected}
                icon={selected ? 'checkmark' : undefined}
                disabled={full && !selected}
                onPress={() => toggle(s)}
              />
            );
          })}
          {custom.map((c) => (
            <Chip key={c} label={c} tone="sunken" selected removable onPress={() => toggle(c)} />
          ))}
        </ChipWrap>
      </View>

      <TextField
        label="Listede yoksa kendin yaz"
        value={draft}
        onChangeText={setDraft}
        editable={!full}
        placeholder="Örneğin kapari"
        maxLength={30}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={add}
        help={full ? `En fazla ${MAX_DISLIKES} malzeme ekleyebilirsin.` : `${values.length}/${MAX_DISLIKES} seçili · Boş bırakabilirsin.`}
        trailing={<IconButton icon="add" label="Malzemeyi ekle" tone="accent" size={40} disabled={!canAdd} onPress={add} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  picker: { gap: 24 },
  block: { gap: 12 },
});
