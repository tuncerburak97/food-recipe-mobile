import type { QueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

import { adaptRecipe, describeAdaptError, type AdaptKind } from '@/lib/adapt';

// Work an answer started that the app runs itself (an adaptation takes 10-30 s). Kept outside React,
// so it goes on, and its card shows the result, when the chat is left and opened again.

export type TaskState =
  | { status: 'running' }
  | { status: 'done'; entryId: string; note: string }
  | { status: 'failed'; message: string };

const tasks = new Map<string, TaskState>();
const listeners = new Set<() => void>();

function set(key: string, state: TaskState) {
  tasks.set(key, state);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Starts the adaptation once per key; a second call with the same key does nothing. */
export function startAdapt(client: QueryClient, key: string, entryId: string, kind: AdaptKind) {
  if (tasks.has(key)) return;
  set(key, { status: 'running' });
  adaptRecipe(entryId, kind)
    .then((res) => {
      client.setQueryData(['recipe', res.entry.id], res.entry);
      for (const k of ['recipes', 'me']) client.invalidateQueries({ queryKey: [k] });
      set(key, { status: 'done', entryId: res.entry.id, note: res.note });
    })
    .catch((e) => set(key, { status: 'failed', message: describeAdaptError(e).message }));
}

export function useTask(key: string): TaskState | undefined {
  return useSyncExternalStore(
    subscribe,
    () => tasks.get(key),
    () => tasks.get(key),
  );
}
