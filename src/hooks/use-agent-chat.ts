import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import { ApiError, describeError } from '@/lib/api';
import { streamAgent } from '@/lib/agent/stream';
import type { AgentAction, AgentEvent, AgentHistoryTurn, AgentTurn, AssistantTurn } from '@/lib/agent/types';

// One conversation for the whole app, kept in memory: it survives opening a recipe from the chat
// and coming back, and starts over when the app restarts or the user clears it.
let turns: AgentTurn[] = [];
let controller: AbortController | null = null;
/** Bumped by every new turn and by clear: a late "open" of an older turn is dropped. */
let runSeq = 0;
const listeners = new Set<() => void>();

function set(next: AgentTurn[]) {
  turns = next;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const snapshot = () => turns;

let seq = 0;
const newId = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;

/** The history the server reads: the last turns, answers with the cards they showed. */
function history(list: AgentTurn[]): AgentHistoryTurn[] {
  const out: AgentHistoryTurn[] = [];
  for (const t of list) {
    if (t.role === 'user') {
      out.push({ role: 'user', content: t.text });
      continue;
    }
    if (t.error || t.streaming) continue;
    const refs: NonNullable<AgentHistoryTurn['refs']> = t.blocks
      .flatMap((b): NonNullable<AgentHistoryTurn['refs']> =>
        b.type === 'recipes'
          ? b.recipes.map((r) => ({ kind: 'recipe', id: r.entry.id, title: r.entry.recipe.title }))
          : b.creators.map((c) => ({ kind: 'creator', id: c.username, title: c.full_name })),
      )
      .slice(0, 8);
    out.push({ role: 'assistant', content: t.text, refs: refs.length ? refs : undefined });
  }
  // Drop answers whose question was removed, so roles keep alternating.
  return out.slice(-10);
}

function patchLast(fn: (t: AssistantTurn) => AssistantTurn) {
  const last = turns[turns.length - 1];
  if (!last || last.role !== 'assistant') return;
  set([...turns.slice(0, -1), fn(last)]);
}

function reduce(t: AssistantTurn, e: AgentEvent): AssistantTurn {
  switch (e.type) {
    case 'status':
      return { ...t, status: e.label };
    case 'step': {
      const i = t.steps.findIndex((s) => s.id === e.step.id);
      const steps = i < 0 ? [...t.steps, e.step] : t.steps.map((s, j) => (j === i ? e.step : s));
      return { ...t, steps };
    }
    case 'delta':
      return { ...t, text: t.text + e.text };
    case 'reset':
      return { ...t, text: '' };
    case 'block':
      return { ...t, blocks: [...t.blocks.filter((b) => b.id !== e.block.id), e.block] };
    case 'action':
      return { ...t, action: e.action };
    case 'done':
      return { ...t, streaming: false, ms: e.ms };
    case 'error':
      return { ...t, streaming: false, error: { code: e.code, message: e.message } };
  }
}

/** Where an answer's "open" goes. */
export function openScreen(a: AgentAction) {
  switch (a.screen) {
    case 'recipe':
      if (a.id) router.push(`/recipe/${encodeURIComponent(a.id)}`);
      return;
    case 'creator':
      if (a.id) router.push(`/creator/${encodeURIComponent(a.id)}`);
      return;
    case 'pantry':
      router.push('/pantry');
      return;
    case 'shopping':
      router.push('/shopping');
      return;
    case 'chef':
      router.push(a.id ? { pathname: '/chef', params: { ingredients: a.id } } : '/chef');
      return;
    case 'my_recipes':
      router.navigate('/my-recipes');
      return;
    case 'journal':
      router.push('/journal');
      return;
    case 'voice_recipe':
      router.push('/voice-recipe');
      return;
    case 'add':
      router.push('/add');
      return;
  }
}

/** The assistant chat: the turns, and send / stop / retry / clear. */
export function useAgentChat() {
  const list = useSyncExternalStore(subscribe, snapshot, snapshot);
  const client = useQueryClient();
  const last = list[list.length - 1];
  const busy = last?.role === 'assistant' && last.streaming;

  const run = useCallback(
    async (base: AgentTurn[]) => {
      controller?.abort();
      const ctrl = new AbortController();
      controller = ctrl;
      const seq = ++runSeq;
      const reply: AssistantTurn = { id: newId(), role: 'assistant', steps: [], text: '', blocks: [], streaming: true };
      set([...base, reply]);
      let action: AgentAction | undefined;
      try {
        await streamAgent(
          history(base),
          (e) => {
            if (ctrl.signal.aborted) return;
            if (e.type === 'block' && e.block.type === 'recipes') {
              // Opening a card is instant: the detail screen finds the entry in the cache.
              for (const r of e.block.recipes) client.setQueryData(['recipe', r.entry.id], (old: unknown) => old ?? r.entry);
            }
            if (e.type === 'action') action = e.action;
            patchLast((t) => reduce(t, e));
          },
          ctrl.signal,
        );
        patchLast((t) => (t.streaming ? { ...t, streaming: false } : t));
        if (action?.type === 'open' && !ctrl.signal.aborted) {
          const go = action;
          Haptics.selectionAsync();
          // A short beat so the user sees what is being opened.
          setTimeout(() => {
            if (runSeq === seq) openScreen(go);
          }, 650);
        }
      } catch (e) {
        if (e instanceof ApiError && e.code === 'CANCELLED') {
          patchLast((t) => ({ ...t, streaming: false, steps: t.steps.filter((s) => s.status !== 'running') }));
          return;
        }
        const { title, message } = describeError(e);
        const code = e instanceof ApiError ? e.code : 'AGENT_ERROR';
        patchLast((t) => ({ ...t, streaming: false, error: { code, message: `${title}. ${message}` } }));
      } finally {
        if (controller === ctrl) controller = null;
      }
    },
    [client],
  );

  const send = useCallback(
    (text: string, opts?: { voice?: boolean }) => {
      const content = text.trim();
      if (!content) return;
      Haptics.selectionAsync();
      run([...turns, { id: newId(), role: 'user', text: content, voice: opts?.voice }]);
    },
    [run],
  );

  const retry = useCallback(() => {
    const i = turns.length - 1;
    if (i < 1 || turns[i].role !== 'assistant') return;
    run(turns.slice(0, i));
  }, [run]);

  const stop = useCallback(() => controller?.abort(), []);

  const clear = useCallback(() => {
    runSeq++;
    controller?.abort();
    set([]);
  }, []);

  return { turns: list, busy, send, retry, stop, clear };
}
