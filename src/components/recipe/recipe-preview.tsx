import type { VideoPlayer } from 'expo-video';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IngredientChecklist } from '@/components/recipe/ingredient-checklist';
import { MetaLine } from '@/components/recipe/meta-pills';
import { NotesCard } from '@/components/recipe/notes-card';
import { ServingsStepper } from '@/components/recipe/servings-stepper';
import { StepList } from '@/components/recipe/step-list';
import { VideoHero } from '@/components/recipe/video-hero';
import { Avatar } from '@/components/ui/avatar';
import { StickyFooter } from '@/components/ui/layout';
import { ListGroup, ListRow } from '@/components/ui/list';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { categoryLabel } from '@/constants/categories';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ingredientCount, upperTr } from '@/lib/format';
import type { RecipeEntry } from '@/lib/types';

/** Height of the photo or reel on top of a recipe, under the status bar. */
export const HERO_HEIGHT = 330;
/** How far the white sheet rises over the photo. */
export const OVERLAP = 28;

type Tab = 'ingredients' | 'steps' | 'notes';

interface Props {
  entry: RecipeEntry;
  /** A player already loading the reel (usePreloadedVideo), so "play" starts at once. */
  player?: VideoPlayer | null;
  /** Shown at the top of the sheet, over the recipe's name. */
  banner?: ReactNode;
  /** The screen's main action, pinned to the bottom. */
  footer: ReactNode;
}

/**
 * A recipe as the detail screen shows it: the reel on top (playable), a white sheet rising over it
 * with the name and the key facts, who made the video, then ingredients / steps / tips as tabs.
 * It leaves out what needs the rest of the app (saving, the assistant, cook mode), so it can be
 * shown before the app is open: onboarding's demo shows the recipe a sample video became with it.
 */
export function RecipePreview({ entry, player, banner, footer }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>('ingredients');
  const [servings, setServings] = useState<number | null>(null);
  const { recipe, source } = entry;
  const baseServings = recipe.servings.amount ? Math.round(recipe.servings.amount) : null;
  const people = servings ?? baseServings;
  const factor = baseServings && people ? people / baseServings : 1;
  const hasNotes = recipe.tips.length + recipe.missing_information.length + recipe.equipment.length > 0;
  const hasSteps = recipe.steps.length > 0;
  const creator = source ? source.ownerFullName || source.ownerUsername : '';

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={{ height: HERO_HEIGHT + insets.top, backgroundColor: colors.peach }}>
          <VideoHero
            shortcode={source?.shortcode}
            imageUrl={entry.imageUrl}
            instagramUrl={source?.url}
            bottomInset={OVERLAP}
            player={player}
            style={StyleSheet.absoluteFill}
          />
        </View>

        <Animated.View entering={FadeInDown.duration(280)} style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {banner}
          <View style={styles.titleBlock}>
            <Text variant="overline" color="accentText">
              {upperTr(categoryLabel(recipe.category))}
            </Text>
            <Text variant="display" accessibilityRole="header">
              {recipe.title}
            </Text>
            {recipe.description ? (
              <Text variant="body" color="textSecondary">
                {recipe.description}
              </Text>
            ) : null}
          </View>

          <MetaLine recipe={recipe} />

          {source ? (
            <ListGroup>
              <ListRow
                first
                leading={<Avatar name={creator} uri={source.ownerAvatarUrl} size={38} />}
                title={creator}
                subtitle={`@${source.ownerUsername}${source.ownerVerified ? ' · Onaylı hesap' : ''}`}
              />
            </ListGroup>
          ) : null}

          <SegmentedControl
            label="Tarif bölümü"
            segments={[
              { value: 'ingredients' as Tab, label: 'Malzemeler' },
              ...(hasSteps ? [{ value: 'steps' as Tab, label: 'Yapılışı' }] : []),
              ...(hasNotes ? [{ value: 'notes' as Tab, label: 'İpuçları' }] : []),
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'ingredients' && (
            <View style={styles.tab}>
              {people != null && (
                <View style={[styles.servings, { borderColor: colors.border }]}>
                  <View style={styles.flex}>
                    <Text variant="headline">Kaç kişilik?</Text>
                    <Text variant="footnote" color="textSecondary">
                      {ingredientCount(recipe)} malzeme
                    </Text>
                  </View>
                  <ServingsStepper value={people} onChange={setServings} />
                </View>
              )}
              <IngredientChecklist groups={recipe.ingredient_groups} factor={factor} />
            </View>
          )}
          {tab === 'steps' && (
            <View style={styles.tab}>
              <Text variant="footnote" color="textSecondary">
                {recipe.steps.length} adım
              </Text>
              <StepList recipe={recipe} />
            </View>
          )}
          {tab === 'notes' && <NotesCard recipe={recipe} />}
        </Animated.View>
      </ScrollView>

      <StickyFooter>{footer}</StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingBottom: 28 },
  sheet: {
    marginTop: -OVERLAP,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: ScreenPadding,
    paddingTop: 26,
    gap: 22,
  },
  titleBlock: { gap: 8 },
  tab: { gap: 16 },
  servings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
