import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';

import { DishPlaceholder } from '@/components/recipe/ai-hero';
import { Avatar } from '@/components/ui/avatar';
import { Chip } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { openScreen } from '@/hooks/use-agent-chat';
import { useTheme } from '@/hooks/use-theme';
import { useTask } from '@/lib/agent/tasks';
import type { AgentBlock, AgentLink, AgentRecipeItem } from '@/lib/agent/types';
import { CATEGORY_LABELS, formatMinutes, totalMinutes } from '@/lib/format';
import { useGenerations } from '@/lib/queries';
import type { Creator, GenerationJob } from '@/lib/types';

const FIRST = 4;

/** The white card every block sits in. */
function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      layout={LinearTransition.duration(200)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {children}
    </Animated.View>
  );
}

function CardHead({ title, meta }: { title?: string; meta?: string }) {
  if (!title && !meta) return null;
  return (
    <View style={styles.cardHead}>
      <Text variant="overline" color="textTertiary" numberOfLines={1} style={styles.flex}>
        {(title ?? '').toLocaleUpperCase('tr-TR')}
      </Text>
      {meta ? (
        <Text variant="footnote" color="textTertiary">
          {meta}
        </Text>
      ) : null}
    </View>
  );
}

function RecipeRow({ item, last, label }: { item: AgentRecipeItem; last: boolean; label?: string }) {
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
      accessibilityLabel={[label, recipe.title, facts, note?.label].filter(Boolean).join(', ')}
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
        {label ? (
          <Text variant="overline" color="accentText" numberOfLines={1}>
            {label.toLocaleUpperCase('tr-TR')}
          </Text>
        ) : null}
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

function RecipeBlock({ title, items, total, more }: { title?: string; items: AgentRecipeItem[]; total?: number; more?: AgentLink }) {
  const { colors } = useTheme();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, FIRST);
  const close = items.some((i) => i.partial);
  const count = Math.max(total ?? 0, items.length);
  // More matched than the chat holds: say so, and offer the screen with all of them.
  const beyond = all && count > items.length;
  const footer = items.length > FIRST || beyond;

  return (
    <Card>
      <CardHead title={title} meta={`${count} tarif${close ? ' · yakın eşleşmeler var' : ''}`} />
      {shown.map((it, i) => (
        <RecipeRow key={it.entry.id} item={it} last={i === shown.length - 1 && !footer} />
      ))}
      {beyond ? (
        <View style={[styles.beyond, { borderTopColor: colors.border }]}>
          <Text variant="footnote" color="textSecondary">
            En iyi {items.length} tarif burada; daraltmak için aşağıdan sor.
          </Text>
          {more ? <Chip label={more.label} icon="open-outline" kind="button" tone="sunken" size="sm" onPress={() => openScreen(more)} /> : null}
        </View>
      ) : null}
      {items.length > FIRST ? (
        <Pressable
          onPress={() => setAll((v) => !v)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.more, { borderTopColor: colors.border }, pressed && { backgroundColor: colors.surfaceMuted }]}>
          <Text variant="subhead" color="accentText">
            {all ? 'Daha az göster' : `Tümünü gör (${count > items.length ? `${items.length}/${count}` : items.length})`}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

/** A menu: one labelled row per day or meal. */
function PlanBlock({ title, plan }: { title?: string; plan: { label: string; recipe: AgentRecipeItem }[] }) {
  return (
    <Card>
      <CardHead title={title || 'Menün'} meta={`${plan.length} öğün`} />
      {plan.map((p, i) => (
        <RecipeRow key={`${p.label}-${p.recipe.entry.id}`} item={p.recipe} label={p.label} last={i === plan.length - 1} />
      ))}
    </Card>
  );
}

function Links({ links }: { links: AgentLink[] }) {
  if (!links.length) return null;
  return (
    <View style={styles.links}>
      {links.map((l) => (
        <Chip key={`${l.screen}-${l.id ?? ''}`} label={l.label} icon="open-outline" kind="button" tone="sunken" size="sm" onPress={() => openScreen(l)} />
      ))}
    </View>
  );
}

/** A row with a round mark on the left: status cards (what changed, a job, an adaptation). */
function StatusCard({ icon, tone, busy, title, children }: { icon: IconName; tone: 'success' | 'neutral' | 'danger'; busy?: boolean; title: string; children?: React.ReactNode }) {
  const { colors } = useTheme();
  const well = { success: colors.successSoft, neutral: colors.surfaceMuted, danger: colors.dangerSoft }[tone];
  const mark = { success: colors.success, neutral: colors.textSecondary, danger: colors.danger }[tone];
  return (
    <Card>
      <View style={styles.status}>
        <View style={[styles.well, { backgroundColor: well }]}>
          {busy ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Icon name={icon} size={18} color={mark} />}
        </View>
        <View style={styles.statusBody}>
          <Text variant="headline">{title}</Text>
          {children}
        </View>
      </View>
    </Card>
  );
}

function NoticeBlock({ title, lines, links }: { title: string; lines: string[]; links: AgentLink[] }) {
  return (
    <StatusCard icon="checkmark" tone="success" title={title}>
      {lines.map((l, i) => (
        <Text key={i} variant="callout" color="textSecondary">
          {l}
        </Text>
      ))}
      <Links links={links} />
    </StatusCard>
  );
}

/** An AI chef recipe being written in the background: follows the job until its recipe is there. */
function JobBlock({ job }: { job: GenerationJob }) {
  const live = useGenerations().data?.items.find((j) => j.id === job.id) ?? job;
  if (live.status === 'done' && live.entry_id) {
    return (
      <StatusCard icon="sparkles" tone="success" title="Tarifin hazır">
        {live.title ? (
          <Text variant="callout" color="textSecondary">
            {live.title}
          </Text>
        ) : null}
        <Links links={[{ screen: 'recipe', id: String(live.entry_id), label: 'Tarifi aç' }]} />
      </StatusCard>
    );
  }
  if (live.status === 'failed') {
    return (
      <StatusCard icon="alert" tone="danger" title="Tarif yazılamadı">
        <Text variant="callout" color="textSecondary">
          {live.error?.message ?? 'Tekrar dener misin?'}
        </Text>
      </StatusCard>
    );
  }
  return (
    <StatusCard icon="sparkles" tone="neutral" busy title="AI Şef tarifini yazıyor">
      <Text variant="callout" color="textSecondary">
        {live.request.ingredients.slice(0, 4).join(', ')} · yaklaşık 1 dakika
      </Text>
      <Text variant="footnote" color="textTertiary">
        Burada bekleyebilir ya da çıkabilirsin; hazır olunca haber veririz.
      </Text>
    </StatusCard>
  );
}

/** An adaptation the app is running ("Airfryer’a uyarlanıyor"), then a button to the new version. */
function AdaptBlock({ title, label, taskKey }: { title: string; label: string; taskKey: string }) {
  const task = useTask(taskKey);
  if (task?.status === 'done') {
    return (
      <StatusCard icon="checkmark" tone="success" title="Senin versiyonun hazır">
        <Text variant="callout" color="textSecondary">
          {title} · {task.note}
        </Text>
        <Links links={[{ screen: 'recipe', id: task.entryId, label: 'Tarifi aç' }]} />
      </StatusCard>
    );
  }
  if (task?.status === 'failed') {
    return (
      <StatusCard icon="alert" tone="danger" title="Uyarlanamadı">
        <Text variant="callout" color="textSecondary">
          {task.message}
        </Text>
      </StatusCard>
    );
  }
  return (
    <StatusCard icon="sparkles" tone="neutral" busy title={label}>
      <Text variant="callout" color="textSecondary">
        {title} · 10-30 saniye
      </Text>
    </StatusCard>
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

/** A card the assistant sent: recipes, a menu, accounts, what changed, or work in progress. */
export function ResultBlock({ block }: { block: AgentBlock }) {
  switch (block.type) {
    case 'recipes':
      return <RecipeBlock title={block.title} items={block.recipes} total={block.total} more={block.more} />;
    case 'plan':
      return <PlanBlock title={block.title} plan={block.plan} />;
    case 'creators':
      return <CreatorBlock items={block.creators} />;
    case 'notice':
      return <NoticeBlock title={block.title} lines={block.lines} links={block.links} />;
    case 'job':
      return <JobBlock job={block.job} />;
    case 'adapt':
      return <AdaptBlock title={block.title} label={block.label} taskKey={block.taskKey} />;
  }
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 72 },
  photo: { width: 52, height: 52, borderRadius: Radius.sm + 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  more: { alignItems: 'center', justifyContent: 'center', minHeight: 46, borderTopWidth: StyleSheet.hairlineWidth },
  beyond: { gap: 8, padding: 14, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'flex-start' },
  status: { flexDirection: 'row', gap: 12, padding: 14 },
  well: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusBody: { flex: 1, gap: 4, paddingTop: 7 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  bleed: { marginHorizontal: -20 },
  creators: { gap: 10, paddingHorizontal: 20 },
  creator: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 8, paddingRight: 16, paddingVertical: 8, borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth, maxWidth: 280 },
  creatorText: { flexShrink: 1, gap: 1 },
});
