import { requireOptionalNativeModule } from 'expo';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { videoSource } from '@/lib/api';

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
  style?: StyleProp<ViewStyle>;
}

/**
 * The recipe's Instagram video, played inside the app. Shows the cover photo with a big play button
 * first, so nothing is downloaded until the user asks for it.
 */
export function VideoHero({ shortcode, imageUrl, instagramUrl, bottomInset = 0, style }: Props) {
  const [started, setStarted] = useState(false);

  const play = () => {
    if (canPlayInApp) setStarted(true);
    else if (instagramUrl) Linking.openURL(instagramUrl);
  };

  return (
    <View style={[styles.box, style]}>
      {started && shortcode ? (
        <View style={[StyleSheet.absoluteFill, { bottom: bottomInset }]}>
          <Player shortcode={shortcode} />
        </View>
      ) : (
        <>
          {imageUrl ? <Image source={imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
          {shortcode && (canPlayInApp || instagramUrl) && (
            <Pressable onPress={play} accessibilityRole="button" accessibilityLabel="Videoyu oynat" style={[styles.overlay, { paddingBottom: bottomInset }]}>
              <View style={styles.play}>
                <View style={styles.playButton}>
                  <Icon name="play" size={18} color="#1E1C1A" style={styles.playIcon} />
                </View>
                <Text variant="subhead" weight="700" tint="#FFFFFF" style={styles.playLabel}>
                  {canPlayInApp ? 'Videoyu izle' : 'Instagram’da izle'}
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
function Player({ shortcode }: { shortcode: string }) {
  // Loaded lazily: see canPlayInApp.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useVideoPlayer, VideoView } = require('expo-video') as typeof import('expo-video');
  const source = useMemo(() => videoSource(shortcode), [shortcode]);
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls fullscreenOptions={{ enable: true }} />
  );
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
