import { QuestionStep } from '@/components/onboarding/question-step';
import { COPY } from '@/components/onboarding/steps';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

export const MAX_NAME = 40;

interface Props {
  name: string;
  onChange: (name: string) => void;
  onNext: () => void;
}

export function NameStep({ name, onChange, onNext }: Props) {
  const trimmed = name.trim();

  return (
    <QuestionStep
      title={COPY.name.title}
      subtitle={COPY.name.subtitle}
      footer={<Button title={trimmed ? 'Devam' : 'İsimsiz devam et'} trailingIcon="arrow-forward" onPress={onNext} />}>
      <TextField
        label="Adın"
        value={name}
        onChangeText={onChange}
        placeholder="Örneğin Ayşe"
        maxLength={MAX_NAME}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={onNext}
        help="Sonra Profil’den değiştirebilirsin."
      />
    </QuestionStep>
  );
}
