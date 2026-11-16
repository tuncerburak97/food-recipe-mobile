import { Image, type ImageContentFit } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { DishPlaceholder } from '@/components/recipe/ai-hero';

interface Props {
  /** The photo; empty shows the plate mark. */
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  /** Diameter of the plate mark shown under (and instead of) the photo. */
  placeholderSize?: number;
  transition?: number;
  contentFit?: ImageContentFit;
  /** For rows in recycled lists: keeps a reused row from flashing the previous photo. */
  recyclingKey?: string;
}

/** Waits before asking again for a photo the server did not have yet (ms). */
const RETRY_AFTER = [2500, 7000];

/**
 * A recipe's photo that is never an empty box: the plate mark sits under it, so it shows while the
 * photo loads and stays when there is no photo or it cannot be loaded.
 *
 * Covers are the server's own copies (/media/...). The first time one is asked for, the server may
 * still be fetching it and answers "not yet"; those are asked for again a little later, twice.
 */
export function RecipeImage({ uri, style, placeholderSize = 40, transition = 150, contentFit = 'cover', recyclingKey }: Props) {
  // Remembered per link, so a new photo for the same card starts over.
  const [state, setState] = useState<{ uri: string; tries: number; failed: boolean }>({ uri: '', tries: 0, failed: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const current = uri && state.uri === uri ? state : { uri: uri ?? '', tries: 0, failed: false };
  const show = !!uri && !current.failed;
  // A retry gets its own address, so the image cache does not answer with the earlier failure.
  const source = uri && current.tries > 0 ? `${uri}${uri.includes('?') ? '&' : '?'}retry=${current.tries}` : uri;

  const onError = () => {
    if (!uri) return;
    const wait = uri.includes('/media/') ? RETRY_AFTER[current.tries] : undefined;
    if (wait == null) {
      setState({ uri, tries: current.tries, failed: true });
      return;
    }
    // Hidden until the retry, so the plate mark shows instead of a broken image.
    setState({ uri, tries: current.tries, failed: true });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState({ uri, tries: current.tries + 1, failed: false }), wait);
  };

  return (
    <View style={[styles.box, style]}>
      <DishPlaceholder size={placeholderSize} />
      {show ? (
        <Image
          source={source}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          transition={transition}
          recyclingKey={recyclingKey}
          onError={onError}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden' },
});
