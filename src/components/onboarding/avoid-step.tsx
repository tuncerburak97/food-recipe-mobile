import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { DislikesPicker } from '@/components/onboarding/dislikes-step';
import { QuestionNote, QuestionStep } from '@/components/onboarding/question-step';
import { COPY } from '@/components/onboarding/steps';
import { Button } from '@/components/ui/button';
import { Chip, ChipWrap } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { ALLERGY, DIET, type Allergy, type CookProfile, type Diet, type Option } from '@/lib/profile';

interface Props {
  profile: CookProfile;
  onChange: (patch: Partial<CookProfile>) => void;
  onNext: () => void;
  kicker?: string;
}

/**
 * One screen for everything that must stay off the plate: eating style, allergies and dislikes.
 * Each part is optional; with nothing picked the button reads "Hiçbiri yok, devam".
 */
export function AvoidStep({ profile, onChange, onNext, kicker }: Props) {
  const count = profile.diet.length + profile.allergies.length + profile.dislikes.length;
  const toggle = <T extends string>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <QuestionStep
      kicker={kicker}
      title={COPY.avoid.title}
      subtitle={COPY.avoid.subtitle}
      footer={<Button title={count ? `Devam · ${count} seçili` : 'Hiçbiri yok, devam'} trailingIcon="arrow-forward" onPress={onNext} />}>
      <Section title="Beslenme tarzın" delay={80}>
        <EmojiChips options={DIET} values={profile.diet} onToggle={(v) => onChange({ diet: toggle(profile.diet, v as Diet) })} />
      </Section>
      <Section title="Alerji ya da hassasiyet" delay={160}>
        <QuestionNote icon="shield-checkmark" text="AI Şef bu malzemeleri tariflerinde hiç kullanmaz." />
        <EmojiChips options={ALLERGY} values={profile.allergies} onToggle={(v) => onChange({ allergies: toggle(profile.allergies, v as Allergy) })} />
      </Section>
      <Section title="Sevmediklerin" delay={240}>
        <DislikesPicker values={profile.dislikes} onChange={(dislikes) => onChange({ dislikes })} />
      </Section>
    </QuestionStep>
  );
}

function Section({ title, delay, children }: { title: string; delay: number; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(320)} style={styles.section}>
      <Text variant="title3" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </Animated.View>
  );
}

function EmojiChips({ options, values, onToggle }: { options: Option<string>[]; values: readonly string[]; onToggle: (v: string) => void }) {
  return (
    <ChipWrap>
      {options.map((o) => {
        const selected = values.includes(o.value);
        return (
          <Chip
            key={o.value}
            label={`${o.emoji}  ${o.label}`}
            tone="sunken"
            selected={selected}
            icon={selected ? 'checkmark' : undefined}
            onPress={() => onToggle(o.value)}
          />
        );
      })}
    </ChipWrap>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginBottom: 8 },
});
