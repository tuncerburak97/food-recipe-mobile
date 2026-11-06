import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { PageHeader } from '@/components/browse/page-header';
import { RowSkeleton } from '@/components/browse/row-skeleton';
import { ListLabel, RowDivider, useListBottomPadding } from '@/components/browse/sheet-list';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { SheetLayout } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { sourceName } from '@/lib/instagram';
import { describeError } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { useGenerations, useImportRecipe, useMarkGenerationsSeen, useStartGeneration } from '@/lib/queries';
import { isReelImport, jobIngredients, type GenerationJob } from '@/lib/types';
import { showToast } from '@/store/toast';

type Section = { title: string; data: GenerationJob[] };

const DAY = 86_400_000;

function jobTime(job: GenerationJob): string {
  return job.finished_at ?? job.created_at;
}

/** Groups the jobs (newest first) into "Bugün", "Dün" and "Daha önce", keeping their order. */
function byDay(items: GenerationJob[]): Section[] {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const today = midnight.getTime();
  const sections: Section[] = [
    { title: 'Bugün', data: [] },
    { title: 'Dün', data: [] },
    { title: 'Daha önce', data: [] },
  ];
  for (const job of items) {
    const t = new Date(jobTime(job)).getTime();
    sections[t >= today ? 0 : t >= today - DAY ? 1 : 2].data.push(job);
  }
  return sections.filter((s) => s.data.length > 0);
}

/** "Bildirimler": recipes prepared in the background, newest first. Opening the screen marks them seen. */
export default function InboxScreen() {
  const { colors } = useTheme();
  const bottom = useListBottomPadding('stack');
  const jobs = useGenerations();
  const markSeen = useMarkGenerationsSeen();
  const unseen = jobs.data?.unseen ?? 0;
  const items = jobs.data?.items ?? [];
  const sections = byDay(items);
  const preparing = items.filter((j) => j.status === 'pending').length;

  useEffect(() => {
    if (unseen > 0 && !markSeen.isPending) markSeen.mutate(undefined);
  }, [unseen, markSeen]);

  let empty;
  if (jobs.isPending) empty = <RowSkeleton count={4} leading={40} />;
  else if (jobs.isError) {
    const err = describeError(jobs.error);
    empty = <ErrorState title={err.title} message={err.message} onRetry={() => void jobs.refetch()} retrying={jobs.isRefetching} />;
  } else {
    empty = (
      <EmptyState icon="notifications-outline" title="Bildirim yok" message="Elindekilerle hazırladığın tarifler bittiğinde burada görünür.">
        <Button title="Elimde ne var?" onPress={() => router.push('/chef')} />
      </EmptyState>
    );
  }

  return (
    <SheetLayout
      header={
        <PageHeader
          back
          title="Bildirimler"
          subtitle={preparing > 0 ? `${preparing} tarif hazırlanıyor. Hazır olunca burada görünür.` : 'Hazırladığın tarifler bitince burada görünür.'}
        />
      }>
      <SectionList
        sections={sections}
        keyExtractor={(j) => j.id}
        renderItem={({ item }) => <JobRow job={item} />}
        renderSectionHeader={({ section }) => <ListLabel label={section.title} first={section.title === sections[0]?.title} />}
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={RowDivider}
        ListEmptyComponent={empty}
        refreshControl={
          <RefreshControl
            refreshing={jobs.isRefetching && !jobs.isError}
            onRefresh={() => void jobs.refetch()}
            tintColor={colors.textSecondary}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
      />
    </SheetLayout>
  );
}

/** The status in a round mark: a spinner while preparing, a check when ready, an alert when it failed. */
function StatusMark({ status }: { status: GenerationJob['status'] }) {
  const { colors } = useTheme();
  if (status === 'pending') {
    return (
      <View style={[styles.mark, { backgroundColor: colors.surfaceMuted }]}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
      </View>
    );
  }
  const done = status === 'done';
  return (
    <View style={[styles.mark, { backgroundColor: done ? colors.successSoft : colors.dangerSoft }]}>
      <Icon name={done ? 'checkmark' : 'alert'} size={20} color={done ? colors.success : colors.danger} />
    </View>
  );
}

function JobRow({ job }: { job: GenerationJob }) {
  const { colors } = useTheme();
  const start = useStartGeneration();
  const importRecipe = useImportRecipe();
  const reel = isReelImport(job.request);
  const ingredients = isReelImport(job.request) ? `${sourceName(job.request.url)}’dan` : jobIngredients(job).join(', ');
  const time = relativeTime(jobTime(job));
  const done = job.status === 'done';
  const failed = job.status === 'failed';
  const title = done
    ? (job.title ?? 'Tarifin hazır')
    : failed
      ? reel
        ? 'Tarif eklenemedi'
        : 'Tarif hazırlanamadı'
      : reel
        ? 'Tarif defterine ekleniyor'
        : 'Tarifin hazırlanıyor';
  const detail = failed && job.error ? job.error.message : ingredients;

  const handlers = {
    onSuccess: () => showToast({ title: 'Tarifin hazırlanıyor', message: 'Hazır olunca haber vereceğiz.' }),
    onError: (e: unknown) => showToast({ title: describeError(e).title, message: describeError(e).message }),
  };
  const retry = () => (isReelImport(job.request) ? importRecipe.mutate(job.request.url, handlers) : start.mutate(job.request, handlers));

  const texts = (
    <View style={styles.texts}>
      <Text variant="headline" numberOfLines={2}>
        {title}
      </Text>
      {detail ? (
        <Text variant="subhead" color="textSecondary" numberOfLines={failed ? 3 : 1}>
          {detail}
        </Text>
      ) : null}
      <Text variant="footnote" color="textTertiary">
        {done ? (
          <Text variant="footnote" weight="700" color="success">
            {'Hazır · '}
          </Text>
        ) : null}
        {time}
      </Text>
      {failed ? (
        <Button
          title="Tekrar dene"
          icon="refresh"
          variant="secondary"
          size="sm"
          loading={start.isPending || importRecipe.isPending}
          accessibilityHint={reel ? "Tarifi yeniden eklemeyi dener" : "Aynı malzemelerle tarifi yeniden hazırlar"}
          onPress={retry}
          style={styles.retry}
        />
      ) : null}
    </View>
  );

  if (done) {
    return (
      <Pressable
        disabled={!job.entry_id}
        onPress={() => router.push(`/recipe/${job.entry_id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${title}, hazır, ${time}`}
        accessibilityHint="Tarifi açar"
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceMuted }]}>
        <StatusMark status={job.status} />
        {texts}
        {job.entry_id ? <Icon name="chevron-forward" size={18} color={colors.textTertiary} style={styles.chevron} /> : null}
      </Pressable>
    );
  }

  return (
    <View
      style={styles.row}
      // A failed row keeps its parts separate so the retry button stays reachable with VoiceOver.
      accessible={!failed}
      accessibilityLabel={failed ? undefined : [title, ingredients, time].filter(Boolean).join(', ')}>
      <StatusMark status={job.status} />
      {texts}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, minHeight: 76, paddingHorizontal: ScreenPadding, paddingVertical: 14 },
  mark: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 3, paddingTop: 1 },
  retry: { alignSelf: 'flex-start', marginTop: 8 },
  chevron: { alignSelf: 'center' },
});
