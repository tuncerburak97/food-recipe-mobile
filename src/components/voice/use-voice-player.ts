import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioSource } from 'expo-audio';
import { useEffect, useRef, useState } from 'react';

type Loader = () => Promise<{ source: AudioSource; release?: () => void }>;

/**
 * Plays one recording. Nothing is loaded until the first tap on play; when it ends it goes back to
 * the start, ready to play again.
 */
export function useVoicePlayer(load: Loader) {
  const player = useAudioPlayer(null, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);
  const release = useRef<(() => void) | undefined>(undefined);

  useEffect(() => () => release.current?.(), []);

  useEffect(() => {
    if (!status.didJustFinish) return;
    player.pause();
    player.seekTo(0).catch(() => {});
  }, [status.didJustFinish, player]);

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    setFailed(false);
    if (!loaded.current) {
      setLoading(true);
      try {
        const { source, release: free } = await load();
        release.current = free;
        player.replace(source);
        loaded.current = true;
      } catch {
        setFailed(true);
        return;
      } finally {
        setLoading(false);
      }
    }
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    player.play();
  };

  /** Jumps to a point of the recording, 0..1. */
  const seekTo = (fraction: number) => {
    if (status.duration > 0) player.seekTo(Math.min(1, Math.max(0, fraction)) * status.duration).catch(() => {});
  };

  return {
    playing: status.playing,
    loading: loading || (status.playing && status.isBuffering && status.currentTime === 0),
    failed: failed || !!status.error,
    currentTime: status.currentTime,
    duration: status.duration,
    toggle,
    seekTo,
  };
}
