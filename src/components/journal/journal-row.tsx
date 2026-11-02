import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { DishPlaceholder } from '@/components/recipe/ai-hero';
import { RECIPE_ROW_PHOTO } from '@/components/recipe/recipe-list-card';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { dayLabel, photoSource, ratingLabel, type CookLog } from '@/lib/journal';

/**
 * One cook in the journal timeline: the user's photo (or the recipe's), the recipe, the day and
 * verdict, and the note. Tapping opens the recipe; the "…" button or a long press opens the menu.
 */
export function JournalRow({ log, onMenu, showTitle = true }: { log: CookLog; onMenu: (log: CookLog) => void; showTitle?: boolean }) {
  const { colors } = useTheme();
  const verdict = ratingLabel(log.rating);
  const facts = [dayLabel(log.cookedAt), verdict].filter(Boolean).join(' · ');
  const openable = !!log.entryId;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => (openable ? router.push(`/recipe/${log.entryId}`) : onMenu(log))}
        onLongPress={() => onMenu(log)}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={[log.recipeTitle, facts, log.note].filter(Boolean).join(', ')}
        accessibilityHint={openable ? 'Tarifi açar' : 'Bu tarif artık kitabında yok'}
        accessibilityActions={[{ name: 'longpress', label: 'Seçenekler' }]}
        onAccessibilityAction={() => onMenu(log)}
        style={({ pressed }) => [styles.main, pressed && { backgroundColor: colors.surfaceMuted }]}>
        <View style={[styles.photo, { backgroundColor: colors.peach }]}>
          {log.photoUrl ? (
            <Image source={photoSource(log.photoUrl)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : log.recipeImageUrl ? (
            <Image source={log.recipeImageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <DishPlaceholder category={log.category} size={30} />
          )}
        </View>
        <View style={styles.texts}>
          {showTitle ? (
            <Text variant="title3" numberOfLines={2}>
              {log.recipeTitle}
            </Text>
          ) : null}
          <Text variant={showTitle ? 'footnote' : 'headline'} color={showTitle ? 'textSecondary' : 'text'} numberOfLines={1}>
            {facts}
          </Text>
          {log.note ? (
            <Text variant="callout" numberOfLines={3} style={styles.note}>
              {log.note}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <IconButton icon="ellipsis-horizontal" label="Seçenekler" tone="muted" size={40} onPress={() => onMenu(log)} style={styles.more} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: ScreenPadding, paddingRight: 8, paddingVertical: 14 },
  photo: { width: RECIPE_ROW_PHOTO, height: RECIPE_ROW_PHOTO, borderRadius: Radius.md, overflow: 'hidden' },
  texts: { flex: 1, gap: 3 },
  note: { marginTop: 3 },
  more: { marginRight: ScreenPadding - 4 },
});
