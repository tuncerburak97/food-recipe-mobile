import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import { ApiError, describeError } from '@/lib/api';
import { streamAgent } from '@/lib/agent/stream';
import { startAdapt } from '@/lib/agent/tasks';
import type { GuideKind } from '@/lib/agent/capabilities';
import type { AgentAction, AgentBlock, AgentEvent, AgentHistoryTurn, AgentTurn, AssistantTurn } from '@/lib/agent/types';
import type { GenerationJob } from '@/lib/types';

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

type Ref = NonNullable<AgentHistoryTurn['refs']>[number];

/** The ids a card showed, so the server can resolve "ikincisini aç" in the next message. */
function refsOf(b: AgentBlock): Ref[] {
  switch (b.type) {
    case 'recipes':
      return b.recipes.map((r) => ({ kind: 'recipe', id: r.entry.id, title: r.entry.recipe.title }));
    case 'plan':
      return b.plan.map((p) => ({ kind: 'recipe', id: p.recipe.entry.id, title: p.recipe.entry.recipe.title }));
    case 'creators':
      return b.creators.map((c) => ({ kind: 'creator', id: c.username, title: c.full_name }));
    case 'notice':
      return b.links.filter((l) => l.screen === 'recipe' && l.id).map((l) => ({ kind: 'recipe', id: l.id!, title: b.lines[0] ?? '' }));
    case 'adapt':
      return [{ kind: 'recipe', id: b.entryId, title: b.title }];
    default:
      return [];
  }
}

/** The history the server reads: the last turns, answers with the cards they showed. */
function history(list: AgentTurn[]): AgentHistoryTurn[] {
  const out: AgentHistoryTurn[] = [];
  for (const t of list) {
    if (t.role === 'user') {
      out.push({ role: 'user', content: t.text });
      continue;
    }
    if (t.role === 'guide' || t.error || t.streaming) continue;
    const refs = t.blocks.flatMap(refsOf).slice(0, 12);
    out.push({ role: 'assistant', content: t.text, refs: refs.length ? refs : undefined });
  }
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
    case 'suggestions':
      return { ...t, suggestions: e.items };
    case 'action':
      return { ...t, action: e.action };
    case 'done':
      return { ...t, streaming: false, ms: e.ms };
    case 'error':
      return { ...t, streaming: false, error: { code: e.code, message: e.message } };
  }
}

/** Keeps the rest of the app in step with what an answer found or changed. */
function sync(client: QueryClient, b: AgentBlock) {
  switch (b.type) {
    case 'recipes':
    case 'plan':
      // Opening a card is instant: the detail screen finds the entry in the cache.
      for (const r of b.type === 'recipes' ? b.recipes : b.plan.map((p) => p.recipe)) {
        client.setQueryData(['recipe', r.entry.id], (old: unknown) => old ?? r.entry);
      }
      return;
    case 'notice':
      for (const c of b.changed) {
        if (c === 'pantry') client.invalidateQueries({ queryKey: ['kitchen'] });
        if (c === 'shopping') client.invalidateQueries({ queryKey: ['kitchen', 'shopping'] });
        if (c === 'recipes') {
          client.invalidateQueries({ queryKey: ['recipes'] });
          client.invalidateQueries({ queryKey: ['me'] });
        }
        if (c === 'profile') client.invalidateQueries({ queryKey: ['me'] });
      }
      return;
    case 'job':
      // Home's "hazırlanıyor" row and the inbox pick the job up at once.
      client.setQueryData<{ items: GenerationJob[]; unseen: number }>(['generations'], (old) =>
        old ? { ...old, items: [b.job, ...old.items.filter((j) => j.id !== b.job.id)] } : { items: [b.job], unseen: 0 },
      );
      client.invalidateQueries({ queryKey: ['generations'] });
      return;
  }
}

/** Where an answer's "open" goes. */
export function openScreen(a: Pick<AgentAction, 'screen' | 'id'>) {
  switch (a.screen) {
    case 'recipe':
      if (a.id) router.push(`/recipe/${encodeURIComponent(a.id)}`);
      return;
    case 'cook':
      if (a.id) router.push(`/cook/${encodeURIComponent(a.id)}`);
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
      router.push(a.id ? { pathname: '/add', params: { url: a.id } } : '/add');
      return;
    case 'inbox':
      router.push('/inbox');
      return;
    case 'settings':
      router.navigate('/settings');
      return;
    case 'search':
      router.navigate(a.id ? { pathname: '/search', params: { category: a.id } } : '/search');
      return;
  }
}

/** An Instagram post link in the message: the add screen takes it from here, no model call needed. */
const REEL_URL = /https?:\/\/(?:(?:www|m)\.)?(?:instagram\.com\/(?:reels?|p|tv)\/[\w-]+|youtube\.com\/(?:shorts\/|watch\?\S*?v=)[\w-]{11}|youtu\.be\/[\w-]{11})[^\s]*/i;

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
      const turnSeq = ++runSeq;
      const reply: AssistantTurn = { id: newId(), role: 'assistant', steps: [], text: '', blocks: [], streaming: true };
      set([...base, reply]);
      let action: AgentAction | undefined;
      try {
        await streamAgent(
          history(base),
          (e) => {
            if (ctrl.signal.aborted) return;
            if (e.type === 'block') {
              if (e.block.type === 'adapt') {
                const block = { ...e.block, taskKey: `${reply.id}:${e.block.id}` };
                startAdapt(client, block.taskKey, block.entryId, block.kind);
                e = { ...e, block };
              }
              sync(client, e.block);
            }
            if (e.type === 'action') action = e.action;
            const ev = e;
            patchLast((t) => reduce(t, ev));
          },
          ctrl.signal,
        );
        patchLast((t) => (t.streaming ? { ...t, streaming: false } : t));
        if (action?.type === 'open' && !ctrl.signal.aborted) {
          const go = action;
          Haptics.selectionAsync();
          // A short beat so the user sees what is being opened.
          setTimeout(() => {
            if (runSeq === turnSeq) openScreen(go);
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
      // A question card still open is answered by this message.
      const base = turns.filter((t) => t.role !== 'guide');
      const user: AgentTurn = { id: newId(), role: 'user', text: content, voice: opts?.voice };
      const link = REEL_URL.exec(content)?.[0];
      if (link) {
        const turnSeq = ++runSeq;
        const go: AgentAction = { type: 'open', screen: 'add', id: link };
        set([
          ...base,
          user,
          { id: newId(), role: 'assistant', steps: [], blocks: [], streaming: false, text: 'Bu videonun tarifini çıkarıyorum, ekleme ekranını açıyorum.', action: go },
        ]);
        setTimeout(() => {
          if (runSeq === turnSeq) openScreen(go);
        }, 500);
        return;
      }
      run([...base, user]);
    },
    [run],
  );

  /** Shows a question card (one at a time) at the end of the conversation. */
  const guide = useCallback((kind: GuideKind) => {
    controller?.abort();
    set([...turns.filter((t) => t.role !== 'guide'), { id: newId(), role: 'guide', kind }]);
  }, []);

  const dismissGuide = useCallback(() => set(turns.filter((t) => t.role !== 'guide')), []);

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

  return { turns: list, busy, send, retry, stop, clear, guide, dismissGuide };
}

/** The conversation without the actions, for places that only show it (Home's "continue" row). */
export function useAgentTurns(): AgentTurn[] {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
