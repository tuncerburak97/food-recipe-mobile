import { useState } from 'react';

import type { AssistantProposal } from '@/lib/types';

export interface ChatItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  offTopic?: boolean;
  /** Failed request; shown with a retry and never sent back to the model. */
  error?: boolean;
  proposal?: AssistantProposal;
  proposalState?: 'pending' | 'applying' | 'applied' | 'dismissed';
  /** Entry id of the user's personal version once a proposal is applied. */
  appliedEntryId?: string;
}

// Conversations live for as long as the app is open, one per recipe entry (the server keeps none).
const chats = new Map<string, ChatItem[]>();

/** The conversation about one recipe, kept across opening and closing the assistant screen. */
export function useAssistantChat(entryId: string) {
  const [items, setItemsState] = useState<ChatItem[]>(() => chats.get(entryId) ?? []);
  const setItems = (update: (prev: ChatItem[]) => ChatItem[]) => {
    setItemsState((prev) => {
      const next = update(prev);
      chats.set(entryId, next);
      return next;
    });
  };
  return [items, setItems] as const;
}

let counter = 0;
export function chatId(): string {
  counter += 1;
  return `${Date.now()}-${counter}`;
}
