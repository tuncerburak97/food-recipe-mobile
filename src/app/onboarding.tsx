import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { BackHandler, Keyboard, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { AvoidStep } from '@/components/onboarding/avoid-step';
import { DemoStep, useDemoSamples } from '@/components/onboarding/demo-step';
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
  type MultiField,
  type MultiQuestion,
  type SingleField,
  type StepId,
} from '@/components/onboarding/steps';
import { usePreloadedVideo } from '@/components/recipe/video-hero';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { queueWelcome, useAppConfig } from '@/lib/access';
import { emptyProfile, personaFor, type CookProfile } from '@/lib/profile';
import { useSession } from '@/store/session';

/** Short label of each question, shown over its title with the question number. */
const KICKERS: Partial<Record<StepId, string>> = {
  name: 'Sen',
  goals: 'Beklentin',
  household: 'Sofran',
  minutes: 'Vaktin',
  skill: 'Deneyimin',
  cuisines: 'Damak zevkin',
  avoid: 'Hassasiyetler',
};

/**
 * First-run onboarding: an intro, seven short questions, a live demo (a sample video turns into a
 * recipe, shown as the app shows recipes) and an animated "setting up" moment that saves the
 * profile and opens the app by itself; the paywall follows. One route with an internal step index,
 * so every answer lives in one profile object.
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
  // The live demo is a server setting (billing.onboarding.demo.enabled): switched off, it is passed over.
  const demoOn = useAppConfig().billing.onboarding.demo.enabled;
  // Its samples are asked for now and the picked one's video starts loading, so by the time the
  // questions are answered it plays at once (the server takes seconds to start a video).
  const samples = useDemoSamples(demoOn);
  const [sample, setSample] = useState(0);
  const video = usePreloadedVideo(demoOn ? samples.data?.[sample]?.source?.shortcode : undefined);
  const passed = (i: number) => STEPS[i] === 'demo' && !demoOn;
  const next = () => goTo(passed(index + 1) ? index + 2 : index + 1);
  const back = () => goTo(passed(index - 1) ? index - 2 : index - 1);

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

  // What follows (the paywall, then the welcome) opens by itself: Home must not open the welcome too.
  const finish = async () => {
    queueWelcome();
    await completeOnboarding(displayName, { ...profile, persona: personaFor(profile).title });
  };

  const isQuestion = index >= FIRST_QUESTION && index <= LAST_QUESTION;
  // Progress counts the questions only: the first question shows a sliver, the last one a full bar.
  const questionCount = LAST_QUESTION - FIRST_QUESTION + 1;
  const questionNumber = index - FIRST_QUESTION + 1;
  const progress = questionNumber / questionCount;
  const kicker = isQuestion && KICKERS[step] ? `${questionNumber} / ${questionCount} · ${KICKERS[step]}`.toLocaleUpperCase('tr') : undefined;

  let content: ReactNode = null;
  const q = QUESTIONS[step];

  if (q?.kind === 'single') {
    content = (
      <QuestionStep
        kicker={kicker}
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
        kicker={kicker}
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
      case 'demo':
        content = <DemoStep samples={samples.data ?? []} loading={samples.isPending} chosen={sample} onChoose={setSample} player={video} onNext={next} />;
        break;
      case 'name':
        content = <NameStep kicker={kicker} name={name} onChange={setName} onNext={next} />;
        break;
      case 'avoid':
        content = <AvoidStep kicker={kicker} profile={profile} onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))} onNext={next} />;
        break;
      case 'preparing':
        content = <PreparingStep name={displayName} profile={profile} onFinish={finish} />;
        break;
    }
  }

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
