import { useSyncExternalStore } from 'react';

/** How far the user got with one recipe in cooking mode. Kept for the app session, per recipe. */
export interface CookProgress {
  /** Orders of the steps marked as done. */
  done: number[];
  /** When "Hazırım, başlayalım" was pressed (ms). */
  startedAt: number | null;
  /** When the last step was completed (ms). */
  finishedAt: number | null;
}

const EMPTY: CookProgress = { done: [], startedAt: null, finishedAt: null };
const progress = new Map<string, CookProgress>();
const listeners = new Set<() => void>();

function set(entryId: string, next: CookProgress) {
  progress.set(entryId, next);
  listeners.forEach((l) => l());
}

function get(entryId: string): CookProgress {
  return progress.get(entryId) ?? EMPTY;
}

export function startCooking(entryId: string) {
  const p = get(entryId);
  if (!p.startedAt) set(entryId, { ...p, startedAt: Date.now() });
}

export function markStepDone(entryId: string, order: number, isLast: boolean) {
  const p = get(entryId);
  const done = p.done.includes(order) ? p.done : [...p.done, order].sort((a, b) => a - b);
  set(entryId, { ...p, done, startedAt: p.startedAt ?? Date.now(), finishedAt: isLast ? Date.now() : p.finishedAt });
}

export function undoStep(entryId: string, order: number) {
  const p = get(entryId);
  set(entryId, { ...p, done: p.done.filter((o) => o !== order), finishedAt: null });
}

export function resetProgress(entryId: string) {
  set(entryId, EMPTY);
}

export function useCookProgress(entryId: string | undefined): CookProgress {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (entryId ? get(entryId) : EMPTY),
    () => EMPTY,
  );
}
