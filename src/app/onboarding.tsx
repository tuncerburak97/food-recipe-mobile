import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { DislikesStep } from '@/components/onboarding/dislikes-step';
import { HeroStep } from '@/components/onboarding/hero-step';
import { NameStep } from '@/components/onboarding/name-step';
import { StepPage, TopBar } from '@/components/onboarding/onboarding-shell';
import { MultiChoice, SingleChoice } from '@/components/onboarding/option-card';
import { PreparingStep } from '@/components/onboarding/preparing-step';
import { QuestionNote, QuestionStep } from '@/components/onboarding/question-step';
import {
  FIRST_QUESTION,
  LAST_QUESTION,
  QUESTIONS,
  STEPS,
  summaryRows,
  type MultiField,
  type MultiQuestion,
  type SingleField,
  type StepId,
} from '@/components/onboarding/steps';
import { SummaryStep } from '@/components/onboarding/summary-step';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { emptyProfile, personaFor, type CookProfile } from '@/lib/profile';
import { useSession } from '@/store/session';

/**
 * First-run onboarding: a short intro, plain questions about cooking habits, and a summary. One route
 * with an internal step index, so every answer lives in one profile object. Finishing calls
 * completeOnboarding; the root guard then shows Home.
 */
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const { completeOnboarding } = useSession();
  const [index, setIndex] = useState(0);
  const [name, setName] = useState('');
  const [profile, setProfile] = useState<CookProfile>(emptyProfile);
  /** Multi-choice steps where the user explicitly picked "none" (an empty list alone is just unanswered). */
  const [noneChosen, setNoneChosen] = useState<StepId[]>([]);

  const step = STEPS[index];
  const displayName = name.trim();

  // Choosing an answer never moves on by itself: the user always taps "Devam".
  const goTo = (to: number) => {
    Keyboard.dismiss();
    setIndex(Math.max(0, Math.min(STEPS.length - 1, to)));
  };
  const next = () => goTo(index + 1);
  // The ten-second preparing moment is not replayed when going back from the summary.
  const back = () => goTo(step === 'summary' ? LAST_QUESTION : index - 1);

  const answerSingle = (field: SingleField, value: string | number) => {
    setProfile((p) => ({ ...p, [field]: value }) as CookProfile);
  };

  const toggleMulti = (q: MultiQuestion, value: string) => {
    setProfile((p) => {
      const list = p[q.field] as string[];
      if (list.includes(value)) return { ...p, [q.field]: list.filter((v) => v !== value) } as CookProfile;
      if (q.max && list.length >= q.max) return p;
      return { ...p, [q.field]: [...list, value] } as CookProfile;
    });
    setNoneChosen((ids) => ids.filter((id) => id !== step));
  };

  const chooseNone = (field: MultiField) => {
    setProfile((p) => ({ ...p, [field]: [] }));
    setNoneChosen((ids) => (ids.includes(step) ? ids : [...ids, step]));
  };

  const onHardwareBack = useEffectEvent(() => {
    if (step === 'hero') return false; // leave the app as usual
    if (step === 'preparing') return true;
    back();
    return true;
  });

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => onHardwareBack());
    return () => sub.remove();
  }, []);

  const finish = () => completeOnboarding(displayName, { ...profile, persona: personaFor(profile).title });

  let content: ReactNode = null;
  const q = QUESTIONS[step];

  if (q?.kind === 'single') {
    content = (
      <QuestionStep
        title={q.title}
        subtitle={q.subtitle}
        footer={<Button title="Devam" trailingIcon="arrow-forward" onPress={next} disabled={profile[q.field] == null} />}>
        <SingleChoice options={q.options} value={profile[q.field]} onSelect={(v) => answerSingle(q.field, v)} />
      </QuestionStep>
    );
  } else if (q?.kind === 'multi') {
    const values = profile[q.field] as string[];
    const count = values.length;
    content = (
      <QuestionStep
        title={q.title}
        subtitle={q.subtitle}
        footer={<Button title={count ? `Devam · ${count} seçili` : 'Devam'} trailingIcon="arrow-forward" onPress={next} />}>
        {q.note && <QuestionNote icon={q.noteIcon} text={q.note} />}
        <MultiChoice
          options={q.options}
          values={values}
          max={q.max}
          onToggle={(v) => toggleMulti(q, v)}
          none={q.none && { ...q.none, selected: count === 0 && noneChosen.includes(step), onPress: () => chooseNone(q.field) }}
        />
      </QuestionStep>
    );
  } else {
    switch (step) {
      case 'hero':
        content = <HeroStep onStart={next} />;
        break;
      case 'name':
        content = <NameStep name={name} onChange={setName} onNext={next} />;
        break;
      case 'dislikes':
        content = <DislikesStep values={profile.dislikes} onChange={(dislikes) => setProfile((p) => ({ ...p, dislikes }))} onNext={next} />;
        break;
      case 'preparing':
        content = <PreparingStep name={displayName} onDone={next} />;
        break;
      case 'summary':
        content = <SummaryStep name={displayName} rows={summaryRows(profile)} onFinish={finish} onEdit={() => goTo(FIRST_QUESTION)} />;
        break;
    }
  }

  const isQuestion = index >= FIRST_QUESTION && index <= LAST_QUESTION;
  // Progress counts the questions only: the first question shows a sliver, the last one a full bar.
  const questionCount = LAST_QUESTION - FIRST_QUESTION + 1;
  const questionNumber = index - FIRST_QUESTION + 1;
  const progress = questionNumber / questionCount;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { backgroundColor: colors.surface }]}>
      <StepPage key={index}>{content}</StepPage>
      {isQuestion && <TopBar progress={progress} step={questionNumber} total={questionCount} onBack={back} onSkip={next} />}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
