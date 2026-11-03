import { requireOptionalNativeModule, useEvent, useEventListener } from 'expo';
import { Image } from 'expo-image';
import type { VideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';

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
  // Our own controls instead of the system ones: those sit under the status bar, over the screen's
  // back and menu buttons, and their full screen mode is hard to leave.
  return (
    <>
      <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      <Controls player={player} />
    </>
  );
}

/** How long the controls stay on screen while the video plays (ms). */
const CONTROLS_HIDE = 2600;

// Player changes live outside the component: the React compiler treats props as read-only.
function setPosition(player: VideoPlayer, sec: number) {
  player.currentTime = sec;
}
function setMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Tap the video to show or hide the controls: play/pause in the middle, the progress (tap to seek),
 * time and sound at the bottom. While paused they stay on screen.
 */
function Controls({ player }: { player: VideoPlayer }) {
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visible, setVisible] = useState(true);
  const [trackWidth, setTrackWidth] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => setTime(currentTime));
  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay' && player.duration > 0) setDuration(player.duration);
  });
  useEventListener(player, 'sourceLoad', ({ duration: d }) => {
    if (d > 0) setDuration(d);
  });

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), CONTROLS_HIDE);
  }, []);

  useEffect(() => {
    // While paused the controls are always shown (see `shown`), so only a playing video hides them.
    if (isPlaying && visible) scheduleHide();
    else if (hideTimer.current) clearTimeout(hideTimer.current);
  }, [isPlaying, visible, scheduleHide]);

  useEffect(() => () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
      return;
    }
    if (duration > 0 && player.currentTime >= duration - 0.3) setPosition(player, 0);
    player.play();
  };

  const seek = (e: GestureResponderEvent) => {
    if (!trackWidth || !duration) return;
    // On web the press is a mouse click, which has offsetX instead of locationX.
    const native = e.nativeEvent as GestureResponderEvent['nativeEvent'] & { offsetX?: number };
    const x = Number.isFinite(native.locationX) ? native.locationX : native.offsetX;
    if (x == null || !Number.isFinite(x)) return;
    const ratio = Math.min(1, Math.max(0, x / trackWidth));
    setPosition(player, ratio * duration);
    setTime(ratio * duration);
    if (isPlaying) scheduleHide();
  };

  const progress = duration > 0 ? Math.min(1, time / duration) : 0;
  const shown = visible || !isPlaying;

  return (
    <Pressable
      onPress={() => (shown && isPlaying ? setVisible(false) : setVisible(true))}
      accessibilityLabel="Video kontrollerini göster"
      style={StyleSheet.absoluteFill}>
      {shown && (
        <View style={styles.controls} pointerEvents="box-none">
          <Pressable
            onPress={togglePlay}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Duraklat' : 'Oynat'}
            style={({ pressed }) => [styles.center, pressed && { opacity: 0.8 }]}>
            <Icon name={isPlaying ? 'pause' : 'play'} size={26} color="#fff" style={isPlaying ? undefined : styles.playIcon} />
          </Pressable>
          <View style={styles.bar}>
            <Text variant="caption" weight="600" tint="#fff" style={styles.time}>
              {formatTime(time)}
              {duration > 0 ? ` / ${formatTime(duration)}` : ''}
            </Text>
            <Pressable
              onPress={seek}
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              hitSlop={{ top: 14, bottom: 14 }}
              accessibilityRole="adjustable"
              accessibilityLabel="Videoda ilerle"
              style={styles.trackHit}>
              <View style={styles.track} pointerEvents="none">
                <View style={[styles.fill, { width: `${progress * 100}%` }]} />
              </View>
            </Pressable>
            <Pressable
              onPress={() => {
                setMuted(player, !muted);
                if (isPlaying) scheduleHide();
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={muted ? 'Sesi aç' : 'Sesi kapat'}
              style={styles.sound}>
              <Icon name={muted ? 'volume-mute' : 'volume-high'} size={17} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
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
  controls: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  center: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,18,16,0.62)' },
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 40,
    paddingLeft: 12,
    paddingRight: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(20,18,16,0.62)',
  },
  time: { fontVariant: ['tabular-nums'] },
  trackHit: { flex: 1, height: 20, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: '#fff' },
  sound: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
