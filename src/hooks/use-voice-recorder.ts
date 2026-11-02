import type { RecordingOptions } from 'expo-audio';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { AudioLib } from '@/lib/voice/native';
import type { VoiceRecorder, VoiceSession } from '@/lib/voice/session';

/** Mono AAC with metering: small files for speech to text, and a level for "stop on silence". */
const SPEECH_RECORDING: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 64000,
  isMeteringEnabled: true,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  // "aac " is IOSOutputFormat.MPEG4AAC; 64 is AudioQuality.MEDIUM (enums not imported: see below).
  ios: { outputFormat: 'aac ', audioQuality: 64, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
  web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
};

/**
 * Gives the voice session a tap-to-talk recorder (expo-audio). Use it only in a component that is
 * mounted when the session needs recording, i.e. where `audio()` found expo-audio.
 */
export function useVoiceRecorder(session: VoiceSession) {
  // Loaded lazily: builds without expo-audio's native module must never import it.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAudioRecorder, setAudioModeAsync } = require('expo-audio') as AudioLib;
  const recorder = useAudioRecorder(SPEECH_RECORDING);

  useEffect(() => {
    const voice: VoiceRecorder = {
      mimeType: Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a',
      async start() {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
      },
      async stop() {
        try {
          await recorder.stop();
        } finally {
          // Back to playback, so the spoken reply comes from the loudspeaker.
          setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
        }
        return recorder.uri ?? recorder.getStatus().url ?? null;
      },
      metering() {
        return recorder.getStatus().metering;
      },
    };
    return session.attachRecorder(voice);
  }, [session, recorder, setAudioModeAsync]);
}
