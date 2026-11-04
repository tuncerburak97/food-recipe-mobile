import type { RecordingOptions } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { describeError } from '@/lib/api';
import { transcribeAudio } from '@/lib/transcribe';
import { audio, recognizer, type AudioLib } from '@/lib/voice/native';

export type DictationMode = 'native' | 'record' | 'none';
export type DictationPhase = 'idle' | 'listening' | 'transcribing';

/** Words the recognizer should expect in a recipe app. */
const HINTS = ['tarif', 'pilav', 'bulgur', 'pirinç', 'mercimek', 'tavuk', 'kıyma', 'börek', 'çorba', 'tatlı', 'dolabım', 'alışveriş listesi', 'AI şef'];

const RECORD_MAX_MS = 15_000;

function detectMode(): DictationMode {
  const R = recognizer();
  if (R) {
    if (Platform.OS !== 'android') return 'native';
    try {
      if (R.isRecognitionAvailable()) return 'native';
    } catch {
      // fall through
    }
  }
  return audio() ? 'record' : 'none';
}

function askForSettings(what: string) {
  Alert.alert(`${what} izni gerekiyor`, 'Sesle sorabilmen için Ayarlar’dan izin vermen gerekiyor.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Ayarları aç', onPress: () => Linking.openSettings() },
  ]);
}

interface Options {
  /** What it heard so far, while listening. */
  onPartial?: (text: string) => void;
  /** The whole sentence, once the user stopped talking (or tapped done). */
  onFinal: (text: string) => void;
}

/** A recorder for the fallback mode, handed over by `DictationRecorder`. */
export interface DictationRecorder {
  start(): Promise<void>;
  stop(): Promise<string | null>;
}

/**
 * Tap to talk. With the OS recognizer the words appear as they are said and the sentence is final
 * when the user pauses; without it, the voice is recorded and sent to the backend's speech to text.
 */
export function useDictation({ onPartial, onFinal }: Options) {
  const [mode] = useState(detectMode);
  const [phase, setPhase] = useState<DictationPhase>('idle');
  const [level, setLevel] = useState(0);
  const heard = useRef('');
  const cancelled = useRef(false);
  const recorder = useRef<DictationRecorder | null>(null);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cb = useRef({ onPartial, onFinal });
  useEffect(() => {
    cb.current = { onPartial, onFinal };
  }, [onPartial, onFinal]);

  // OS recognizer events.
  useEffect(() => {
    if (mode !== 'native') return;
    const R = recognizer();
    if (!R) return;
    const subs = [
      R.addListener('result', (e) => {
        const text = e.results[0]?.transcript?.trim() ?? '';
        if (!text) return;
        heard.current = text;
        cb.current.onPartial?.(text);
      }),
      R.addListener('volumechange', (e) => setLevel(Math.max(0, Math.min(1, (e.value + 2) / 12)))),
      R.addListener('error', (e) => {
        if (e.error !== 'aborted' && e.error !== 'no-speech' && e.error !== 'speech-timeout') {
          if (e.error === 'not-allowed') askForSettings('Mikrofon');
        }
      }),
      R.addListener('end', () => {
        setPhase('idle');
        setLevel(0);
        const text = heard.current.trim();
        heard.current = '';
        if (text && !cancelled.current) cb.current.onFinal(text);
      }),
    ];
    return () => {
      subs.forEach((s) => s.remove());
      try {
        R.abort();
      } catch {
        // not running
      }
    };
  }, [mode]);

  const finishRecording = useCallback(async () => {
    clearTimeout(recordTimer.current);
    const rec = recorder.current;
    if (!rec) return;
    setPhase('transcribing');
    setLevel(0);
    try {
      const uri = await rec.stop();
      if (cancelled.current || !uri) return;
      const { text } = await transcribeAudio(uri, { prompt: HINTS.join(', '), timeoutMs: 30_000 });
      if (text.trim() && !cancelled.current) cb.current.onFinal(text.trim());
    } catch (e) {
      if (!cancelled.current) Alert.alert(describeError(e).title, 'Sesini yazıya çeviremedim. Tekrar dener misin?');
    } finally {
      setPhase('idle');
    }
  }, []);

  const start = useCallback(async () => {
    if (phase !== 'idle') return;
    cancelled.current = false;
    heard.current = '';
    if (mode === 'native') {
      const R = recognizer();
      if (!R) return;
      try {
        const p = await R.requestPermissionsAsync();
        if (!p.granted) {
          askForSettings('Mikrofon ve konuşma tanıma');
          return;
        }
        R.start({
          lang: 'tr-TR',
          interimResults: true,
          continuous: false,
          addsPunctuation: true,
          contextualStrings: HINTS,
          volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
        });
        setPhase('listening');
      } catch {
        setPhase('idle');
      }
      return;
    }
    if (mode === 'record') {
      const A = audio();
      if (!A || !recorder.current) return;
      const p = await A.requestRecordingPermissionsAsync();
      if (!p.granted) {
        askForSettings('Mikrofon');
        return;
      }
      try {
        await recorder.current.start();
        setPhase('listening');
        recordTimer.current = setTimeout(finishRecording, RECORD_MAX_MS);
      } catch {
        setPhase('idle');
      }
    }
  }, [phase, mode, finishRecording]);

  /** Done talking: use what was said. */
  const stop = useCallback(() => {
    if (phase !== 'listening') return;
    if (mode === 'native') {
      try {
        recognizer()?.stop();
      } catch {
        setPhase('idle');
      }
    } else if (mode === 'record') {
      finishRecording();
    }
  }, [phase, mode, finishRecording]);

  /** Throw away what was said. */
  const cancel = useCallback(() => {
    cancelled.current = true;
    heard.current = '';
    clearTimeout(recordTimer.current);
    if (mode === 'native') {
      try {
        recognizer()?.abort();
      } catch {
        // not running
      }
    } else if (mode === 'record') {
      recorder.current?.stop().catch(() => undefined);
    }
    setPhase('idle');
    setLevel(0);
  }, [mode]);

  const attachRecorder = useCallback((r: DictationRecorder | null) => {
    recorder.current = r;
  }, []);

  return { mode, phase, level, start, stop, cancel, attachRecorder };
}

const SPEECH_RECORDING: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: false,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: 'aac ', audioQuality: 64, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};

/**
 * Gives `useDictation` a recorder (expo-audio). Render it only when the mode is 'record', so builds
 * without expo-audio never load it.
 */
export function useDictationRecorder(attach: (r: DictationRecorder | null) => void) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAudioRecorder, setAudioModeAsync } = require('expo-audio') as AudioLib;
  const rec = useAudioRecorder(SPEECH_RECORDING);
  useEffect(() => {
    attach({
      async start() {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await rec.prepareToRecordAsync();
        rec.record();
      },
      async stop() {
        try {
          await rec.stop();
        } finally {
          setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
        }
        return rec.uri ?? rec.getStatus().url ?? null;
      },
    });
    return () => attach(null);
  }, [attach, rec, setAudioModeAsync]);
}
