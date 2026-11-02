import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { VideoHero } from '@/components/recipe/video-hero';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';
import type { Reel } from '@/lib/types';

const VIDEO_HEIGHT = 400;
const CAPTION_LINES = 4;

/** Long captions start folded to a few lines; short ones show in full without a toggle. */
function isLong(text: string): boolean {
  return text.length > 180 || text.split('\n').length > CAPTION_LINES;
}

/** The video that was found: playable, with who posted it and its description. */
export function ReelPreview({ reel }: { reel: Reel }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const name = reel.owner.full_name || `@${reel.owner.username}`;
  const caption = reel.caption.text.trim();
  const foldable = isLong(caption);

  return (
    <View style={styles.wrap}>
      <VideoHero shortcode={reel.shortcode} imageUrl={reel.video?.thumbnail_url} instagramUrl={reel.url} style={styles.video} />

      <View style={styles.owner} accessible accessibilityLabel={`Paylaşan: ${name}${reel.owner.is_verified ? ', onaylı hesap' : ''}, @${reel.owner.username}`}>
        <Avatar name={reel.owner.full_name || reel.owner.username} uri={reel.owner.profile_pic_url} size={44} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <Text variant="headline" numberOfLines={1} style={styles.shrink}>
              {name}
            </Text>
            {reel.owner.is_verified ? <Icon name="checkmark-circle" size={16} color={colors.accentText} /> : null}
          </View>
          <Text variant="subhead" color="textSecondary" numberOfLines={1}>
            @{reel.owner.username}
          </Text>
        </View>
      </View>

      {caption.length > 0 ? (
        <Pressable
          onPress={foldable ? () => setExpanded((v) => !v) : undefined}
          disabled={!foldable}
          accessibilityRole={foldable ? 'button' : undefined}
          accessibilityState={foldable ? { expanded } : undefined}
          accessibilityHint={foldable ? (expanded ? 'Açıklamayı kısaltır' : 'Açıklamanın tamamını gösterir') : undefined}
          style={({ pressed }) => [
            styles.caption,
            { backgroundColor: pressed && foldable ? colors.surfaceMuted : colors.surface, borderColor: colors.border },
          ]}>
          <Text variant="overline" color="textTertiary">
            {upperTr('Video açıklaması')}
          </Text>
          <Text variant="callout" numberOfLines={expanded || !foldable ? undefined : CAPTION_LINES}>
            {caption}
          </Text>
          {foldable ? (
            <View style={styles.toggle}>
              <Text variant="subhead" weight="700" color="accentText">
                {expanded ? 'Daha az göster' : 'Devamını göster'}
              </Text>
              <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.accentText} />
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

/** Placeholder in the shape of the preview while the video is being found. */
export function ReelPreviewLoading() {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.loadingVideo, { backgroundColor: colors.surfaceMuted }]} accessible accessibilityRole="progressbar" accessibilityLabel="Video getiriliyor">
        <View style={[styles.loadingWell, { backgroundColor: colors.surface }]}>
          <ActivityIndicator color={colors.text} />
        </View>
        <Text variant="callout" color="textSecondary">
          Video getiriliyor…
        </Text>
      </View>
      <SkeletonPulse style={styles.owner}>
        <SkeletonBlock width={44} height={44} radius={22} />
        <View style={[styles.flex, styles.lines]}>
          <SkeletonBlock width="55%" height={14} />
          <SkeletonBlock width="35%" height={12} />
        </View>
      </SkeletonPulse>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 16 },
  video: { height: VIDEO_HEIGHT, borderRadius: Radius.xl },
  owner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
  lines: { gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  shrink: { flexShrink: 1 },
  caption: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 24 },
  loadingVideo: { height: VIDEO_HEIGHT, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingWell: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
