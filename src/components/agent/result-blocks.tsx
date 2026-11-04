import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { DishPlaceholder } from '@/components/recipe/ai-hero';
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AgentBlock, AgentRecipeItem } from '@/lib/agent/types';
import { CATEGORY_LABELS, formatMinutes, totalMinutes } from '@/lib/format';
import type { Creator } from '@/lib/types';

const FIRST = 4;

function RecipeRow({ item, last }: { item: AgentRecipeItem; last: boolean }) {
  const { colors } = useTheme();
  const { entry, missing } = item;
  const { recipe } = entry;
  const minutes = totalMinutes(recipe);
  const from = entry.origin === 'ai' ? 'Sana özel' : entry.origin === 'voice' ? 'Sesli tarif' : entry.source ? `@${entry.source.ownerUsername}` : null;
  const facts = [minutes != null ? formatMinutes(minutes) : CATEGORY_LABELS[recipe.category], from].filter(Boolean).join(' · ');
  const note = missing
    ? missing.length === 0
      ? { label: 'Hepsi evde', color: colors.success }
      : { label: `${missing.length} eksik: ${missing.slice(0, 2).join(', ')}${missing.length > 2 ? '…' : ''}`, color: colors.warning }
    : null;

  return (
    <Pressable
      onPress={() => router.push(`/recipe/${entry.id}`)}
      accessibilityRole="button"
      accessibilityLabel={[recipe.title, facts, note?.label].filter(Boolean).join(', ')}
      accessibilityHint="Tarifi açar"
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}>
      <View style={[styles.photo, { backgroundColor: colors.peach }]}>
        {entry.imageUrl ? (
          <Image source={entry.imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} recyclingKey={entry.id} />
        ) : (
          <DishPlaceholder category={recipe.category} size={22} />
        )}
      </View>
      <View style={styles.body}>
        <Text variant="headline" numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {facts}
        </Text>
        {note ? (
          <Text variant="footnote" tint={note.color} numberOfLines={1}>
            {note.label}
          </Text>
        ) : null}
      </View>
      <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

function RecipeBlock({ title, items }: { title?: string; items: AgentRecipeItem[] }) {
  const { colors } = useTheme();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, FIRST);
  const close = items.some((i) => i.partial);

  return (
    <Animated.View entering={FadeInDown.duration(220)} layout={LinearTransition.duration(200)} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {title ? (
        <View style={styles.cardHead}>
          <Text variant="overline" color="textTertiary" numberOfLines={1} style={styles.flex}>
            {title.toLocaleUpperCase('tr-TR')}
          </Text>
          <Text variant="footnote" color="textTertiary">
            {items.length} tarif{close ? ' · yakın eşleşmeler var' : ''}
          </Text>
        </View>
      ) : null}
      {shown.map((it, i) => (
        <RecipeRow key={it.entry.id} item={it} last={i === shown.length - 1 && items.length <= FIRST} />
      ))}
      {items.length > FIRST ? (
        <Pressable
          onPress={() => setAll((v) => !v)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.more, { borderTopColor: colors.border }, pressed && { backgroundColor: colors.surfaceMuted }]}>
          <Text variant="subhead" color="accentText">
            {all ? 'Daha az göster' : `Tümünü gör (${items.length})`}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

function CreatorChip({ c }: { c: Creator }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => router.push(`/creator/${encodeURIComponent(c.username)}`)}
      accessibilityRole="button"
      accessibilityLabel={`${c.full_name || c.username}, ${c.recipe_count} tarif`}
      style={({ pressed }) => [styles.creator, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { backgroundColor: colors.surfaceMuted }]}>
      <Avatar name={c.full_name || c.username} uri={c.avatar_url || undefined} size={40} />
      <View style={styles.creatorText}>
        <Text variant="headline" numberOfLines={1}>
          {c.full_name || `@${c.username}`}
        </Text>
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          @{c.username} · {c.recipe_count} tarif
        </Text>
      </View>
    </Pressable>
  );
}

function CreatorBlock({ items }: { items: Creator[] }) {
  return (
    <Animated.View entering={FadeInDown.duration(220)}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creators} style={styles.bleed}>
        {items.map((c) => (
          <CreatorChip key={c.username} c={c} />
        ))}
      </ScrollView>
    </Animated.View>
  );
}

/** Cards the assistant found: recipes as a short list, accounts as a row of chips. */
export function ResultBlock({ block }: { block: AgentBlock }) {
  if (block.type === 'recipes') return <RecipeBlock title={block.title} items={block.recipes} />;
  return <CreatorBlock items={block.creators} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 72 },
  photo: { width: 52, height: 52, borderRadius: Radius.sm + 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  more: { alignItems: 'center', justifyContent: 'center', minHeight: 46, borderTopWidth: StyleSheet.hairlineWidth },
  bleed: { marginHorizontal: -20 },
  creators: { gap: 10, paddingHorizontal: 20 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8, paddingRight: 16, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth, maxWidth: 280 },
  creatorText: { flexShrink: 1, gap: 1 },
});
