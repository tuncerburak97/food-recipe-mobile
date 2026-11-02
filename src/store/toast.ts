import { useSyncExternalStore } from 'react';

/** A short message at the bottom of the screen ("Tarifin hazırlanıyor…"), optionally with an action. */
export interface Toast {
  id: number;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
}

let current: Toast | null = null;
let counter = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function showToast(toast: Omit<Toast, 'id'>, durationMs = 4500) {
  counter += 1;
  current = { ...toast, id: counter };
  if (timer) clearTimeout(timer);
  timer = setTimeout(hideToast, durationMs);
  emit();
}

export function hideToast() {
  current = null;
  emit();
}

export function useToast(): Toast | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
