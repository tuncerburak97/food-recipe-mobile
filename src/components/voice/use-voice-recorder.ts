import {
  AudioQuality,
  IOSOutputFormat,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  type RecordingOptions,
} from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { MAX_RECORDING_SEC, downsample, levelOf, type Recording } from '@/lib/voice-recipe';

/** Mono AAC at 48 kbps: a clear voice at about 0.36 MB a minute. Metering feeds the level meter. */
const VOICE_RECORDING: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 48000,
  isMeteringEnabled: true,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: { outputFormat: IOSOutputFormat.MPEG4AAC, audioQuality: AudioQuality.HIGH },
  web: { mimeType: 'audio/webm', bitsPerSecond: 48000 },
};

/** Bars in the live level meter. */
export const METER_BARS = 36;
/** Steps of the waveform kept with the recipe. */
const WAVEFORM_STEPS = 48;
const TICK_MS = 100;
const KEEP_AWAKE_TAG = 'voice-recipe';

/** granted, ask (the system can still ask), blocked (only Settings can change it). */
export type MicPermission = 'unknown' | 'granted' | 'ask' | 'blocked';
export type RecorderPhase = 'idle' | 'recording' | 'paused';

const silent = () => Array<number>(METER_BARS).fill(0);

/**
 * One recording with pause and resume: the elapsed time, a smoothed live level for the meter, the
 * microphone permission (checked again when the app comes back, e.g. from Settings) and the screen
 * kept awake while a recording is open. A call or another app taking the microphone shows as paused.
 */
export function useVoiceRecorder() {
  const recorder = useAudioRecorder(VOICE_RECORDING);
  const [permission, setPermission] = useState<MicPermission>('unknown');
  const [phase, setPhase] = useState<RecorderPhase>('idle');
  const [millis, setMillis] = useState(0);
  const [levels, setLevels] = useState<number[]>(silent);
  const [limitReached, setLimitReached] = useState(false);
  const [failed, setFailed] = useState(false);
  /** The last permission request was answered "no" (the system may still ask again). */
  const [refused, setRefused] = useState(false);
  const samples = useRef<number[]>([]);
  const elapsed = useRef(0);
  const missed = useRef(0);

  useEffect(() => {
    // On web, checking already opens the browser's prompt; there it is asked on the first tap.
    if (Platform.OS === 'web') return;
    const check = () =>
      getRecordingPermissionsAsync()
        .then((p) => {
          setPermission(p.granted ? 'granted' : p.canAskAgain ? 'ask' : 'blocked');
          if (p.granted) setRefused(false);
        })
        .catch(() => setPermission('ask'));
    check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (phase !== 'recording') return;
    const timer = setInterval(() => {
      const s = recorder.getStatus();
      if (!s.isRecording) {
        // Interrupted (a call, another app took the microphone): show it as paused.
        missed.current += 1;
        if (missed.current > 6) setPhase('paused');
        return;
      }
      missed.current = 0;
      elapsed.current = Math.max(elapsed.current, s.durationMillis);
      const level = levelOf(s.metering);
      samples.current.push(level);
      setMillis(elapsed.current);
      setLevels((prev) => [...prev.slice(1), prev[prev.length - 1] * 0.35 + level * 0.65]);
      if (elapsed.current >= MAX_RECORDING_SEC * 1000) {
        recorder.pause();
        setPhase('paused');
        setLimitReached(true);
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [phase, recorder]);

  // A locked phone would stop the recording.
  useEffect(() => {
    if (phase === 'idle') return;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [phase]);

  // Leave the audio session in playback mode (speaker) when the screen closes.
  useEffect(
    () => () => {
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    },
    [],
  );

  const requestPermission = async () => {
    const p = await requestRecordingPermissionsAsync().catch(() => null);
    // A browser remembers a "no" and never asks again, so on web a refusal is final too.
    setPermission(p?.granted ? 'granted' : p?.canAskAgain === false || Platform.OS === 'web' ? 'blocked' : 'ask');
    setRefused(!p?.granted);
    return !!p?.granted;
  };

  /** Starts a new recording; asks for the microphone first when needed. */
  const start = async () => {
    setFailed(false);
    if (permission !== 'granted' && !(await requestPermission())) return false;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setFailed(true);
      return false;
    }
    samples.current = [];
    elapsed.current = 0;
    missed.current = 0;
    setLevels(silent());
    setMillis(0);
    setLimitReached(false);
    setPhase('recording');
    return true;
  };

  const pause = () => {
    recorder.pause();
    setPhase('paused');
  };

  const resume = () => {
    if (limitReached) return;
    missed.current = 0;
    recorder.record();
    setPhase('recording');
  };

  /** Stops and returns the finished recording (null if there is no file). */
  const finish = async (): Promise<Recording | null> => {
    const durationSec = Math.max(elapsed.current, recorder.getStatus().durationMillis) / 1000;
    try {
      await recorder.stop();
    } catch {
      setFailed(true);
      return null;
    } finally {
      setPhase('idle');
      setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
    const uri = recorder.uri;
    if (!uri) return null;
    return { uri, durationSec, waveform: downsample(samples.current, WAVEFORM_STEPS) };
  };

  /** Throws away the open recording, if any. */
  const discard = async () => {
    if (phase !== 'idle') await recorder.stop().catch(() => {});
    setPhase('idle');
    setMillis(0);
    setLevels(silent());
    setLimitReached(false);
    setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  };

  return { permission, refused, phase, seconds: millis / 1000, levels, limitReached, failed, requestPermission, start, pause, resume, finish, discard };
}
