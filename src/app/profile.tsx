import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { DislikesPicker } from '@/components/onboarding/dislikes-step';
import { MultiChoice, SingleChoice } from '@/components/onboarding/option-card';
import { QuestionNote } from '@/components/onboarding/question-step';
import { QUESTIONS, type MultiQuestion, type StepId } from '@/components/onboarding/steps';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/empty-state';
import { StickyFooter } from '@/components/ui/layout';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { emptyProfile, personaFor, type CookProfile } from '@/lib/profile';
import { useMe, useSaveProfile } from '@/lib/queries';
import type { AppUser } from '@/lib/types';

/** The onboarding questions in the order they are shown here; dislikes sit after allergies. */
const SECTIONS: StepId[] = ['household', 'frequency', 'skill', 'minutes', 'diet', 'allergies', 'dislikes', 'cuisines', 'spice', 'equipment', 'goals', 'budget'];

const TITLE = 'Bilgiler ve tercihler';

/** Profil → "Kişisel bilgiler ve tercihler": the name and every onboarding answer, editable and saved together. */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const me = useMe().data;
  if (!me) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.surface }]}>
        <ScreenHeader title={TITLE} tone="muted" />
        <LoadingState label="Bilgilerin yükleniyor" />
      </View>
    );
  }
  return <ProfileForm me={me} />;
}

function ProfileForm({ me }: { me: AppUser }) {
  const { colors } = useTheme();
  const save = useSaveProfile();
  const initial = { ...emptyProfile(), ...me.profile };
  const [name, setName] = useState(me.name);
  const [profile, setProfile] = useState<CookProfile>(initial);
  const changed = name.trim() !== me.name || JSON.stringify(profile) !== JSON.stringify(initial);

  const set = (patch: Partial<CookProfile>) => setProfile((p) => ({ ...p, ...patch }));
  const toggle = (q: MultiQuestion, value: string) =>
    setProfile((p) => {
      const list = p[q.field] as string[];
      if (list.includes(value)) return { ...p, [q.field]: list.filter((v) => v !== value) };
      if (q.max && list.length >= q.max) return p;
      return { ...p, [q.field]: [...list, value] };
    });

  const submit = () =>
    save.mutate(
      { name: name.trim(), profile: { ...profile, persona: personaFor(profile).title } },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
        onError: (e) => Alert.alert(describeError(e).title, describeError(e).message),
      },
    );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ScreenHeader title={TITLE} tone="muted" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text variant="callout" color="textSecondary">
          Tarifler bu bilgilere göre hazırlanır. Değiştirdiğin bilgiler bir sonraki tariften itibaren geçerli olur.
        </Text>

        <Section title="Adın" first>
          <TextField
            accessibilityLabel="Adın"
            value={name}
            onChangeText={setName}
            placeholder="Adın"
            maxLength={40}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />
        </Section>

        {SECTIONS.map((id) => {
          if (id === 'dislikes') {
            return (
              <Section key={id} title="Sevmediğin malzemeler">
                <DislikesPicker values={profile.dislikes} onChange={(dislikes) => set({ dislikes })} />
              </Section>
            );
          }
          const q = QUESTIONS[id];
          if (!q) return null;
          if (q.kind === 'single') {
            return (
              <Section key={id} title={q.title}>
                <SingleChoice options={q.options} value={profile[q.field]} onSelect={(v) => set({ [q.field]: v } as Partial<CookProfile>)} />
              </Section>
            );
          }
          const values = profile[q.field] as string[];
          return (
            <Section key={id} title={q.title} hint={q.max ? `En fazla ${q.max}` : undefined}>
              {q.note && q.noteIcon === 'shield-checkmark' && <QuestionNote icon={q.noteIcon} text={q.note} />}
              <MultiChoice
                options={q.options}
                values={values}
                max={q.max}
                onToggle={(v) => toggle(q, v)}
                none={q.none && { ...q.none, selected: values.length === 0, onPress: () => set({ [q.field]: [] } as Partial<CookProfile>) }}
              />
            </Section>
          );
        })}
      </ScrollView>

      <StickyFooter>
        <Button title={changed ? 'Kaydet' : 'Değişiklik yok'} trailingIcon={null} onPress={submit} loading={save.isPending} disabled={!changed} />
      </StickyFooter>
    </KeyboardAvoidingView>
  );
}

/** One question: a card-title heading (and a quiet limit on the right), then its answers. */
function Section({ title, hint, first, children }: { title: string; hint?: string; first?: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.section, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 24 }]}>
      <View style={styles.sectionHead}>
        <Text variant="title3" accessibilityRole="header" style={styles.flex}>
          {title}
        </Text>
        {hint ? (
          <Text variant="footnote" color="textTertiary">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: 8, paddingBottom: 32, gap: 24 },
  section: { gap: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
});
