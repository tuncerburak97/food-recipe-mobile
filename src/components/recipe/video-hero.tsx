import { requireOptionalNativeModule, useEventListener } from 'expo';
import { Image } from 'expo-image';
import type { VideoPlayer } from 'expo-video';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { videoSource } from '@/lib/api';
import type { StepClip } from '@/lib/step-clip';

// Builds made before expo-video was added do not have its native module; importing it there would
// crash. In that case the play button opens the video on Instagram instead.
const canPlayInApp = Platform.OS === 'web' || requireOptionalNativeModule('ExpoVideo') != null;

interface Props {
  /** Reel shortcode; without it only the photo is shown. */
  shortcode?: string;
  imageUrl?: string;
  /** Instagram link, used when the video cannot be played inside the app. */
  instagramUrl?: string;
  /** Height covered at the bottom (e.g. by a sheet rising over it): the play button and the player stay above it. */
  bottomInset?: number;
  /** Cook mode: the current step's moment in the reel (seek there and loop it). */
  clip?: StepClip | null;
  style?: StyleProp<ViewStyle>;
}

/**
 * The recipe's Instagram video, played inside the app. Shows the cover photo with a big play button
 * first, so nothing is downloaded until the user asks for it. With a clip (cook mode), playback starts
 * at the step's moment and repeats it, and moves along when the step changes.
 */
export function VideoHero({ shortcode, imageUrl, instagramUrl, bottomInset = 0, clip, style }: Props) {
  const [started, setStarted] = useState(false);
  const watchStep = canPlayInApp && clip != null;

  const play = () => {
    if (canPlayInApp) setStarted(true);
    else if (instagramUrl) Linking.openURL(instagramUrl);
  };

  return (
    <View style={[styles.box, style]}>
      {started && shortcode ? (
        <View style={[StyleSheet.absoluteFill, { bottom: bottomInset }]}>
          <Player shortcode={shortcode} clip={clip} />
        </View>
      ) : (
        <>
          {imageUrl ? <Image source={imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
          {shortcode && (canPlayInApp || instagramUrl) && (
            <Pressable
              onPress={play}
              accessibilityRole="button"
              accessibilityLabel={watchStep ? 'Bu adımı videoda izle' : 'Videoyu oynat'}
              style={[styles.overlay, { paddingBottom: bottomInset }]}>
              <View style={styles.play}>
                <View style={styles.playButton}>
                  <Icon name="play" size={18} color="#1E1C1A" style={styles.playIcon} />
                </View>
                <Text variant="subhead" weight="700" tint="#FFFFFF" style={styles.playLabel}>
                  {!canPlayInApp ? 'Instagram’da izle' : watchStep ? 'Bu adımı izle' : 'Videoyu izle'}
                </Text>
              </View>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

/** Mounted only after the user taps play, so the video is not downloaded before that. */
function Player({ shortcode, clip }: { shortcode: string; clip?: StepClip | null }) {
  // Loaded lazily: see canPlayInApp.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useVideoPlayer, VideoView } = require('expo-video') as typeof import('expo-video');
  const source = useMemo(() => videoSource(shortcode), [shortcode]);
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });
  useClipLoop(player, clip);
  return (
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls fullscreenOptions={{ enable: true }} />
  );
}

/** How far playback may move between two time updates before it counts as the user seeking (s). */
const SEEK_JUMP = 1.5;
/** After our own seek, time updates from before it may still arrive for a moment (ms). */
const SEEK_SETTLE = 1000;

/** The clip being repeated. free: the user moved elsewhere in the video, so it is left alone. */
interface Hold {
  start: number;
  end: number;
  last: number;
  free: boolean;
  /** Waiting for the video to load before the first seek. */
  pending: boolean;
  quietUntil: number;
}

function seekTo(player: VideoPlayer, hold: Hold, t: number) {
  player.currentTime = t;
  hold.last = t;
  hold.quietUntil = Date.now() + SEEK_SETTLE;
}

/**
 * Keeps playback on the step's part of the video: it seeks to its start (again whenever the clip
 * changes) and jumps back there at its end. Seeking to another part by hand lets go of the clip until
 * the step changes, so the native controls never fight the cook. Without a clip nothing changes.
 */
function useClipLoop(player: VideoPlayer, clip?: StepClip | null) {
  const hold = useRef<Hold | null>(null);
  const start = clip?.start;
  const end = clip?.end;

  useEffect(() => {
    if (start == null || end == null) {
      hold.current = null;
      return;
    }
    const h: Hold = { start, end, last: start, free: false, pending: false, quietUntil: 0 };
    hold.current = h;
    // A paused video stays paused: it only moves to the step, the cook decides when it plays.
    if (player.status === 'readyToPlay') seekTo(player, h, start);
    else h.pending = true;
  }, [player, start, end]);

  useEventListener(player, 'statusChange', ({ status }) => {
    const h = hold.current;
    if (h?.pending && status === 'readyToPlay') {
      h.pending = false;
      seekTo(player, h, h.start);
    }
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const h = hold.current;
    if (!h || h.free || h.pending) return;
    const jumped = Math.abs(currentTime - h.last) > SEEK_JUMP;
    h.last = currentTime;
    if (Date.now() < h.quietUntil) return;
    if (jumped && (currentTime < h.start - 0.5 || currentTime > h.end + 0.5)) {
      h.free = true;
      return;
    }
    if (currentTime >= h.end) seekTo(player, h, h.start);
  });

  // A clip that runs to the end of the video: playback stops there, so start the clip again.
  useEventListener(player, 'playToEnd', () => {
    const h = hold.current;
    if (!h || h.free) return;
    seekTo(player, h, h.start);
    player.play();
  });
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#000', overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.16)' },
  play: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingLeft: 6,
    paddingRight: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(20,18,16,0.62)',
  },
  playButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 2 },
  playLabel: { letterSpacing: 0.1 },
});
