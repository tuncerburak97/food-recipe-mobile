import { VoiceCard } from '@/components/voice/voice-card';
import type { RecipeEntry, RecipeVoice } from '@/lib/types';
import { lengthLabel, voiceAudioSource } from '@/lib/voice-recipe';

/**
 * For a recipe told out loud ("Annemin tarifi"): plays the original recording. Renders nothing for
 * other recipes. The recording is private, so it loads with the user's headers on the first play.
 */
export function VoiceMemo({ entry }: { entry: RecipeEntry }) {
  if (!entry.voice) return null;
  return <Memo key={entry.voice.url} voice={entry.voice} />;
}

function Memo({ voice }: { voice: RecipeVoice }) {
  const self = voice.teller?.trim().toLocaleLowerCase('tr-TR') === 'ben';
  const what = self ? 'Tarifi anlattığın kayıt' : voice.teller ? 'Tarifi onun sesinden dinle' : 'Tarifin anlatıldığı kayıt';
  return (
    <VoiceCard
      teller={voice.teller}
      subtitle={voice.durationSec ? `${what} · ${lengthLabel(voice.durationSec)}` : what}
      durationSec={voice.durationSec}
      waveform={voice.waveform}
      load={() => voiceAudioSource(voice.url)}
    />
  );
}
