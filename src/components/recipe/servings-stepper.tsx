import { Stepper } from '@/components/ui/stepper';

interface Props {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/** "− 4 +": how many people the ingredient amounts are for. */
export function ServingsStepper({ value, onChange, min = 1, max = 20 }: Props) {
  return <Stepper value={value} onChange={onChange} min={min} max={max} unit="kişilik" suffix="kişi" />;
}
