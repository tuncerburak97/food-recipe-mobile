import { router } from 'expo-router';
import { useEffect } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AssistantHero } from '@/components/home/assistant-hero';
import { CategoryTiles } from '@/components/home/category-tiles';
import { ChefHero } from '@/components/home/chef-hero';
import { CreatorRail } from '@/components/home/creator-rail';
import { FeaturedRecipe } from '@/components/home/featured-recipe';
import { GenerationStatus } from '@/components/home/generation-status';
import { HomeHeader } from '@/components/home/home-header';
import { KitchenShortcuts } from '@/components/home/kitchen-shortcuts';
import { ReelHero } from '@/components/home/reel-hero';
import { RecipeCard } from '@/components/recipe/recipe-card';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { SheetHeader, sheetScrollStyles } from '@/components/ui/layout';
import { SectionHeader } from '@/components/ui/section-header';
import { SkeletonBlock, SkeletonPulse } from '@/components/ui/skeleton';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';
import { useCategories, useCreators, useFeed, useGenerations, useMe } from '@/lib/queries';
import { tourStorage } from '@/lib/token-storage';
import { wasSharedThisSession } from '@/store/pending-share';

const RAIL_CARD = 172;
/** How many of the newest recipes the "Öne çıkan" carousel shows large. */
const FEATURED = 5;
/** Home shows the biggest categories (three rows of two); "Tümü" opens Search with every category. */
const HOME_CATEGORIES = 6;

/**
 * Home. On the page: who you are, the AI chef assistant (ask or say anything the app can do), and
 * the two main jobs as two slim strips, one under the other: a dark video strip (Instagram) and the
 * orange "write me a recipe". The sheet gives the food the room: background recipes, the newest recipes as large photo
 * cards to swipe, what the pantry can cook, the latest ones, categories and the accounts.
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
  const featured = recentItems.slice(0, FEATURED);
  const rest = recentItems.slice(FEATURED);
  // The next card peeks in from the right, so the carousel reads as swipeable.
  const featuredWidth = Math.round(useWindowDimensions().width - ScreenPadding * 2 - 36);
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
            <AssistantHero />
            <View style={styles.heroes}>
              <ReelHero />
              <ChefHero />
            </View>
          </>
        }>
        <View style={styles.sheet}>
          <GenerationStatus jobs={generations.data?.items ?? []} />

          {recent.isPending ? (
            <FeaturedSkeleton />
          ) : recent.isError ? (
            <ErrorState {...describeError(recent.error)} onRetry={() => recent.refetch()} />
          ) : featured.length === 0 ? (
            <EmptyState icon="book-outline" title="Henüz tarif yok" message="Instagram’da beğendiğin bir yemek videosunu ekleyerek başla.">
              <Button title="Videodan tarif ekle" icon="logo-instagram" onPress={() => router.push('/add')} />
            </EmptyState>
          ) : (
            <View style={styles.section}>
              <SectionHeader title="Öne çıkan" action={{ label: 'Tümü', onPress: () => router.navigate('/search') }} />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={featuredWidth + 12}
                snapToAlignment="start"
                style={styles.bleed}
                contentContainerStyle={styles.featuredRail}>
                {featured.map((e) => (
                  <FeaturedRecipe key={e.id} entry={e} width={featuredWidth} />
                ))}
              </ScrollView>
            </View>
          )}

          <KitchenShortcuts />

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
  heroes: { gap: 8 },
  sheet: { paddingHorizontal: ScreenPadding, paddingTop: 4, paddingBottom: 32, gap: 32 },
  section: { gap: 14 },
  bleed: { marginHorizontal: -ScreenPadding },
  rail: { paddingHorizontal: ScreenPadding, gap: 14 },
  featuredRail: { paddingHorizontal: ScreenPadding, gap: 12 },
});
