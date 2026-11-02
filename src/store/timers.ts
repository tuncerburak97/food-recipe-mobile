import * as Haptics from 'expo-haptics';
import { useEffect, useState, useSyncExternalStore } from 'react';

import { cancelAlarm, scheduleAlarm } from '@/lib/alarm';
import { syncLiveActivity } from '@/lib/live-activity';

/**
 * Cooking timers. Each timer keeps its end time (not a countdown), so it stays right while the app is
 * in the background; the scheduled notification rings even when the phone is locked. Timers live for
 * as long as the app is open, so leaving the cooking screen does not stop them.
 */
export interface CookTimer {
  /** `${entryId}:${stepOrder}` — one timer per step. */
  id: string;
  entryId: string;
  recipeTitle: string;
  stepOrder: number;
  /** What the alarm says, e.g. "Adım 3: Soğanları kavur". */
  label: string;
  durationMs: number;
  status: 'running' | 'paused' | 'done';
  /** Set while running. */
  endsAt?: number;
  /** Set while paused. */
  remainingMs?: number;
  notificationId?: string;
  /** The user dismissed the alarm. */
  acknowledged?: boolean;
}

let timers: CookTimer[] = [];
const listeners = new Set<() => void>();
let ticker: ReturnType<typeof setInterval> | null = null;

function emit() {
  timers = [...timers];
  listeners.forEach((l) => l());
  syncLiveActivity(timers);
}

function update(id: string, patch: Partial<CookTimer>) {
  timers = timers.map((t) => (t.id === id ? { ...t, ...patch } : t));
  emit();
}

/** Marks running timers whose time is up as done; stops ticking when nothing runs. */
function tick() {
  const now = Date.now();
  let finished = false;
  timers = timers.map((t) => {
    if (t.status !== 'running' || t.endsAt == null || t.endsAt > now) return t;
    finished = true;
    return { ...t, status: 'done', endsAt: undefined, remainingMs: 0 };
  });
  if (finished) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    emit();
  }
  if (!timers.some((t) => t.status === 'running') && ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

function ensureTicker() {
  if (!ticker) ticker = setInterval(tick, 500);
}

async function arm(t: CookTimer, endsAt: number) {
  const id = await scheduleAlarm(endsAt, 'Süre doldu', `${t.label}\n${t.recipeTitle}`);
  // The timer may have been paused or removed while the notification was being scheduled.
  const current = timers.find((x) => x.id === t.id);
  if (!current || current.status !== 'running' || current.endsAt !== endsAt) {
    cancelAlarm(id ?? undefined);
    return;
  }
  if (id) update(t.id, { notificationId: id });
}

export function timerId(entryId: string, stepOrder: number) {
  return `${entryId}:${stepOrder}`;
}

export function startTimer(input: { entryId: string; recipeTitle: string; stepOrder: number; label: string; minutes: number }) {
  const id = timerId(input.entryId, input.stepOrder);
  const existing = timers.find((t) => t.id === id);
  if (existing) cancelAlarm(existing.notificationId);
  const durationMs = Math.round(input.minutes * 60_000);
  const endsAt = Date.now() + durationMs;
  const timer: CookTimer = { ...input, id, durationMs, status: 'running', endsAt };
  timers = [...timers.filter((t) => t.id !== id), timer];
  emit();
  ensureTicker();
  arm(timer, endsAt);
}

export function pauseTimer(id: string) {
  const t = timers.find((x) => x.id === id);
  if (!t || t.status !== 'running' || t.endsAt == null) return;
  cancelAlarm(t.notificationId);
  update(id, { status: 'paused', remainingMs: Math.max(0, t.endsAt - Date.now()), endsAt: undefined, notificationId: undefined });
}

export function resumeTimer(id: string) {
  const t = timers.find((x) => x.id === id);
  if (!t || t.status !== 'paused' || t.remainingMs == null) return;
  const endsAt = Date.now() + t.remainingMs;
  update(id, { status: 'running', endsAt, remainingMs: undefined });
  ensureTicker();
  arm({ ...t, status: 'running', endsAt }, endsAt);
}

/** Adds time to a running or finished timer ("+1 dk"). */
export function extendTimer(id: string, minutes: number) {
  const t = timers.find((x) => x.id === id);
  if (!t) return;
  if (t.status === 'paused') {
    update(id, { remainingMs: (t.remainingMs ?? 0) + minutes * 60_000, durationMs: t.durationMs + minutes * 60_000 });
    return;
  }
  cancelAlarm(t.notificationId);
  const base = t.status === 'running' && t.endsAt != null ? t.endsAt : Date.now();
  const endsAt = base + minutes * 60_000;
  update(id, {
    status: 'running',
    endsAt,
    remainingMs: undefined,
    acknowledged: false,
    notificationId: undefined,
    // Keep the progress bar honest: the total grows with the added time.
    durationMs: t.status === 'running' ? t.durationMs + minutes * 60_000 : minutes * 60_000,
  });
  ensureTicker();
  arm({ ...t, status: 'running', endsAt }, endsAt);
}

/** Ends a timer early ("Bitti"): the food was ready sooner, so no alarm. */
export function finishTimer(id: string) {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  removeTimer(id);
}

export function removeTimer(id: string) {
  const t = timers.find((x) => x.id === id);
  if (t) cancelAlarm(t.notificationId);
  timers = timers.filter((x) => x.id !== id);
  emit();
}

/** Dismisses a finished timer's alarm (the timer is removed). */
export function acknowledgeTimer(id: string) {
  removeTimer(id);
}

export function useTimers(): CookTimer[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => timers,
    () => timers,
  );
}

/** Milliseconds left on a timer at `now`. */
export function remaining(t: CookTimer, now: number): number {
  if (t.status === 'running' && t.endsAt != null) return Math.max(0, t.endsAt - now);
  if (t.status === 'paused') return t.remainingMs ?? 0;
  return 0;
}

/** The current time, refreshed every half second while `active` (for countdowns). */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active]);
  return now;
}

/** 754000 -> "12:34", 3723000 -> "1:02:03". */
export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm.padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}
