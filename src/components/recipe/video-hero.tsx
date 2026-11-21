import { requireOptionalNativeModule, useEvent, useEventListener } from 'expo';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import type { VideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecipeImage } from '@/components/recipe/recipe-image';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { videoSource } from '@/lib/api';
import { isYouTube, sourceName } from '@/lib/instagram';
import type { StepClip } from '@/lib/step-clip';

// Builds made before expo-video was added do not have its native module; importing it there would
// crash. In that case the play button opens the video on Instagram instead.
const canPlayInApp = Platform.OS === 'web' || requireOptionalNativeModule('ExpoVideo') != null;

interface Props {
  /** Reel shortcode; without it only the photo is shown. */
  shortcode?: string;
  imageUrl?: string;
  /** The video's Instagram or YouTube link, opened when it cannot be played inside the app. */
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
 * at the step's moment and repeats it, and moves along when the step changes. The player can go full
 * screen, and jumps 5 seconds back or forward with its buttons or a double tap on either side.
 */
export function VideoHero({ shortcode, imageUrl, instagramUrl, bottomInset = 0, clip, style }: Props) {
  const [started, setStarted] = useState(false);
  // YouTube videos have no file the app may play: the button opens YouTube.
  const youtube = isYouTube(shortcode);
  const inApp = canPlayInApp && !youtube;
  const watchStep = inApp && clip != null;

  const play = () => {
    if (inApp) setStarted(true);
    else if (instagramUrl) Linking.openURL(instagramUrl);
  };

  return (
    <View style={[styles.box, style]}>
      {started && shortcode ? (
        <Player shortcode={shortcode} clip={clip} bottomInset={bottomInset} externalUrl={instagramUrl} />
      ) : (
        <>
          <RecipeImage uri={imageUrl} style={StyleSheet.absoluteFill} placeholderSize={96} transition={200} />
          {shortcode && (inApp || instagramUrl) && (
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
                  {youtube ? 'YouTube’da izle' : !inApp ? 'Instagram’da izle' : watchStep ? 'Bu adımı izle' : 'Videoyu izle'}
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
function Player({ shortcode, clip, bottomInset, externalUrl }: { shortcode: string; clip?: StepClip | null; bottomInset: number; externalUrl?: string }) {
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
  const [fullscreen, setFullscreen] = useState(false);
  const insets = useSafeAreaInsets();

  // Our own controls instead of the system ones: those sit under the status bar, over the screen's
  // back and menu buttons, and their full screen mode is hard to leave. One player is shown by one
  // view at a time, so full screen moves the video into a modal instead of showing it twice.
  if (fullscreen) {
    return (
      <>
        <View style={[StyleSheet.absoluteFill, styles.parked, { paddingBottom: bottomInset }]}>
          <Icon name="expand" size={22} color="rgba(255,255,255,0.7)" />
          <Text variant="footnote" tint="rgba(255,255,255,0.7)">
            Video tam ekranda oynuyor
          </Text>
        </View>
        <Modal visible animationType="fade" presentationStyle="fullScreen" statusBarTranslucent supportedOrientations={['portrait']} onRequestClose={() => setFullscreen(false)}>
          <StatusBar hidden />
          <View style={styles.stage}>
            <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
            <Controls
              player={player}
              fullscreen
              onFullscreen={() => setFullscreen(false)}
              externalUrl={externalUrl}
              shortcode={shortcode}
              padding={{ top: insets.top + 8, bottom: Math.max(insets.bottom, 12) + 4 }}
            />
          </View>
        </Modal>
      </>
    );
  }
  return (
    <View style={[StyleSheet.absoluteFill, { bottom: bottomInset }]}>
      <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
      <Controls player={player} onFullscreen={() => setFullscreen(true)} externalUrl={externalUrl} shortcode={shortcode} padding={{ top: 0, bottom: 12 }} />
    </View>
  );
}

/** How long the controls stay on screen while the video plays (ms). */
const CONTROLS_HIDE = 2800;
/** How far the skip buttons and a double tap move (seconds). */
const SKIP = 5;
/** Two taps this close together are a double tap (ms). */
const DOUBLE_TAP = 280;
const RATES = [1, 1.25, 1.5, 2];

// Player changes live outside the component: the React compiler treats props as read-only.
function setPosition(player: VideoPlayer, sec: number) {
  player.currentTime = sec;
}
function setMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}
function setRate(player: VideoPlayer, rate: number) {
  player.playbackRate = rate;
}

function formatTime(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

interface ControlsProps {
  player: VideoPlayer;
  fullscreen?: boolean;
  onFullscreen: () => void;
  externalUrl?: string;
  shortcode: string;
  padding: { top: number; bottom: number };
}

/**
 * Tap the video to show or hide the controls; double tap the left or right side to jump 5 seconds.
 * In the middle: 5 seconds back, play/pause, 5 seconds forward. At the bottom: the time, the
 * progress (tap or drag to seek), sound, speed (full screen) and the full screen switch. While paused
 * they stay on screen.
 */
function Controls({ player, fullscreen, onFullscreen, externalUrl, shortcode, padding }: ControlsProps) {
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visible, setVisible] = useState(true);
  const [trackWidth, setTrackWidth] = useState(0);
  const [width, setWidth] = useState(0);
  const [rate, setRateState] = useState(1);
  /** While the finger is on the progress bar: where it points (seconds). */
  const [scrub, setScrub] = useState<number | null>(null);
  /** The "5 sn" mark shown for a moment after a jump. */
  const [jump, setJump] = useState<{ side: 'back' | 'forward'; total: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ at: number; side: 'back' | 'forward' | 'middle' }>({ at: 0, side: 'middle' });
  const lastSeek = useRef(0);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => setTime(currentTime));
  useEventListener(player, 'statusChange', ({ status: s }) => {
    if (s === 'readyToPlay' && player.duration > 0) setDuration(player.duration);
  });
  useEventListener(player, 'sourceLoad', ({ duration: d }) => {
    if (d > 0) setDuration(d);
  });

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), CONTROLS_HIDE);
  }, []);

  const scrubbing = scrub != null;
  useEffect(() => {
    // While paused or dragging the controls are always shown (see `shown`), so only a playing video hides them.
    if (isPlaying && visible && !scrubbing) scheduleHide();
    else if (hideTimer.current) clearTimeout(hideTimer.current);
  }, [isPlaying, visible, scrubbing, scheduleHide]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
    },
    [],
  );

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
      return;
    }
    if (duration > 0 && player.currentTime >= duration - 0.3) setPosition(player, 0);
    player.play();
  };

  /** Jumps 5 seconds; quick repeats add up in the mark ("10 sn"). */
  const skip = (side: 'back' | 'forward') => {
    const from = player.currentTime;
    const to = Math.max(0, Math.min(duration > 0 ? duration - 0.2 : from + SKIP, from + (side === 'forward' ? SKIP : -SKIP)));
    setPosition(player, to);
    setTime(to);
    Haptics.selectionAsync().catch(() => {});
    setJump((j) => ({ side, total: j && j.side === side ? j.total + SKIP : SKIP }));
    if (jumpTimer.current) clearTimeout(jumpTimer.current);
    jumpTimer.current = setTimeout(() => setJump(null), 650);
    if (isPlaying) scheduleHide();
  };

  const onTap = (e: GestureResponderEvent) => {
    const native = e.nativeEvent as GestureResponderEvent['nativeEvent'] & { offsetX?: number };
    const x = Number.isFinite(native.locationX) ? native.locationX : (native.offsetX ?? width / 2);
    const side = width > 0 && x < width * 0.36 ? 'back' : width > 0 && x > width * 0.64 ? 'forward' : 'middle';
    const now = Date.now();
    const double = now - lastTap.current.at < DOUBLE_TAP && lastTap.current.side === side && side !== 'middle';
    lastTap.current = { at: double ? 0 : now, side };
    if (double) {
      // The first tap of the pair already toggled the controls; a jump always leaves them shown.
      setVisible(true);
      skip(side);
      return;
    }
    setVisible((v) => !(v && isPlaying));
  };

  /** Where on the progress bar the finger is, as seconds. */
  const pointAt = (e: GestureResponderEvent): number | null => {
    if (!trackWidth || !duration) return null;
    // On web the press is a mouse event, which has offsetX instead of locationX.
    const native = e.nativeEvent as GestureResponderEvent['nativeEvent'] & { offsetX?: number };
    const x = Number.isFinite(native.locationX) ? native.locationX : native.offsetX;
    if (x == null || !Number.isFinite(x)) return null;
    return Math.min(1, Math.max(0, x / trackWidth)) * duration;
  };
  const onScrub = (e: GestureResponderEvent, end: boolean) => {
    const t = pointAt(e);
    if (t == null) {
      if (end) setScrub(null);
      return;
    }
    // Seeking on every move stutters; a few times a second follows the finger well enough.
    const now = Date.now();
    if (end || now - lastSeek.current > 140) {
      lastSeek.current = now;
      setPosition(player, t);
      setTime(t);
    }
    setScrub(end ? null : t);
  };

  const nextRate = () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(player, next);
    setRateState(next);
    if (isPlaying) scheduleHide();
  };

  const shownTime = scrub ?? time;
  const progress = duration > 0 ? Math.min(1, shownTime / duration) : 0;
  const failed = status === 'error';
  const loading = status === 'loading' || status === 'idle';
  const shown = visible || !isPlaying || scrubbing;

  if (failed) {
    return (
      <View style={[styles.controls, styles.failed, { paddingTop: padding.top, paddingBottom: padding.bottom }]}>
        <Icon name="cloud-offline-outline" size={26} color="#fff" />
        <Text variant="headline" tint="#fff" align="center">
          Video şu an oynatılamıyor
        </Text>
        {externalUrl ? (
          <Pressable onPress={() => Linking.openURL(externalUrl)} accessibilityRole="button" style={({ pressed }) => [styles.pill, pressed && styles.pressed]}>
            <Text variant="subhead" weight="700" tint="#1E1C1A">
              {sourceName(shortcode)}’da aç
            </Text>
          </Pressable>
        ) : null}
        {fullscreen ? (
          <Pressable onPress={onFullscreen} hitSlop={12} accessibilityRole="button" accessibilityLabel="Tam ekrandan çık" style={[styles.close, { top: padding.top }]}>
            <Icon name="close" size={22} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onTap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityLabel="Video. Kontroller için dokun, 5 saniye atlamak için sağa ya da sola iki kez dokun."
      style={StyleSheet.absoluteFill}>
      {jump ? (
        <View pointerEvents="none" style={[styles.jump, jump.side === 'back' ? styles.jumpBack : styles.jumpForward]}>
          <Icon name={jump.side === 'back' ? 'play-back' : 'play-forward'} size={20} color="#fff" />
          <Text variant="subhead" weight="700" tint="#fff">
            {jump.total} sn
          </Text>
        </View>
      ) : null}
      {loading && !shown ? (
        <View pointerEvents="none" style={styles.spinner}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
      {shown && (
        <View style={styles.controls} pointerEvents="box-none">
          {fullscreen ? (
            <Pressable onPress={onFullscreen} hitSlop={12} accessibilityRole="button" accessibilityLabel="Tam ekrandan çık" style={[styles.close, { top: padding.top }]}>
              <Icon name="chevron-down" size={24} color="#fff" />
            </Pressable>
          ) : null}
          <View style={styles.middle} pointerEvents="box-none">
            <SkipButton side="back" onPress={() => skip('back')} />
            <Pressable
              onPress={togglePlay}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Duraklat' : 'Oynat'}
              style={({ pressed }) => [styles.center, pressed && styles.pressed]}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Icon name={isPlaying ? 'pause' : 'play'} size={28} color="#fff" style={isPlaying ? undefined : styles.playIcon} />
              )}
            </Pressable>
            <SkipButton side="forward" onPress={() => skip('forward')} />
          </View>
          <View style={[styles.bar, { bottom: padding.bottom }]}>
            <Text variant="caption" weight="600" tint="#fff" style={styles.time}>
              {formatTime(shownTime)}
              {duration > 0 ? ` / ${formatTime(duration)}` : ''}
            </Text>
            <View
              onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={(e) => onScrub(e, false)}
              onResponderMove={(e) => onScrub(e, false)}
              onResponderRelease={(e) => onScrub(e, true)}
              onResponderTerminate={() => setScrub(null)}
              hitSlop={{ top: 16, bottom: 16 }}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Videoda ilerle"
              accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(shownTime) }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => skip(e.nativeEvent.actionName === 'increment' ? 'forward' : 'back')}
              style={styles.trackHit}>
              <View style={[styles.track, scrubbing && styles.trackActive]} pointerEvents="none">
                <View style={[styles.fill, { width: `${progress * 100}%` }]} />
              </View>
              <View pointerEvents="none" style={[styles.thumb, scrubbing && styles.thumbActive, { left: `${progress * 100}%` }]} />
            </View>
            {fullscreen ? (
              <Pressable onPress={nextRate} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Oynatma hızı ${rate} kat`} style={styles.rate}>
                <Text variant="caption" weight="700" tint="#fff">
                  {rate}x
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                setMuted(player, !muted);
                if (isPlaying) scheduleHide();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={muted ? 'Sesi aç' : 'Sesi kapat'}
              style={styles.sound}>
              <Icon name={muted ? 'volume-mute' : 'volume-high'} size={17} color="#fff" />
            </Pressable>
            <Pressable onPress={onFullscreen} hitSlop={8} accessibilityRole="button" accessibilityLabel={fullscreen ? 'Tam ekrandan çık' : 'Tam ekran'} style={styles.sound}>
              <Icon name={fullscreen ? 'contract' : 'expand'} size={17} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** Round "5 seconds back / forward" button next to play. */
function SkipButton({ side, onPress }: { side: 'back' | 'forward'; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={side === 'back' ? '5 saniye geri' : '5 saniye ileri'}
      style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
      <Icon name={side === 'back' ? 'play-back' : 'play-forward'} size={17} color="#fff" />
      <Text variant="caption" weight="700" tint="#fff" style={styles.skipLabel}>
        5
      </Text>
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
 * the step changes, so the controls never fight the cook. Without a clip nothing changes.
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

const SCRIM = 'rgba(20,18,16,0.62)';

const styles = StyleSheet.create({
  box: { backgroundColor: '#000', overflow: 'hidden' },
  stage: { flex: 1, backgroundColor: '#000' },
  // The size is spelled out: on web a video does not stretch between its edges like a view does.
  video: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  parked: { alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.16)' },
  play: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingLeft: 6,
    paddingRight: 18,
    borderRadius: 999,
    backgroundColor: SCRIM,
  },
  playButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 2 },
  playLabel: { letterSpacing: 0.1 },
  controls: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  failed: { gap: 12, paddingHorizontal: 32, backgroundColor: 'rgba(0,0,0,0.55)' },
  pill: { height: 40, paddingHorizontal: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  pressed: { opacity: 0.75 },
  middle: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  center: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: SCRIM },
  skip: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: SCRIM },
  skipLabel: { fontSize: 10, lineHeight: 12, marginTop: -1 },
  spinner: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  jump: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SCRIM,
  },
  jumpBack: { left: 20 },
  jumpForward: { right: 20 },
  close: { position: 'absolute', left: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: SCRIM },
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: 22,
    backgroundColor: SCRIM,
  },
  time: { fontVariant: ['tabular-nums'], marginRight: 4 },
  trackHit: { flex: 1, height: 24, justifyContent: 'center' },
  track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  trackActive: { height: 6, borderRadius: 3 },
  fill: { height: '100%', backgroundColor: '#fff' },
  thumb: { position: 'absolute', top: 6, width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: '#fff' },
  thumbActive: { top: 3, width: 18, height: 18, marginLeft: -9, borderRadius: 9 },
  rate: { minWidth: 40, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sound: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
