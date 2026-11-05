import { assistantExamples, type AssistantExample } from '@/lib/agent/starters';
import { pantryItems, usePantry } from '@/lib/kitchen';
import { useCreators, usePopularIngredients } from '@/lib/queries';

/** The assistant's example questions with the app's data (cached queries Home already loads). */
export function useAssistantExamples(): AssistantExample[] {
  const creator = useCreators().data?.[0]?.username;
  const ingredient = usePopularIngredients(24).data?.[0]?.name;
  const pantry = pantryItems(usePantry().data).map((p) => p.name);
  return assistantExamples({ creator, ingredient, pantry });
}
