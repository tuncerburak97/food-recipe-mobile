import type { IconName } from '@/components/ui/icon';
import { CAPABILITIES, type GuideKind } from '@/lib/agent/capabilities';

/** A ready-made question; kind is the capability it shows (its icon), none for the extras. */
export interface AssistantExample {
  text: string;
  kind?: GuideKind;
  icon: IconName;
}

export interface ExampleContext {
  /** The account with the most recipes, so "Şefe göre" asks about someone real. */
  creator?: string;
  /** The most used ingredient (staples left out). */
  ingredient?: string;
  /** What the pantry holds, first items first. */
  pantry: string[];
  hour?: number;
}

const iconOf = (kind: GuideKind) => CAPABILITIES.find((c) => c.kind === kind)!.icon;

function mealQuestion(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Kahvaltılık bir şey öner';
  if (hour >= 11 && hour < 16) return 'Öğle için pratik bir yemek öner';
  if (hour >= 16 && hour < 23) return 'Akşama tavuk yemeği öner';
  return 'Gece için hafif bir atıştırmalık öner';
}

/**
 * One question for each capability, filled in with the app's own data (a real account, the most
 * used ingredient, what is in the pantry), then two extras: a meal for the time of day and a
 * kitchen change. Plain rules, no model call.
 */
export function assistantExamples({ creator, ingredient, pantry, hour = new Date().getHours() }: ExampleContext): AssistantExample[] {
  const ing = (ingredient || 'bulgur').toLocaleLowerCase('tr-TR');
  const ex = (kind: GuideKind, text: string): AssistantExample => ({ kind, text, icon: iconOf(kind) });
  return [
    ex('ingredient', `İçinde ${ing} olan yemekleri getir`),
    ex('creator', creator ? `@${creator} tariflerini getir` : 'Bir şefin tariflerini getir'),
    ex('category', 'Sütlü tatlıları getir'),
    ex('pantry', pantry.length ? 'Dolabımla ne pişirebilirim?' : 'Elimde pirinç ve soğan var, ne yapabilirim?'),
    ex('menu', '3 günlük akşam menüsü hazırla'),
    ex('write', pantry.length >= 2 ? `${pantry[0]} ve ${pantry[1]} ile bana tarif yaz` : 'Tavuk ve patatesle bana tarif yaz'),
    { text: mealQuestion(hour), icon: 'time-outline' },
    { text: 'Dolabıma yumurta ve domates ekle', icon: 'add-circle-outline' },
  ];
}
