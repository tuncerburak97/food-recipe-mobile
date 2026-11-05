import type { AdaptKind } from '@/lib/adapt';
import type { Creator, GenerationJob, RecipeEntry } from '@/lib/types';

/** One line of the work log ("“bulgur pilavı” aranıyor" → "3 tarif bulundu"). */
export interface AgentStep {
  id: string;
  label: string;
  status: 'running' | 'done' | 'failed';
  count?: number;
}

export interface AgentRecipeItem {
  entry: RecipeEntry;
  /** For "what can I cook": ingredients the user is missing. */
  missing?: string[];
  /** Matched only some of the search words. */
  partial?: boolean;
}

export type AgentScreen =
  | 'recipe'
  | 'cook'
  | 'creator'
  | 'pantry'
  | 'shopping'
  | 'chef'
  | 'my_recipes'
  | 'journal'
  | 'voice_recipe'
  | 'add'
  | 'inbox'
  | 'settings'
  | 'search';

/** A button that opens a screen ("Dolabım", "Tarifi aç"). */
export interface AgentLink {
  screen: AgentScreen;
  id?: string;
  label: string;
}

/** App data a write changed, so the screens showing it reload. */
export type AgentChanged = 'pantry' | 'shopping' | 'recipes' | 'profile';

export type AgentBlock =
  | { id: string; type: 'recipes'; title?: string; recipes: AgentRecipeItem[] }
  | { id: string; type: 'creators'; title?: string; creators: Creator[] }
  | { id: string; type: 'plan'; title?: string; plan: { label: string; recipe: AgentRecipeItem }[] }
  | { id: string; type: 'notice'; title: string; lines: string[]; links: AgentLink[]; changed: AgentChanged[] }
  | { id: string; type: 'job'; title: string; job: GenerationJob }
  /** An adaptation the app runs itself; taskKey finds its progress (see lib/agent/tasks). */
  | { id: string; type: 'adapt'; title: string; entryId: string; kind: AdaptKind; label: string; taskKey: string };

/** open: go there now. suggest: only offer it as a button (e.g. "Dolabımı aç" when the pantry is empty). */
export interface AgentAction {
  type: 'open' | 'suggest';
  screen: AgentScreen;
  id?: string;
}

/** What the stream sends (see recipe-backend internal/agent). */
export type AgentEvent =
  | { type: 'status'; label: string }
  | { type: 'step'; step: AgentStep }
  | { type: 'delta'; text: string }
  | { type: 'reset' }
  | { type: 'block'; block: AgentBlock }
  | { type: 'suggestions'; items: string[] }
  | { type: 'action'; action: AgentAction }
  | { type: 'done'; ms: number }
  | { type: 'error'; code: string; message: string };

export interface UserTurn {
  id: string;
  role: 'user';
  text: string;
  /** Said out loud (shows a small mic mark). */
  voice?: boolean;
}

export interface AssistantTurn {
  id: string;
  role: 'assistant';
  status?: string;
  steps: AgentStep[];
  text: string;
  blocks: AgentBlock[];
  /** Short next requests to tap. */
  suggestions?: string[];
  action?: AgentAction;
  /** Still streaming. */
  streaming: boolean;
  error?: { code: string; message: string };
  /** How long the turn took, once done. */
  ms?: number;
}

export type AgentTurn = UserTurn | AssistantTurn;

/** A message as the server reads the history; refs are the cards an answer showed. */
export interface AgentHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
  refs?: { kind: 'recipe' | 'creator'; id: string; title: string }[];
}
