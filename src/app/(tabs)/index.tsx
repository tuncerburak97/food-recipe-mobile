import { router } from 'expo-router';
import { useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CategoryTiles } from '@/components/home/category-tiles';
import { CreatorRail } from '@/components/home/creator-rail';
import { FeatureCards } from '@/components/home/feature-cards';
import { FeaturedRecipe } from '@/components/home/featured-recipe';
import { GenerationStatus } from '@/components/home/generation-status';
import { HomeHeader } from '@/components/home/home-header';
import { KitchenShortcuts } from '@/components/home/kitchen-shortcuts';
import { RecipeCard } from '@/components/recipe/recipe-card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { SheetHeader, sheetScrollStyles } from '@/components/ui/layout';
import { SearchField } from '@/components/ui/search-field';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { useCategories, useCreators, useFeed, useGenerations, useMe } from '@/lib/queries';
import { tourStorage } from '@/lib/token-storage';
import { wasSharedThisSession } from '@/store/pending-share';

const RAIL_CARD = 156;
/** Home shows the biggest categories (three rows of two); "Tümü" opens Search with every category. */
const HOME_CATEGORIES = 6;

/**
 * Home. On the cream page: who you are, one question ("Bugün ne pişirelim?"), search and the two
 * main jobs. On the white sheet: background recipes, the newest recipe large, the latest ones,
 * categories and the Instagram accounts they come from.
 */
export default function HomeScreen() {
  const { colors } = useTheme();
  const meQuery = useMe();
  const me = meQuery.data;

  // The app tour is shown once, the first time Home opens (right after onboarding).
  useEffect(() => {
    tourStorage
      .get()
      .then((seen) => {
        // Not when the app was opened by a share: the user came to add a recipe, the tour can wait.
        if (seen !== '1' && !wasSharedThisSession()) router.push('/tour');
      })
      .catch(() => {});
  }, []);

  const generations = useGenerations();
  const recent = useFeed({ scope: 'all' }, { limit: 10 });
  const categories = useCategories();
  const creators = useCreators();

  const recentItems = recent.data?.pages[0]?.items ?? [];
  const [featured, ...rest] = recentItems;
  const categoryCounts = categories.data?.items ?? [];
  const topCreators = (creators.data ?? []).slice(0, 10);

  const refresh = () => {
    generations.refetch();
    recent.refetch();
    categories.refetch();
    creators.refetch();
    meQuery.refetch();
  };

  const scroll = sheetScrollStyles(colors);
  return (
    <ScrollView
      style={scroll.scroll}
      contentContainerStyle={scroll.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={recent.isRefetching} onRefresh={refresh} tintColor={colors.textSecondary} />}>
      <SheetHeader
        header={
          <>
            <HomeHeader
              name={me?.name}
              onProfile={() => router.navigate('/settings')}
              unseen={generations.data?.unseen ?? 0}
              onInbox={() => router.push('/inbox')}
            />
            <Text variant="display" accessibilityRole="header" style={styles.question}>
              Bugün ne pişirelim?
            </Text>
            <SearchField onPress={() => router.navigate('/search')} placeholder="Tarif, malzeme ya da hesap ara" />
            <FeatureCards />
          </>
        }>
        <View style={styles.sheet}>
          <GenerationStatus jobs={generations.data?.items ?? []} />

          <KitchenShortcuts />

          {recent.isPending ? (
            <FeaturedSkeleton />
          ) : recent.isError ? (
            <ErrorState {...describeError(recent.error)} onRetry={() => recent.refetch()} />
          ) : !featured ? (
            <EmptyState icon="book-outline" title="Henüz tarif yok" message="Instagram’da beğendiğin bir yemek videosunu ekleyerek başla.">
              <Button title="Videodan tarif ekle" icon="logo-instagram" onPress={() => router.push('/add')} />
            </EmptyState>
          ) : (
            <View style={styles.section}>
              <SectionHeader title="Öne çıkan" action={{ label: 'Tümü', onPress: () => router.navigate('/search') }} />
              <FeaturedRecipe entry={featured} />
            </View>
          )}

          {rest.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="Son eklenenler" action={{ label: 'Tümü', onPress: () => router.navigate('/search') }} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.rail}>
                {rest.map((e) => (
                  <RecipeCard key={e.id} entry={e} width={RAIL_CARD} mine={e.addedBy.id === me?.id} />
                ))}
              </ScrollView>
            </View>
          )}

          {categoryCounts.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Kategoriler"
                action={categoryCounts.length > HOME_CATEGORIES ? { label: 'Tümü', onPress: () => router.navigate('/search') } : undefined}
              />
              <CategoryTiles counts={categoryCounts.slice(0, HOME_CATEGORIES)} />
            </View>
          )}

          {topCreators.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="Hesaplar"
                subtitle="Tariflerin geldiği Instagram hesapları"
                action={{ label: 'Tümü', onPress: () => router.push('/creators') }}
              />
              <CreatorRail creators={topCreators} />
            </View>
          )}
        </View>
      </SheetHeader>
    </ScrollView>
  );
}

function FeaturedSkeleton() {
  return (
    <SkeletonPulse style={styles.section}>
      <SkeletonBlock width={140} height={20} radius={6} />
      <SkeletonBlock height={320} radius={Radius.xl} />
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  question: { marginTop: 4 },
  sheet: { paddingHorizontal: ScreenPadding, paddingTop: 4, paddingBottom: 32, gap: 32 },
  section: { gap: 14 },
  bleed: { marginHorizontal: -ScreenPadding },
  rail: { paddingHorizontal: ScreenPadding, gap: 14 },
});
