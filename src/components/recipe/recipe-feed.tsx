import type { ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';

import { RowDivider, useListBottomPadding, type ListPlacement } from '@/components/browse/sheet-list';
import { RecipeListCard } from '@/components/recipe/recipe-list-card';
import { RecipeRowSkeleton } from '@/components/recipe/recipe-row-skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import type { IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';
import { describeError, type FeedParams } from '@/lib/api';
import { useFeed, useMe } from '@/lib/queries';

interface Props {
  params: FeedParams;
  /** Rows above the first recipe (inside the sheet). */
  header?: ReactElement;
  /** What to show when there are no recipes; `action` is the button that gets the user going. */
  empty: { icon: IconName; title: string; message?: string; action?: ReactElement };
  /** 'tab' inside a tab screen, 'stack' on a pushed screen (also clears the home indicator). */
  placement?: ListPlacement;
}

/**
 * A scrolling list of recipe rows for the white sheet, with loading (skeleton rows), error (retry),
 * empty (with an action), pull-to-refresh and paging handled.
 */
export function RecipeFeed({ params, header, empty, placement = 'stack' }: Props) {
  const { colors } = useTheme();
  const bottom = useListBottomPadding(placement);
  const me = useMe().data;
  const feed = useFeed(params);
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  // In the user's own book every recipe is theirs; the "Tariflerimde" note only helps in shared lists.
  const markMine = params.scope !== 'mine';

  let emptyView: ReactElement;
  if (feed.isPending) emptyView = <RecipeRowSkeleton count={6} inset />;
  else if (feed.isError) {
    const err = describeError(feed.error);
    emptyView = <ErrorState title={err.title} message={err.message} onRetry={() => void feed.refetch()} retrying={feed.isRefetching} />;
  } else {
    emptyView = (
      <EmptyState icon={empty.icon} title={empty.title} message={empty.message}>
        {empty.action}
      </EmptyState>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(e) => e.id}
      renderItem={({ item }) => <RecipeListCard entry={item} mine={markMine && item.addedBy.id === me?.id} />}
      ItemSeparatorComponent={RowDivider}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyView}
      ListFooterComponent={feed.isFetchingNextPage ? <ActivityIndicator color={colors.textSecondary} style={styles.footer} /> : undefined}
      onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={feed.isRefetching && !feed.isFetchingNextPage && !feed.isError}
          onRefresh={() => void feed.refetch()}
          tintColor={colors.textSecondary}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface}
        />
      }
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
    />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingTop: 6 },
  footer: { marginVertical: 20 },
});
