import { requireOptionalNativeModule, useEvent, useEventListener } from 'expo';
import type { VideoPlayer } from 'expo-video';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { RecipeImage } from '@/components/recipe/recipe-image';
import { Icon } from '@/components/ui/icon';
import { videoSource } from '@/lib/api';
import { isYouTube } from '@/lib/instagram';

// Builds made before expo-video was added do not have its native module; importing it there would
// crash (see video-hero). Those show the cover photo only.
const canPlay = Platform.OS === 'web' || requireOptionalNativeModule('ExpoVideo') != null;

/**
 * Starts a reel playing on repeat, without sound, and hands the player to its children, so one
 * video can move from one frame to the next without loading twice. The children get null where the
 * video cannot be played inside the app (YouTube, an old build): a frame shows the cover then.
 */
export function ReelPlayer({ shortcode, children }: { shortcode?: string; children: (player: VideoPlayer | null) => ReactNode }) {
  if (!canPlay || !shortcode || isYouTube(shortcode)) return <>{children(null)}</>;
  return <Playing shortcode={shortcode}>{children}</Playing>;
}

function Playing({ shortcode, children }: { shortcode: string; children: (player: VideoPlayer | null) => ReactNode }) {
  // Loaded lazily: see canPlay.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useVideoPlayer } = require('expo-video') as typeof import('expo-video');
  const source = useMemo(() => videoSource(shortcode), [shortcode]);
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = 0.25;
    p.play();
  });
  return <>{children(player)}</>;
}

interface FrameProps {
  player: VideoPlayer | null;
  imageUrl?: string;
  /** Shows a button that turns the video's sound on and off. */
  sound?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A reel in a frame: its cover photo, and over it the video filling the frame once it is playing.
 * A video that does not load leaves the cover, so the frame is never empty.
 */
export function ReelFrame({ player, imageUrl, sound, style }: FrameProps) {
  return (
    <View style={[styles.frame, style]}>
      <RecipeImage uri={imageUrl} style={StyleSheet.absoluteFill} placeholderSize={56} />
      {player ? <Video player={player} sound={sound} /> : null}
    </View>
  );
}

// Player changes live outside the component: the React compiler treats props as read-only.
function setMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

function Video({ player, sound }: { player: VideoPlayer; sound?: boolean }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { VideoView } = require('expo-video') as typeof import('expo-video');
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });
  // Hidden until there is a picture, so the cover does not give way to a black frame. A player
  // that was already playing in another frame may not report a first frame here: time moving on
  // says the same.
  const [showing, setShowing] = useState(false);
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (currentTime > 0.1) setShowing(true);
  });
  // On web a player only plays the views it has, so "play" from before this one existed is lost.
  useEffect(() => {
    player.play();
  }, [player]);

  return (
    <>
      <VideoView
        player={player}
        style={[styles.video, !showing && styles.hidden]}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        onFirstFrameRender={() => setShowing(true)}
      />
      {sound && showing ? (
        <Pressable
          onPress={() => setMuted(player, !muted)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={muted ? 'Videonun sesini aç' : 'Videonun sesini kapat'}
          style={({ pressed }) => [styles.sound, pressed && styles.pressed]}>
          <Icon name={muted ? 'volume-mute' : 'volume-high'} size={15} color="#fff" />
        </Pressable>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: '#111' },
  // The size is spelled out: on web a video does not stretch between its edges like a view does.
  video: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  hidden: { opacity: 0 },
  sound: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,18,16,0.62)',
  },
  pressed: { opacity: 0.75 },
});
