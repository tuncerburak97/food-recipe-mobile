import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';

import type { IconName } from '@/components/ui/icon';
import { prepareAlarms } from '@/lib/alarm';
import { api, ApiError } from '@/lib/api';
import { transcribeAudio } from '@/lib/transcribe';
import type { ChatTurn, Recipe } from '@/lib/types';
import {
  acknowledgeTimer,
  extendTimer,
  formatClock,
  pauseTimer,
  remaining,
  removeTimer,
  resumeTimer,
  startTimer,
  timerId,
  type CookTimer,
} from '@/store/timers';

import { COMMAND_HINTS, parseCommand, type VoiceCommand } from './commands';
import { amountAnswer, ingredientsLine } from './ingredients';
import { INTRO_LINE, pageLine } from './lines';
import { audio, canSpeak, prepareVoice, recognizer, speak, stopSpeaking } from './native';
import { voiceIntroStorage, voiceOnStorage } from './prefs';
import { brief, firstSentence, plain, spokenClock, spokenDuration, toSpeech, words } from './text';

/** native: the OS recognizer listens all the time. record: tap to talk, sent to the backend. none: read aloud only. */
export type VoiceInput = 'native' | 'record' | 'none';
/**
 * off · starting (asking for permission) · speaking · listening · recording (tap to talk) ·
 * working (between a command and its result) · waiting (on, waiting for a tap).
 */
export type VoicePhase = 'off' | 'starting' | 'speaking' | 'listening' | 'recording' | 'working' | 'waiting';
export type VoiceSheet = 'intro' | 'denied' | 'unavailable';

/** A short confirmation shown in the status pill for a moment ("Adım tamamlandı"). */
export interface VoiceChip {
  id: number;
  title: string;
  icon: IconName;
}

/** A card under the controls for answers worth reading: what was heard, then the answer. */
export interface VoiceFeedback {
  id: number;
  heard?: string;
  title: string;
  detail?: string;
  icon: IconName;
}

export interface VoiceState {
  on: boolean;
  phase: VoicePhase;
  input: VoiceInput;
  /** Waiting for the assistant's answer (it can still be talked over). */
  thinking: boolean;
  sheet: VoiceSheet | null;
  /** The system can still show its permission prompt. */
  canAskAgain: boolean;
  chip: VoiceChip | null;
  feedback: VoiceFeedback | null;
  introSeen: boolean;
}

/** What cook mode tells the session on every render. */
export interface VoiceContext {
  entryId: string;
  recipe: Recipe;
  /** 0 = ingredients, 1..n = steps, n + 1 = finished. */
  page: number;
  onGo: (page: number) => void;
  onComplete: () => void;
}

/** Tap-to-talk recorder, supplied by `useVoiceRecorder` (expo-audio). */
export interface VoiceRecorder {
  start(): Promise<void>;
  /** Stops and returns the file. */
  stop(): Promise<string | null>;
  /** Input level in dBFS, when metering works. */
  metering(): number | undefined;
  mimeType: string;
}

type Timeout = ReturnType<typeof setTimeout>;

const QUICK: VoiceCommand['kind'][] = ['next', 'skip', 'previous', 'repeat', 'stop', 'off', 'goto', 'timer', 'timerAdd', 'timerPause', 'timerCancel'];
/** Silence after a short command / after a sentence before it counts as said (interim results). */
const SETTLE_QUICK_MS = 700;
const SETTLE_MS = 1500;
const MAX_FAILURES = 6;
const RECORD_MAX_MS = 15_000;
const RECORD_NOTHING_MS = 6000;
const RECORD_SILENCE_MS = 1100;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** The server said it has no speech to text (STT_NOT_CONFIGURED); stop offering tap to talk until the app restarts. */
let serverSttMissing = false;

function detectInput(): VoiceInput {
  const R = recognizer();
  if (R) {
    // iOS reports availability for the phone's own language only; it is checked by starting instead.
    if (Platform.OS !== 'android') return 'native';
    try {
      if (R.isRecognitionAvailable()) return 'native';
    } catch {
      // fall through to recording
    }
  }
  return audio() && !serverSttMissing ? 'record' : 'none';
}

function shorten(text: string, max = 60): string {
  const t = text.trim().replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/**
 * Hands-free cook mode. Reads each new page aloud, then listens (paused while speaking so it does
 * not hear itself) and runs what it hears. One instance per cook screen; React talks to it through
 * `useVoiceSession`.
 */
export class VoiceSession {
  private state: VoiceState = {
    on: false,
    phase: 'off',
    input: 'none',
    thinking: false,
    sheet: null,
    canAskAgain: true,
    chip: null,
    feedback: null,
    introSeen: false,
  };
  private listeners = new Set<() => void>();
  private levelListener: ((v: number) => void) | null = null;
  private ctx: VoiceContext | null = null;
  private timers: CookTimer[] = [];
  private ringingId: string | null = null;
  private recorder: VoiceRecorder | null = null;
  private subs: { remove(): void }[] = [];
  /** Bumped on mount and unmount, so late async work from an old mount is dropped. */
  private gen = 0;
  private mounted = false;
  private focused = true;
  private foreground = true;

  private speechToken = 0;
  private askToken = 0;
  private recordToken = 0;
  private feedbackId = 0;
  /** The "Düşünüyorum…" card, cleared when its question is dropped. */
  private thinkingCard = 0;

  private rec: 'idle' | 'running' | 'stopping' = 'idle';
  private recStartedAt = 0;
  private recHeard = false;
  private recErrored = false;
  private heard: string[] = [];
  private failures = 0;

  private settleTimer?: Timeout;
  private restartTimer?: Timeout;
  private stoppingTimer?: Timeout;
  private pageTimer?: Timeout;
  private feedbackTimer?: Timeout;
  private chipTimer?: Timeout;
  private recordPoll?: ReturnType<typeof setInterval>;
  private recordStartedAt = 0;
  /** Whether the recording had speech in it; null while it cannot be told (no metering yet). */
  private recordVoiced: boolean | null = null;

  private history: ChatTurn[] = [];
  /** A line asked for while another screen or app was in front; said when cook mode is back. */
  private pending: string | null = null;
  private expectMinutesUntil = 0;
  private taughtTimer = false;

  // ---- React glue ----

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = () => this.state;

  /** Live microphone level, 0..1 (kept out of React state: it changes ten times a second). */
  onLevel(fn: (v: number) => void) {
    this.levelListener = fn;
    return () => {
      if (this.levelListener === fn) this.levelListener = null;
    };
  }

  mount() {
    if (this.mounted) return;
    this.mounted = true;
    this.gen += 1;
    this.set({ input: detectInput() });
    const R = this.state.input === 'native' ? recognizer() : null;
    if (R) {
      this.subs.push(
        R.addListener('result', (e) => this.onResult(e.isFinal, e.results.map((r) => r.transcript))),
        R.addListener('error', (e) => this.onRecognitionError(e.error)),
        R.addListener('end', () => this.onRecognitionEnd()),
        R.addListener('volumechange', (e) => {
          if (this.rec === 'running' && this.state.phase === 'listening') this.level(clamp01(e.value / 10));
        }),
      );
    }
    this.subs.push(
      AppState.addEventListener('change', (s) => {
        // "inactive" also happens behind the permission prompt; only leaving the app counts.
        if (s === 'background' || s === 'active') this.setAwake({ foreground: s === 'active' });
      }),
    );
    this.restore();
  }

  unmount() {
    this.mounted = false;
    this.gen += 1;
    this.halt();
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    clearTimeout(this.feedbackTimer);
    clearTimeout(this.chipTimer);
    this.set({ on: false, phase: 'off', thinking: false, chip: null, feedback: null, sheet: null });
  }

  setContext(ctx: VoiceContext) {
    const prev = this.ctx;
    this.ctx = ctx;
    if (!prev || prev.page === ctx.page) return;
    clearTimeout(this.pageTimer);
    this.expectMinutesUntil = 0;
    this.cancelAnswer();
    if (this.state.on && this.awake()) this.readPage();
  }

  /** The app's timers; announces one that just rang. */
  setTimers(list: CookTimer[]) {
    this.timers = list;
    const ringing = list.find((t) => t.status === 'done' && !t.acknowledged);
    const id = ringing?.id ?? null;
    if (id === this.ringingId) return;
    this.ringingId = id;
    if (!ringing || !this.state.on || !this.awake()) return;
    this.confirm('Süre doldu', 'alarm-outline', 4000);
    const label = ringing.label.replace(/[\s.…]+$/, '');
    this.say(`Süre doldu. ${label}.${this.state.input === 'native' ? ' Kapatmak için “tamam” de.' : ''}`);
  }

  setFocused(focused: boolean) {
    this.setAwake({ focused });
  }

  attachRecorder(recorder: VoiceRecorder | null) {
    this.recorder = recorder;
    return () => {
      if (this.recorder === recorder) this.recorder = null;
    };
  }

  // ---- user actions ----

  /** The mic button. */
  toggle() {
    if (this.state.phase === 'starting') return;
    if (this.state.on) {
      this.turnOff();
      return;
    }
    if (!this.state.introSeen) {
      this.set({ sheet: 'intro' });
      return;
    }
    this.enable();
  }

  /** "Sesli komutları aç": asks for the microphone only now, when the user turns voice on. */
  async enable() {
    this.set({ sheet: null });
    if (this.state.input === 'none' && !canSpeak()) {
      this.set({ sheet: 'unavailable' });
      return;
    }
    if (!this.state.introSeen) {
      this.set({ introSeen: true });
      voiceIntroStorage.set('1');
    }
    this.set({ phase: 'starting' });
    const gen = this.gen;
    const permission = await this.permission(true);
    if (gen !== this.gen) return;
    if (!permission.granted) {
      this.set({ phase: 'off', sheet: 'denied', canAskAgain: permission.canAskAgain });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    voiceOnStorage.set('1');
    this.turnOn(true);
  }

  closeSheet() {
    this.set({ sheet: null });
  }

  /** The status pill: stop reading, drop a pending answer, talk (tap to talk) or listen again. */
  tap() {
    const { on, phase, input, thinking } = this.state;
    if (!on) return;
    if (phase === 'speaking') {
      this.hush();
      if (input !== 'record') return;
    }
    if (thinking) {
      this.cancelAnswer();
      this.dismissFeedback();
      if (input !== 'record') return;
    }
    if (input === 'record') {
      if (this.state.phase === 'recording') this.finishRecording(false);
      else if (this.state.phase !== 'working') this.startRecording();
      return;
    }
    if (input === 'native') {
      if (phase === 'waiting') {
        this.failures = 0;
        this.listen();
      }
      return;
    }
    this.readPage();
  }

  dismissFeedback() {
    clearTimeout(this.feedbackTimer);
    this.set({ feedback: null });
  }

  // ---- on / off ----

  private async restore() {
    const gen = this.gen;
    const [on, intro] = await Promise.all([voiceOnStorage.get(), voiceIntroStorage.get()]);
    if (gen !== this.gen) return;
    this.set({ introSeen: intro === '1' });
    if (on !== '1' || this.state.on || this.state.phase === 'starting') return;
    // Remembered "on": start again only if permission is still there; never prompt here.
    const permission = await this.permission(false);
    if (gen !== this.gen || !permission.granted || this.state.on) return;
    this.turnOn(false);
  }

  private async permission(ask: boolean): Promise<{ granted: boolean; canAskAgain: boolean }> {
    try {
      if (this.state.input === 'native') {
        const R = recognizer();
        if (!R) return { granted: false, canAskAgain: false };
        const p = ask ? await R.requestPermissionsAsync() : await R.getPermissionsAsync();
        return { granted: p.granted && !p.restricted, canAskAgain: p.canAskAgain };
      }
      if (this.state.input === 'record') {
        const A = audio();
        if (!A) return { granted: false, canAskAgain: false };
        const p = ask ? await A.requestRecordingPermissionsAsync() : await A.getRecordingPermissionsAsync();
        return { granted: p.granted, canAskAgain: p.canAskAgain };
      }
      // Read aloud only: nothing to ask.
      return { granted: true, canAskAgain: true };
    } catch {
      return { granted: false, canAskAgain: false };
    }
  }

  private turnOn(justEnabled: boolean) {
    this.set({ on: true, phase: 'working', sheet: null });
    Haptics.selectionAsync();
    const gen = this.gen;
    prepareVoice().finally(() => {
      if (gen !== this.gen || !this.state.on) return;
      const intro =
        this.state.input === 'native'
          ? INTRO_LINE
          : this.state.input === 'record'
            ? 'Sesli komutlar açık. Konuşmadan önce “Dokun, konuş” düğmesine dokun.'
            : 'Bu cihazda sesli komut yok, ama adımları sesli okuyacağım.';
      this.readPage(justEnabled ? intro : undefined);
    });
  }

  private turnOff() {
    voiceOnStorage.set('0');
    this.halt();
    this.set({ on: false, phase: 'off', thinking: false });
    Haptics.selectionAsync();
  }

  /** Stops speech, listening, recording and pending work. */
  private halt() {
    this.speechToken += 1;
    stopSpeaking();
    this.cancelAnswer();
    this.stopRecognition();
    this.cancelRecording();
    clearTimeout(this.pageTimer);
    clearTimeout(this.restartTimer);
    this.pending = null;
    this.expectMinutesUntil = 0;
    this.level(0);
  }

  private awake() {
    return this.mounted && this.focused && this.foreground;
  }

  private setAwake(patch: { focused?: boolean; foreground?: boolean }) {
    const was = this.awake();
    if (patch.focused != null) this.focused = patch.focused;
    if (patch.foreground != null) this.foreground = patch.foreground;
    const now = this.awake();
    if (was === now || !this.state.on) return;
    if (now) {
      const text = this.pending;
      this.pending = null;
      if (text) this.say(text);
      else this.resume();
      return;
    }
    // Another screen or app is in front: nothing may speak or listen behind it.
    this.speechToken += 1;
    stopSpeaking();
    this.stopRecognition();
    this.cancelRecording();
    clearTimeout(this.restartTimer);
    this.set({ phase: 'waiting' });
    this.level(0);
  }

  // ---- speaking ----

  private say(text: string) {
    if (!this.state.on) return;
    this.stopRecognition();
    this.cancelRecording();
    clearTimeout(this.pageTimer);
    if (!this.awake()) {
      // E.g. Android's permission dialog briefly sends the app to the background.
      this.pending = text;
      this.set({ phase: 'waiting' });
      return;
    }
    const token = ++this.speechToken;
    const started = speak(toSpeech(text), () => token === this.speechToken && this.resume());
    if (started) {
      this.set({ phase: 'speaking' });
      this.level(0);
    } else {
      this.resume();
    }
  }

  private hush() {
    this.speechToken += 1;
    stopSpeaking();
    this.resume();
  }

  /** Back to listening (always-on recognizer) or to waiting for a tap. */
  private resume() {
    if (!this.state.on) return;
    if (this.state.input === 'native' && this.awake()) this.listen();
    else this.set({ phase: 'waiting' });
  }

  private readPage(prefix?: string) {
    const ctx = this.ctx;
    if (!ctx || !this.state.on) return;
    const step = ctx.page >= 1 ? ctx.recipe.steps[ctx.page - 1] : undefined;
    const teach = !!step?.duration_minutes && !this.taughtTimer && this.state.input === 'native';
    if (teach) this.taughtTimer = true;
    const line = pageLine(ctx.recipe, ctx.page, { teachTimer: teach, listening: this.state.input !== 'none' });
    this.say(prefix ? `${prefix} ${line}` : line);
  }

  // ---- listening (OS recognizer) ----

  private hints(): string[] {
    const names = this.ctx?.recipe.ingredient_groups.flatMap((g) => g.ingredients.map((i) => i.name.trim())) ?? [];
    return [...COMMAND_HINTS, ...new Set(names)].slice(0, 60);
  }

  private listen() {
    const R = recognizer();
    if (!R || !this.state.on || !this.awake()) return;
    clearTimeout(this.restartTimer);
    this.set({ phase: 'listening' });
    // A stopping session reports "end" first; the next one starts from there.
    if (this.rec !== 'idle') return;
    this.heard = [];
    this.recHeard = false;
    this.recErrored = false;
    this.recStartedAt = Date.now();
    this.rec = 'running';
    try {
      R.start({
        lang: 'tr-TR',
        interimResults: true,
        continuous: true,
        maxAlternatives: 3,
        addsPunctuation: false,
        contextualStrings: this.hints(),
        volumeChangeEventOptions: { enabled: true, intervalMillis: 120 },
      });
    } catch {
      this.rec = 'idle';
      this.failures += 1;
      this.scheduleRestart();
    }
  }

  private stopRecognition() {
    clearTimeout(this.settleTimer);
    clearTimeout(this.restartTimer);
    if (this.rec !== 'running') return;
    this.rec = 'stopping';
    this.level(0);
    try {
      recognizer()?.abort();
    } catch {
      this.rec = 'idle';
      return;
    }
    // In case "end" never comes.
    clearTimeout(this.stoppingTimer);
    this.stoppingTimer = setTimeout(() => this.onRecognitionEnd(), 1500);
  }

  private onRecognitionEnd() {
    clearTimeout(this.stoppingTimer);
    const was = this.rec;
    if (was === 'idle') return;
    this.rec = 'idle';
    this.level(0);
    if (was === 'running') {
      // Ended by itself: a time limit, silence or an error. Quick empty ends count as failures too.
      if (!this.recHeard && !this.recErrored && Date.now() - this.recStartedAt < 1500) this.failures += 1;
      this.scheduleRestart();
    } else if (this.state.on && this.state.phase === 'listening' && this.awake()) {
      // Stopped by us after a sentence: listen again right away, so the next words are not lost.
      this.restartTimer = setTimeout(() => this.listen(), 60);
    }
  }

  private scheduleRestart() {
    if (!this.state.on || this.state.phase !== 'listening' || !this.awake()) return;
    if (this.failures >= MAX_FAILURES) {
      this.set({ phase: 'waiting' });
      this.notify({ title: 'Dinleme durdu', detail: 'Yeniden başlatmak için “Dinle”ye dokun.', icon: 'mic-off-outline' }, 6000);
      return;
    }
    const delay = this.failures === 0 ? 250 : Math.min(8000, 500 * 2 ** this.failures);
    clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => this.listen(), delay);
  }

  private onResult(isFinal: boolean, transcripts: string[]) {
    if (this.rec !== 'running' || this.state.phase !== 'listening') return;
    const alternatives = transcripts.map((t) => t.trim()).filter(Boolean);
    if (!alternatives.length) return;
    this.recHeard = true;
    this.failures = 0;
    this.heard = alternatives;
    clearTimeout(this.settleTimer);
    if (isFinal) {
      this.handle(alternatives);
      return;
    }
    // Interim results: act once the words stop changing; short commands sooner.
    const quick = QUICK.includes(parseCommand(alternatives[0], { expectMinutes: this.expectingMinutes() }).kind);
    this.settleTimer = setTimeout(() => this.handle(this.heard), quick ? SETTLE_QUICK_MS : SETTLE_MS);
  }

  private onRecognitionError(code: string) {
    if (code === 'not-allowed') {
      this.turnOff();
      this.set({ sheet: 'denied', canAskAgain: false });
      return;
    }
    if (code === 'language-not-supported' || code === 'service-not-allowed') {
      this.fallBack();
      return;
    }
    // Normal ends of a quiet session; anything else counts towards giving up. "end" follows.
    if (code !== 'aborted' && code !== 'no-speech' && code !== 'speech-timeout') {
      this.recErrored = true;
      this.failures += 1;
    }
  }

  /** The recognizer cannot do Turkish here: tap to talk if recording works, else read aloud only. */
  private fallBack() {
    this.stopRecognition();
    const next: VoiceInput = audio() && !serverSttMissing ? 'record' : 'none';
    this.set({ input: next });
    this.notify(
      next === 'record'
        ? { title: 'Sürekli dinleme bu cihazda yok', detail: 'Konuşmadan önce “Dokun, konuş” düğmesine dokun.', icon: 'mic-outline' }
        : { title: 'Sesli komut bu cihazda yok', detail: 'Adımları sesli okumaya devam ediyorum.', icon: 'mic-off-outline' },
      7000,
    );
    this.resume();
  }

  private expectingMinutes() {
    return Date.now() < this.expectMinutesUntil;
  }

  /** One finished sentence (with the recognizer's alternatives). */
  private handle(alternatives: string[]) {
    clearTimeout(this.settleTimer);
    if (!alternatives.length || !this.state.on) return;
    // Restart for the next sentence (iOS keeps adding to one transcript otherwise).
    this.stopRecognition();
    const expectMinutes = this.expectingMinutes();
    this.expectMinutesUntil = 0;
    const parsed = alternatives.map((text) => ({ text, cmd: parseCommand(text, { expectMinutes }) }));
    const best = parsed.find((p) => p.cmd.kind !== 'unknown' && p.cmd.kind !== 'question') ?? parsed[0];
    this.run(best.cmd, best.text);
  }

  // ---- tap to talk ----

  private async startRecording() {
    const rec = this.recorder;
    if (!rec) {
      this.confirm('Bir saniye, tekrar dokun', 'mic-outline');
      return;
    }
    this.speechToken += 1;
    stopSpeaking();
    const token = ++this.recordToken;
    this.recordStartedAt = Date.now();
    this.recordVoiced = null;
    this.set({ phase: 'recording' });
    try {
      await rec.start();
    } catch {
      if (token !== this.recordToken) return;
      this.set({ phase: 'waiting' });
      this.confirm('Mikrofon açılamadı', 'mic-off-outline');
      return;
    }
    if (token !== this.recordToken) {
      rec.stop().catch(() => undefined);
      return;
    }
    // Stops by itself after the user goes quiet. The noise floor comes from the quietest early
    // samples, so a fan or extractor hood does not count as speech.
    const startedAt = Date.now();
    const early: number[] = [];
    let threshold: number | null = null;
    let voiced = false;
    let quietSince = 0;
    clearInterval(this.recordPoll);
    this.recordPoll = setInterval(() => {
      if (token !== this.recordToken) return;
      const now = Date.now();
      const elapsed = now - startedAt;
      if (elapsed > RECORD_MAX_MS) return this.finishRecording(false);
      const db = rec.metering();
      if (db == null || !Number.isFinite(db)) {
        if (elapsed > 8000) this.finishRecording(false);
        return;
      }
      this.level(clamp01((db + 60) / 50));
      if (elapsed < 400) {
        early.push(db);
        return;
      }
      threshold ??= Math.max(-50, Math.min(-30, Math.min(...early, db) + 10));
      const loud = db > threshold;
      if (loud) {
        voiced = true;
        quietSince = 0;
      }
      this.recordVoiced = voiced;
      if (loud) return;
      if (voiced) {
        quietSince ||= now;
        if (now - quietSince > RECORD_SILENCE_MS) this.finishRecording(false);
      } else if (elapsed > RECORD_NOTHING_MS) {
        this.finishRecording(true);
      }
    }, 100);
  }

  private async finishRecording(nothingHeard: boolean) {
    const rec = this.recorder;
    clearInterval(this.recordPoll);
    if (this.state.phase !== 'recording' || !rec) return;
    // A new token also tells a start still in progress to stop the recorder it opened.
    const token = ++this.recordToken;
    this.level(0);
    this.set({ phase: 'working' });
    let uri: string | null = null;
    try {
      uri = await rec.stop();
    } catch {
      uri = null;
    }
    if (token !== this.recordToken || !this.state.on) return;
    // No speech in it (or too short to tell): nothing worth sending.
    const silent = this.recordVoiced === false || (this.recordVoiced === null && Date.now() - this.recordStartedAt < 700);
    if (nothingHeard || silent || !uri) {
      this.confirm('Bir şey duyamadım', 'mic-outline');
      this.resume();
      return;
    }
    try {
      const result = await transcribeAudio(uri, { language: 'tr', prompt: this.hints().join(', '), mimeType: rec.mimeType, timeoutMs: 30_000 });
      if (token !== this.recordToken || !this.state.on) return;
      const text = result.text.trim();
      if (!text) {
        this.confirm('Bir şey duyamadım', 'mic-outline');
        this.resume();
        return;
      }
      this.handle([text]);
    } catch (err) {
      if (token !== this.recordToken || !this.state.on) return;
      const code = err instanceof ApiError ? err.code : '';
      if (code === 'STT_NOT_CONFIGURED') {
        // No speech to text on the server yet: keep reading steps aloud, stop offering the mic.
        serverSttMissing = true;
        this.set({ input: 'none' });
        this.notify(
          { title: 'Ses tanıma henüz hazır değil', detail: 'Şimdilik ekrandaki düğmeleri kullan; adımları sesli okumaya devam ediyorum.', icon: 'mic-off-outline' },
          8000,
        );
        this.say('Ses tanıma henüz hazır değil. Adımları sesli okumaya devam edeceğim.');
        return;
      }
      const line = code === 'NETWORK_ERROR' || code === 'TIMEOUT' ? 'Bağlantı yok gibi. Bir daha dener misin?' : 'Söylediğini anlayamadım. Bir daha dener misin?';
      this.notify({ title: line, icon: 'cloud-offline-outline' });
      this.say(line);
    }
  }

  private cancelRecording() {
    clearInterval(this.recordPoll);
    if (this.state.phase !== 'recording') return;
    this.recordToken += 1;
    this.recorder?.stop().catch(() => undefined);
    this.level(0);
  }

  // ---- commands ----

  private run(cmd: VoiceCommand, heard: string) {
    const ctx = this.ctx;
    if (!ctx) return this.resume();
    const { recipe, page } = ctx;
    const total = recipe.steps.length;
    const step = page >= 1 && page <= total ? recipe.steps[page - 1] : undefined;
    const ringing = this.timers.find((t) => t.status === 'done' && !t.acknowledged);

    if (cmd.kind === 'unknown') {
      // Short phrases were probably meant for us; longer chatter is ignored quietly.
      const n = words(heard).length;
      if (n > 0 && n <= 4) this.confirm('Anlayamadım', 'help-circle-outline');
      return this.resume();
    }
    Haptics.selectionAsync();
    // The newest instruction wins over an answer still on its way.
    if (cmd.kind !== 'question' && cmd.kind !== 'amount') this.cancelAnswer();

    switch (cmd.kind) {
      case 'stop':
        if (ringing) {
          acknowledgeTimer(ringing.id);
          this.confirm('Alarm kapandı', 'alarm-outline');
        } else {
          this.confirm('Tamam, sustum', 'volume-mute-outline');
        }
        return this.resume();

      case 'off':
        this.turnOff();
        speak(toSpeech('Sesli komutları kapattım.'), () => undefined);
        return;

      case 'next':
      case 'skip':
        if (ringing && cmd.kind === 'next') {
          acknowledgeTimer(ringing.id);
          this.confirm('Alarm kapandı', 'alarm-outline');
          return this.say('Alarmı kapattım.');
        }
        if (page > total) {
          this.confirm('Tarif tamam', 'checkmark-circle-outline');
          return this.say('Tarif bitti. Afiyet olsun.');
        }
        this.confirm(page === 0 ? 'Başlıyoruz' : cmd.kind === 'skip' ? 'Sonraki adım' : 'Adım tamamlandı', 'arrow-forward-outline');
        this.awaitPage();
        if (cmd.kind === 'skip' && page > 0) ctx.onGo(page + 1);
        else ctx.onComplete();
        return;

      case 'previous':
        if (page <= 0) {
          this.confirm('Zaten en baştayız', 'arrow-back-outline');
          return this.say('Zaten en baştayız.');
        }
        this.confirm(page === 1 ? 'Malzemeler' : 'Önceki adım', 'arrow-back-outline');
        this.awaitPage();
        ctx.onGo(page - 1);
        return;

      case 'goto': {
        const to = cmd.to === 'ingredients' ? 0 : cmd.to === 'last' ? total : cmd.to;
        if (to > total) {
          this.confirm(`Bu tarifte ${total} adım var`, 'list-outline');
          return this.say(`Bu tarifte ${total} adım var.`);
        }
        this.confirm(to === 0 ? 'Malzemeler' : `Adım ${to}`, to < page ? 'arrow-back-outline' : 'arrow-forward-outline');
        if (to === page) return this.readPage();
        this.awaitPage();
        ctx.onGo(to);
        return;
      }

      case 'repeat':
        this.confirm('Tekrar okuyorum', 'refresh-outline');
        return this.readPage();

      case 'timer':
        return this.runTimer(cmd.minutes);

      case 'timerAdd': {
        const t = ringing ?? this.liveTimer();
        if (!t) return this.runTimer(cmd.minutes);
        extendTimer(t.id, cmd.minutes);
        this.confirm(`${spokenDuration(cmd.minutes)} eklendi`, 'timer-outline');
        return this.say(`Tamam, ${spokenDuration(cmd.minutes)} ekledim.`);
      }

      case 'timerPause': {
        const t = this.liveTimer('running');
        if (!t) {
          this.confirm('Çalışan zamanlayıcı yok', 'timer-outline');
          return this.say('Çalışan zamanlayıcı yok.');
        }
        pauseTimer(t.id);
        this.confirm('Zamanlayıcı duraklatıldı', 'pause-outline');
        return this.say('Zamanlayıcıyı duraklattım. Devam için “zamanlayıcı devam” de.');
      }

      case 'timerCancel': {
        if (ringing) {
          acknowledgeTimer(ringing.id);
          this.confirm('Alarm kapandı', 'alarm-outline');
          return this.say('Alarmı kapattım.');
        }
        const t = this.liveTimer();
        if (!t) {
          this.confirm('Kurulu zamanlayıcı yok', 'timer-outline');
          return this.say('Kurulu zamanlayıcı yok.');
        }
        removeTimer(t.id);
        this.confirm('Zamanlayıcı kapandı', 'timer-outline');
        return this.say('Zamanlayıcıyı kapattım.');
      }

      case 'timerLeft': {
        const now = Date.now();
        const live = this.timers
          .filter((t) => t.entryId === ctx.entryId && t.status !== 'done')
          .sort((a, b) => Number(b.stepOrder === step?.order) - Number(a.stepOrder === step?.order));
        if (!live.length) {
          const minutes = step?.duration_minutes;
          this.confirm('Zamanlayıcı kurulu değil', 'timer-outline');
          return this.say(minutes ? `Zamanlayıcı kurulu değil. Bu adım ${spokenDuration(minutes)} sürüyor.` : 'Kurulu zamanlayıcı yok.');
        }
        const named = live.length > 1 || live[0].stepOrder !== step?.order;
        const spoken = live.map((t) => `${named ? `Adım ${t.stepOrder}: ` : ''}${spokenClock(remaining(t, now))} kaldı${t.status === 'paused' ? ', duraklatıldı' : ''}.`);
        const shown = live.map((t) => `Adım ${t.stepOrder} · ${formatClock(remaining(t, now))}${t.status === 'paused' ? ' · duraklatıldı' : ''}`);
        if (live.length > 1) this.notify({ heard, title: 'Kalan süreler', detail: shown.join('\n'), icon: 'timer-outline' }, 7000);
        else this.confirm(`${formatClock(remaining(live[0], now))} kaldı`, 'timer-outline');
        return this.say(spoken.join(' '));
      }

      case 'ingredients':
        this.confirm('Malzemeleri okuyorum', 'list-outline');
        return this.say(ingredientsLine(recipe));

      case 'amount': {
        const answer = amountAnswer(recipe, cmd.text, step?.group_id);
        if (!answer) return this.ask(cmd.text);
        this.notify({ heard, title: answer.lines[0], detail: answer.lines.slice(1).join('\n') || undefined, icon: 'list-outline' }, 7000);
        return this.say(answer.spoken);
      }

      case 'question':
        return this.ask(cmd.text);
    }
  }

  private runTimer(minutes: number | null) {
    const ctx = this.ctx;
    if (!ctx) return;
    const step = ctx.page >= 1 && ctx.page <= ctx.recipe.steps.length ? ctx.recipe.steps[ctx.page - 1] : undefined;
    if (!step) {
      this.confirm('Önce bir adıma geç', 'timer-outline');
      return this.say(ctx.page === 0 ? 'Zamanlayıcıyı adımlarda kurabilirim. Önce “başla” de.' : 'Zamanlayıcıyı bir adımdayken kurabilirim.');
    }
    const existing = this.timers.find((t) => t.id === timerId(ctx.entryId, step.order));
    if (minutes == null && existing?.status === 'paused') {
      resumeTimer(existing.id);
      this.confirm('Zamanlayıcı devam ediyor', 'timer-outline');
      return this.say('Zamanlayıcı devam ediyor.');
    }
    const planned = minutes ?? (step.duration_minutes && step.duration_minutes > 0 ? step.duration_minutes : null);
    if (planned == null) {
      this.expectMinutesUntil = Date.now() + 20_000;
      this.confirm('Kaç dakika?', 'timer-outline', 6000);
      return this.say('Kaç dakika kurayım?');
    }
    // Same limits as the step timer's − / + (1 to 240 minutes), but seconds are fine by voice.
    const m = Math.min(240, Math.max(5 / 60, planned));
    prepareAlarms(); // asks for notification permission the first time, like the step timer
    startTimer({ entryId: ctx.entryId, recipeTitle: ctx.recipe.title, stepOrder: step.order, minutes: m, label: `Adım ${step.order}: ${shorten(step.text)}` });
    this.confirm(`Zamanlayıcı · ${formatClock(m * 60_000)}`, 'timer-outline', 3500);
    this.say(`Tamam, ${spokenDuration(m)}. Süre dolunca haber veririm.`);
  }

  /** This recipe's timer for the current step, else any of its timers. */
  private liveTimer(status?: CookTimer['status']): CookTimer | undefined {
    const ctx = this.ctx;
    if (!ctx) return undefined;
    const order = ctx.page >= 1 ? ctx.recipe.steps[ctx.page - 1]?.order : undefined;
    const mine = this.timers.filter((t) => t.entryId === ctx.entryId && t.status !== 'done' && (!status || t.status === status));
    return mine.find((t) => t.stepOrder === order) ?? mine[0];
  }

  /** After next / previous: wait for cook mode to open the page (it reads itself then). */
  private awaitPage() {
    this.stopRecognition();
    this.set({ phase: 'working' });
    clearTimeout(this.pageTimer);
    // Cook mode ignores taps while it celebrates a finished step; listen again if nothing changed.
    this.pageTimer = setTimeout(() => this.resume(), 1600);
  }

  private async ask(question: string) {
    const ctx = this.ctx;
    if (!ctx) return;
    const token = ++this.askToken;
    const { recipe, page } = ctx;
    const step = page >= 1 && page <= recipe.steps.length ? recipe.steps[page - 1] : undefined;
    const where = step ? `Şu an ${page}. adımdayım: “${step.text.trim()}”.` : page === 0 ? 'Malzemeleri hazırlıyorum.' : 'Tarifi bitirdim.';
    const turn: ChatTurn = { role: 'user', content: `${question}\n\n(${where} Ellerim dolu, cevabını sesli okuyacağım: kısa ve net cevap ver.)` };
    this.set({ thinking: true });
    this.notify({ heard: question, title: 'Düşünüyorum…', icon: 'chatbubble-ellipses-outline' }, 0);
    this.thinkingCard = this.feedbackId;
    // Keep listening meanwhile: "sus" or a new command drops the answer.
    this.resume();
    try {
      const answer = await api.askAssistant(ctx.entryId, [...this.history, turn]);
      if (token !== this.askToken || !this.state.on) return;
      this.history = [...this.history, { role: 'user' as const, content: question }, { role: 'assistant' as const, content: answer.reply }].slice(-8);
      this.set({ thinking: false });
      const [first, rest] = firstSentence(plain(answer.reply));
      this.notify({ heard: question, title: first, detail: rest || undefined, icon: 'chatbubble-outline' }, 14_000);
      this.say(brief(answer.reply));
    } catch (err) {
      if (token !== this.askToken || !this.state.on) return;
      this.set({ thinking: false });
      const code = err instanceof ApiError ? err.code : '';
      const line =
        code === 'ASSISTANT_NOT_CONFIGURED'
          ? 'Asistan şu an kapalı.'
          : code === 'NETWORK_ERROR' || code === 'TIMEOUT'
            ? 'Şu an asistana ulaşamıyorum. Bağlantını kontrol eder misin?'
            : 'Şu an cevap veremedim. Birazdan tekrar sorabilirsin.';
      this.notify({ heard: question, title: line, icon: 'cloud-offline-outline' }, 6000);
      this.say(line);
    }
  }

  private cancelAnswer() {
    this.askToken += 1;
    if (!this.state.thinking) return;
    const stale = this.state.feedback?.id === this.thinkingCard;
    this.set({ thinking: false, feedback: stale ? null : this.state.feedback });
  }

  // ---- state ----

  /** A short confirmation in the status pill. */
  private confirm(title: string, icon: IconName, ms = 2600) {
    clearTimeout(this.chipTimer);
    this.feedbackId += 1;
    this.set({ chip: { id: this.feedbackId, title, icon } });
    this.chipTimer = setTimeout(() => this.set({ chip: null }), ms);
  }

  /** A card for answers worth reading; `ms: 0` keeps it until replaced. */
  private notify(f: Omit<VoiceFeedback, 'id'>, ms = 5000) {
    clearTimeout(this.feedbackTimer);
    this.feedbackId += 1;
    this.set({ feedback: { ...f, id: this.feedbackId } });
    if (ms > 0) this.feedbackTimer = setTimeout(() => this.set({ feedback: null }), ms);
  }

  private level(v: number) {
    this.levelListener?.(v);
  }

  private set(patch: Partial<VoiceState>) {
    const next = { ...this.state, ...patch };
    if ((Object.keys(patch) as (keyof VoiceState)[]).every((k) => next[k] === this.state[k])) return;
    this.state = next;
    this.listeners.forEach((l) => l());
  }
}
