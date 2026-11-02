import { useSyncExternalStore } from 'react';

import { journalApi, type CookLog, type CookRating, type PickedPhoto } from '@/lib/journal';
import { queryClient } from '@/lib/queries';
import { useCookProgress } from '@/store/cook-progress';

/**
 * What the user entered on the finished page, shared by the "Nasıl oldu?" block (in the scroll
 * view) and the footer (which saves it). Kept per cook for the app session, so looking back at the
 * steps or closing the screen does not lose it. A new cook (progress reset) starts empty.
 */
export interface JournalDraft {
  rating?: CookRating;
  note: string;
  photo?: PickedPhoto;
  status: 'idle' | 'saving' | 'saved' | 'error';
  error?: unknown;
  /** The log once it is saved. */
  saved?: CookLog;
}

const EMPTY: JournalDraft = { note: '', status: 'idle' };
const drafts = new Map<string, JournalDraft>();
const listeners = new Set<() => void>();

function get(key: string): JournalDraft {
  return drafts.get(key) ?? EMPTY;
}

function set(key: string, next: JournalDraft) {
  drafts.set(key, next);
  listeners.forEach((l) => l());
}

/** One draft per cook: the entry and when this cook started. */
export function useDraftKey(entryId: string): string {
  const { startedAt } = useCookProgress(entryId);
  return `${entryId}:${startedAt ?? 0}`;
}

export function useJournalDraft(key: string): JournalDraft {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => get(key),
    () => EMPTY,
  );
}

/** Changes the draft; a change after a failed save clears the error. */
export function updateDraft(key: string, patch: Partial<Pick<JournalDraft, 'rating' | 'note' | 'photo'>>) {
  const d = get(key);
  if (d.status === 'saving' || d.status === 'saved') return;
  set(key, { ...d, ...patch, status: 'idle', error: undefined });
}

export function clearDraft(key: string) {
  drafts.delete(key);
  listeners.forEach((l) => l());
}

/** True when the user entered something that is not saved yet. */
export function hasUnsaved(d: JournalDraft): boolean {
  return d.status !== 'saved' && !!(d.rating || d.note.trim() || d.photo);
}

/**
 * Saves the draft as a cook log. Runs to the end even if the screen closes meanwhile, so a closed
 * screen never leaves a draft that would be saved twice.
 */
export async function saveDraft(key: string, entryId: string): Promise<CookLog | null> {
  const d = get(key);
  if (d.status === 'saving' || d.status === 'saved') return d.saved ?? null;
  set(key, { ...d, status: 'saving', error: undefined });
  try {
    const log = await journalApi.create({ entryId, rating: d.rating, note: d.note.trim() || undefined, photo: d.photo });
    set(key, { ...get(key), status: 'saved', saved: log });
    queryClient.invalidateQueries({ queryKey: ['journal'] });
    return log;
  } catch (error) {
    set(key, { ...get(key), status: 'error', error });
    return null;
  }
}
