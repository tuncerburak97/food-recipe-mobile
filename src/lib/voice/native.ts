import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

// Speech, recognition and recording may each be missing: Expo Go has no speech recognition, and
// builds made before a package was added lack its native module. Importing a missing native module
// crashes, so each package is loaded only after checking that it is there.

type RecognitionLib = typeof import('expo-speech-recognition');
type SpeechLib = typeof import('expo-speech');
export type AudioLib = typeof import('expo-audio');
export type Recognizer = RecognitionLib['ExpoSpeechRecognitionModule'];

const isWeb = Platform.OS === 'web';
const web = globalThis as {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
  speechSynthesis?: unknown;
  MediaRecorder?: unknown;
};

function load<T>(present: boolean, get: () => T): T | null {
  if (!present) return null;
  try {
    return get();
  } catch {
    return null;
  }
}

let recognitionLib: RecognitionLib | null | undefined;
let speechLib: SpeechLib | null | undefined;
let audioLib: AudioLib | null | undefined;

/** The OS speech recognizer (continuous listening), or null where it does not exist. */
export function recognizer(): Recognizer | null {
  if (recognitionLib === undefined) {
    const present = isWeb ? !!(web.SpeechRecognition || web.webkitSpeechRecognition) : requireOptionalNativeModule('ExpoSpeechRecognition') != null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    recognitionLib = load(present, () => require('expo-speech-recognition') as RecognitionLib);
  }
  return recognitionLib?.ExpoSpeechRecognitionModule ?? null;
}

function speech(): SpeechLib | null {
  if (speechLib === undefined) {
    const present = isWeb ? web.speechSynthesis != null : requireOptionalNativeModule('ExpoSpeech') != null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    speechLib = load(present, () => require('expo-speech') as SpeechLib);
  }
  return speechLib;
}

/** expo-audio, for tap-to-talk recording where the recognizer is missing. */
export function audio(): AudioLib | null {
  if (audioLib === undefined) {
    const present = isWeb ? web.MediaRecorder != null : requireOptionalNativeModule('ExpoAudio') != null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    audioLib = load(present, () => require('expo-audio') as AudioLib);
  }
  return audioLib;
}

export function canSpeak(): boolean {
  return speech() != null;
}

let voice: string | undefined;
let voiceLookup: Promise<void> | null = null;

/** Picks the best installed Turkish voice once (iOS "Enhanced" voices sound far more natural). */
export function prepareVoice(): Promise<void> {
  const S = speech();
  if (!S || Platform.OS !== 'ios') return Promise.resolve();
  voiceLookup ??= S.getAvailableVoicesAsync()
    .then((voices) => {
      const turkish = voices.filter((v) => v.language.toLowerCase().startsWith('tr'));
      voice = (turkish.find((v) => v.quality === S.VoiceQuality.Enhanced) ?? turkish[0])?.identifier;
    })
    .catch(() => undefined);
  return voiceLookup;
}

/**
 * Says `text` in Turkish and calls `onEnd` once when it is done, stopped or failed. A watchdog ends
 * it too, in case the engine never reports back. Returns false when there is no speech engine.
 */
export function speak(text: string, onEnd: () => void): boolean {
  const S = speech();
  if (!S || !text.trim()) return false;
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    clearTimeout(watchdog);
    onEnd();
  };
  const watchdog = setTimeout(end, 6000 + text.length * 110);
  try {
    S.speak(text.slice(0, Math.min(3900, S.maxSpeechInputLength || 3900)), {
      // Android wants a bare language code; "tr-TR" there falls back to the phone's language.
      language: Platform.OS === 'android' ? 'tr' : 'tr-TR',
      voice,
      rate: Platform.OS === 'ios' ? 1 : 0.95,
      // iOS: its own audio session, so it stays loud after the recognizer used the microphone.
      useApplicationAudioSession: false,
      onDone: end,
      onStopped: end,
      onError: end,
    });
  } catch {
    end();
    return false;
  }
  return true;
}

export function stopSpeaking() {
  speech()
    ?.stop()
    .catch(() => undefined);
}
