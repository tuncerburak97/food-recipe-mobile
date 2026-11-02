import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IngredientsStep, addTo } from '@/components/chef/ingredients-step';
import { Card } from '@/components/ui/card';
import { Chip, ChipWrap } from '@/components/ui/chip';
import { ChoiceCard } from '@/components/ui/choice-card';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { WizardLayout } from '@/components/ui/wizard-layout';
import { describeError } from '@/lib/api';
import {
  CALORIE_LIMITS,
  EFFORTS,
  GOALS,
  MEALS,
  MOODS,
  NOTE_IDEAS,
  PANTRY_MODES,
  TASTES,
  TIMES,
  defaultRequest,
} from '@/lib/chef';
import { upperTr } from '@/lib/format';
import type { CookProfile } from '@/lib/profile';
import { useMe, useStartGeneration } from '@/lib/queries';
import { showToast } from '@/store/toast';
import type { ChefRequest } from '@/lib/types';

type Step = 'ingredients' | 'meal' | 'taste' | 'goal' | 'mood' | 'amount' | 'extras';
const STEPS: Step[] = ['ingredients', 'meal', 'taste', 'goal', 'mood', 'amount', 'extras'];

const HEADINGS: Record<Step, { title: string; subtitle: string }> = {
  ingredients: { title: 'Elinde neler var?', subtitle: 'Yaz ya da aşağıdan seç. Tuz, yağ, su gibi temel şeyleri yazmana gerek yok.' },
  meal: { title: 'Hangi öğün için?', subtitle: 'Tarifi öğüne göre hazırlayalım.' },
  taste: { title: 'Tatlı mı, tuzlu mu?', subtitle: 'Canın hangisini çekiyor?' },
  goal: { title: 'Bu tarif nasıl olsun?', subtitle: 'Diyette, sporda ya da sadece keyif için; sana göre hazırlayalım.' },
  mood: { title: 'Canın ne çekiyor?', subtitle: 'Bugünkü ruh haline göre bir tarif.' },
  amount: { title: 'Kaç kişi, ne kadar vakit?', subtitle: 'Ölçüleri, adımları ve uğraşı buna göre ayarlayacağız.' },
  extras: { title: 'Son bir şey', subtitle: 'İki kısa soru daha. Notu boş bırakabilirsin.' },
};

/**
 * "Elimde ne var?": the user lists what they have and answers four quick questions about today;
 * a recipe is prepared in the background from these answers and their cooking profile.
 */
export default function ChefScreen() {
  const me = useMe().data;
  // Remount when the profile arrives so the defaults come from it.
  return <ChefFlow key={me?.profile ? 'profile' : 'none'} profile={me?.profile} />;
}

function close() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

/** The note ideas live in the free-text note as comma-separated phrases; tapping one adds or removes it. */
function noteParts(note: string): string[] {
  return note
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}
function hasIdea(note: string, idea: string): boolean {
  const phrase = idea.toLocaleLowerCase('tr-TR');
  return noteParts(note).some((p) => p.toLocaleLowerCase('tr-TR') === phrase);
}
function toggleIdea(note: string, idea: string): string {
  const phrase = idea.toLocaleLowerCase('tr-TR');
  if (hasIdea(note, idea)) return noteParts(note).filter((p) => p.toLocaleLowerCase('tr-TR') !== phrase).join(', ');
  return [note.trim(), phrase].filter(Boolean).join(', ');
}

function ChefFlow({ profile }: { profile?: CookProfile }) {
  const [req, setReq] = useState<ChefRequest>(() => defaultRequest(profile));
  const [index, setIndex] = useState(0);
  const [forward, setForward] = useState(true);
  const [draft, setDraft] = useState('');
  const start = useStartGeneration();
  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  const update = (patch: Partial<ChefRequest>) => setReq((r) => ({ ...r, ...patch }));
  const go = (to: number) => {
    setForward(to > index);
    setIndex(to);
  };

  const submit = () => {
    const ingredients = draft.trim() ? addTo(req.ingredients, draft) : req.ingredients;
    setDraft('');
    const final = { ...req, ingredients };
    setReq(final);
    start.mutate(final, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast({ title: 'Tarifin hazırlanıyor', message: 'Hazır olunca haber vereceğiz. Bu sırada uygulamayı kullanabilirsin.' }, 5000);
        close();
      },
      onError: (e) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showToast({ title: describeError(e).title, message: describeError(e).message });
      },
    });
  };
  const next = () => {
    if (step === 'ingredients' && draft.trim()) {
      update({ ingredients: addTo(req.ingredients, draft) });
      setDraft('');
    }
    if (last) submit();
    else go(index + 1);
  };
  const back = () => (index > 0 ? go(index - 1) : close());
  // Choosing never moves on by itself: the user always taps "Devam".
  const choose = (patch: Partial<ChefRequest>) => update(patch);

  const canContinue = step !== 'ingredients' || req.ingredients.length > 0 || draft.trim().length > 0;
  const summary =
    step === 'ingredients'
      ? req.ingredients.length > 0
        ? `${req.ingredients.length} malzeme seçili`
        : draft.trim()
          ? undefined
          : 'Devam etmek için en az bir malzeme ekle'
      : last
        ? 'Tarif hazır olunca sana haber vereceğiz.'
        : undefined;

  const heading = HEADINGS[step];
  return (
    <WizardLayout
      flow="Elimdekilerle tarif"
      title={heading.title}
      hint={heading.subtitle}
      step={index + 1}
      totalSteps={STEPS.length}
      onBack={back}
      onClose={close}
      forward={forward}
      summary={summary}
      next={{
        label: last ? 'Tarifimi oluştur' : 'Devam',
        onPress: next,
        loading: start.isPending,
        disabled: !canContinue,
        icon: last ? 'sparkles-outline' : 'arrow-forward',
      }}>
      {step === 'ingredients' && (
        <IngredientsStep items={req.ingredients} draft={draft} setDraft={setDraft} onChange={(ingredients) => update({ ingredients })} />
      )}

      {step === 'meal' && (
        <View style={styles.grid} accessibilityRole="radiogroup">
          {MEALS.map((m) => (
            <ChoiceCard
              key={m.value}
              compact
              title={m.label}
              selected={req.meal === m.value}
              onPress={() => choose(m.value === 'dessert' ? { meal: m.value, taste: 'sweet' } : { meal: m.value })}
            />
          ))}
        </View>
      )}

      {step === 'taste' && (
        <View style={styles.list} accessibilityRole="radiogroup">
          {TASTES.map((t) => (
            <ChoiceCard key={t.value} title={t.label} description={t.hint} selected={req.taste === t.value} onPress={() => choose({ taste: t.value })} />
          ))}
        </View>
      )}

      {step === 'goal' && (
        <View style={styles.sections}>
          <View style={styles.list} accessibilityRole="radiogroup">
            {GOALS.map((g) => (
              <ChoiceCard
                key={g.value}
                title={g.label}
                description={g.hint}
                selected={req.goal === g.value}
                onPress={() => choose({ goal: g.value, calorie_limit: g.value === 'light' ? req.calorie_limit || 500 : 0 })}
              />
            ))}
          </View>
          {req.goal === 'light' && (
            <Question title="Porsiyon başına en fazla">
              <View style={styles.grid} accessibilityRole="radiogroup">
                {CALORIE_LIMITS.map((c) => (
                  <ChoiceCard
                    key={c.value}
                    compact
                    title={c.label}
                    selected={req.calorie_limit === c.value}
                    onPress={() => update({ calorie_limit: c.value })}
                  />
                ))}
              </View>
            </Question>
          )}
        </View>
      )}

      {step === 'mood' && (
        <View style={styles.list} accessibilityRole="radiogroup">
          {MOODS.map((m) => (
            <ChoiceCard key={m.value} title={m.label} description={m.hint} selected={req.mood === m.value} onPress={() => choose({ mood: m.value })} />
          ))}
        </View>
      )}

      {step === 'amount' && (
        <View style={styles.sections}>
          <Card>
            <View style={styles.servings}>
              <View style={styles.flex}>
                <Text variant="headline">Kaç kişilik?</Text>
                <Text variant="subhead" color="textSecondary">
                  Ölçüler buna göre ayarlanır
                </Text>
              </View>
              <Stepper value={req.servings} onChange={(servings) => update({ servings })} max={12} unit="kişilik" suffix="kişi" />
            </View>
          </Card>

          <Question title="Ne kadar vaktin var?">
            <View style={styles.grid} accessibilityRole="radiogroup">
              {TIMES.map((t) => (
                <ChoiceCard key={t.value} compact title={t.label} selected={req.max_minutes === t.value} onPress={() => update({ max_minutes: t.value })} />
              ))}
            </View>
          </Question>

          <Question title="Ne kadar uğraşalım?">
            <View style={styles.list} accessibilityRole="radiogroup">
              {EFFORTS.map((e) => (
                <ChoiceCard key={e.value} title={e.label} description={e.hint} selected={req.effort === e.value} onPress={() => update({ effort: e.value })} />
              ))}
            </View>
          </Question>
        </View>
      )}

      {step === 'extras' && (
        <View style={styles.sections}>
          <Question title="Eksik malzeme eklenebilir mi?">
            <View style={styles.list} accessibilityRole="radiogroup">
              {PANTRY_MODES.map((m) => (
                <ChoiceCard
                  key={m.value}
                  title={m.label}
                  description={m.hint}
                  selected={req.pantry_mode === m.value}
                  onPress={() => update({ pantry_mode: m.value })}
                />
              ))}
            </View>
          </Question>

          <View style={styles.note}>
            <TextField
              label="Eklemek istediğin bir not (isteğe bağlı)"
              value={req.note}
              onChangeText={(note) => update({ note })}
              placeholder="ör. tek tava olsun, çocuklar da yiyecek"
              multiline
              maxLength={300}
            />
            <Text variant="overline" color="textTertiary" style={styles.overline}>
              {upperTr('Hızlı ekle')}
            </Text>
            <ChipWrap>
              {NOTE_IDEAS.map((idea) => {
                const on = hasIdea(req.note, idea);
                return (
                  <Chip
                    key={idea}
                    label={idea}
                    tone="sunken"
                    selected={on}
                    icon={on ? 'checkmark' : undefined}
                    onPress={() => update({ note: toggleIdea(req.note, idea) })}
                  />
                );
              })}
            </ChipWrap>
          </View>
        </View>
      )}
    </WizardLayout>
  );
}

/** A smaller question inside a step (e.g. "Ne kadar vaktin var?"). */
function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.question}>
      <Text variant="title3" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  sections: { gap: 28 },
  question: { gap: 12 },
  list: { gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  servings: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  note: { gap: 12 },
  overline: { marginTop: 4, paddingHorizontal: 2 },
});
