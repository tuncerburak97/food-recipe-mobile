import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AiLoader } from '@/components/add/ai-loader';
import { LinkGuide } from '@/components/add/link-guide';
import { RecipePreview } from '@/components/add/recipe-preview';
import { ReelPreview, ReelPreviewLoading } from '@/components/add/reel-preview';
import { StepIndicator } from '@/components/add/step-indicator';
import { ShareGuide } from '@/components/share-guide/share-guide';
import { useShareGuideOnce } from '@/components/share-guide/use-share-guide';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { StickyFooter } from '@/components/ui/layout';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, describeError } from '@/lib/api';
import { extractInstagramLink } from '@/lib/instagram';
import { takePendingShare } from '@/store/pending-share';
import { useSaveRecipe } from '@/lib/queries';
import type { RecipeOutput, Reel } from '@/lib/types';

type Phase = 'link' | 'reel' | 'recipe';
type Status = 'loading' | 'ready' | 'error';
const PHASES: Phase[] = ['link', 'reel', 'recipe'];
const STEP_LABELS = ['Link', 'Video', 'Tarif'];

/**
 * Add a recipe from an Instagram video in three steps:
 *   1. link   – paste the link (or arrive with ?url= from the share sheet / a deep link)
 *   2. reel   – API 1 (POST /reels/fetch) shows the video that was found
 *   3. recipe – API 2 (POST /reels/fetch-recipe) turns its description into a recipe, then save
 */
export default function AddRecipeScreen() {
  const { url, paste, shared } = useLocalSearchParams<{ url?: string; paste?: string; shared?: string }>();
  // A new share while this screen is open starts the flow again with the new link.
  return <AddRecipeFlow key={url ?? ''} initialUrl={url} pasteOnOpen={paste === '1' && !url} fromShare={shared === '1'} />;
}

/** Wait before the share guide slides over a shared link, so the user first sees the video found (ms). */
const SHARE_GUIDE_DELAY = 1800;

function AddRecipeFlow({ initialUrl: sharedUrl, pasteOnOpen, fromShare }: { initialUrl?: string; pasteOnOpen?: boolean; fromShare?: boolean }) {
  const { colors } = useTheme();
  const saveRecipe = useSaveRecipe();
  // Came in through Instagram's share menu ("Diğer" → this app): show once how to keep the app first there.
  const guide = useShareGuideOnce('shared');
  const { offer } = guide;
  useEffect(() => {
    if (!fromShare) return;
    const t = setTimeout(() => offer(), SHARE_GUIDE_DELAY);
    return () => clearTimeout(t);
  }, [fromShare, offer]);

  const initialLink = sharedUrl ? extractInstagramLink(sharedUrl) : null;
  const [phase, setPhase] = useState<Phase>(initialLink ? 'reel' : 'link');
  const [input, setInput] = useState(sharedUrl ?? '');
  // The typed link is checked once the user leaves the field or submits it, not on every letter.
  const [checked, setChecked] = useState(!!sharedUrl);
  const [reel, setReel] = useState<Reel | null>(null);
  const [reelStatus, setReelStatus] = useState<Status>('loading');
  const [output, setOutput] = useState<RecipeOutput | null>(null);
  const [recipeStatus, setRecipeStatus] = useState<Status>('loading');
  const [error, setError] = useState<unknown>(null);
  const [pasteHint, setPasteHint] = useState(false);
  const started = useRef(false);

  const link = extractInstagramLink(input);

  const loadReel = (u: string) => {
    setPhase('reel');
    setReelStatus('loading');
    setError(null);
    requestReel(u);
  };

  const requestReel = async (u: string) => {
    try {
      setReel(await api.fetchReel(u));
      setReelStatus('ready');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e);
      setReelStatus('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const loadRecipe = async (refresh = false) => {
    if (!reel) return;
    setPhase('recipe');
    setRecipeStatus('loading');
    setError(null);
    try {
      const data = await api.fetchRecipe(reel.shortcode, refresh);
      setOutput(data.recipe ?? null);
      setRecipeStatus('ready');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(e);
      setRecipeStatus('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // Opened with a link (share sheet / deep link): start on step 2 and fetch right away.
  useEffect(() => {
    if (started.current || !initialLink) return;
    started.current = true;
    takePendingShare(); // handled here, so it is not opened again later
    requestReel(initialLink);
  });

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    const found = extractInstagramLink(text);
    if (found) {
      setInput(found);
      setPasteHint(false);
      loadReel(found);
    } else {
      setPasteHint(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  // Opened from Home's "Yapıştır": paste the copied link once.
  const pasted = useRef(false);
  useEffect(() => {
    if (!pasteOnOpen || pasted.current) return;
    pasted.current = true;
    paste().catch(() => setPasteHint(true));
  });

  const save = () => {
    if (!reel) return;
    saveRecipe.mutate(reel.shortcode, {
      onSuccess: (entry) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace(`/recipe/${entry.id}`);
      },
      onError: (e) => {
        const { title, message } = describeError(e);
        Alert.alert(title, message);
      },
    });
  };

  const restart = () => {
    setPhase('link');
    setReel(null);
    setOutput(null);
    setError(null);
  };

  const stepIndex = PHASES.indexOf(phase);
  const stepDone = (phase === 'reel' && reelStatus === 'ready') || (phase === 'recipe' && recipeStatus === 'ready');
  const err = describeError(error);
  const fieldError = checked && input.trim().length > 0 && !link ? 'Bu bir Instagram video linki değil. Örnek: instagram.com/reel/…' : null;

  let body: React.ReactNode;
  let footer: React.ReactNode = null;

  if (phase === 'link') {
    body = (
      <View style={styles.linkStep}>
        <View style={styles.intro}>
          <Text variant="title2" accessibilityRole="header">
            Videonun linkini ekle
          </Text>
          <Text variant="callout" color="textSecondary">
            Instagram’da beğendiğin yemek videosunun linkini kopyala, sonra aşağıdaki butona dokun.
          </Text>
        </View>

        <View style={styles.paste}>
          <Button title="Linki yapıştır" icon="clipboard-outline" onPress={paste} />
          {pasteHint ? (
            <View style={styles.pasteHint} accessibilityLiveRegion="polite">
              <Icon name="alert-circle-outline" size={16} color={colors.danger} style={styles.hintIcon} />
              <Text variant="subhead" color="danger" style={styles.flex}>
                Kopyaladığın şey bir Instagram linki değil. Önce videonun linkini kopyala.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.orRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text variant="subhead" color="textTertiary">
            ya da
          </Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>

        <View style={styles.typed}>
          <TextField
            label="Linki kendin yaz"
            value={input}
            onChangeText={(v) => {
              setInput(v);
              setChecked(false);
            }}
            onBlur={() => setChecked(true)}
            placeholder="instagram.com/reel/..."
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            textContentType="URL"
            returnKeyType="go"
            onSubmitEditing={() => (link ? loadReel(link) : setChecked(true))}
            error={fieldError}
          />
          {input.length > 0 && link ? <Button title="Bu linkle devam et" variant="dark" trailingIcon="arrow-forward" onPress={() => loadReel(link)} /> : null}
        </View>

        <LinkGuide />
      </View>
    );
  } else if (phase === 'reel') {
    if (reelStatus === 'loading') body = <ReelPreviewLoading />;
    else if (reelStatus === 'error') {
      body = <EmptyState icon="cloud-offline-outline" tone="danger" title={err.title} message={err.message} />;
      footer = (
        <>
          <Button title="Tekrar dene" icon="refresh" onPress={() => (link || initialLink) && loadReel((link || initialLink)!)} />
          <Button title="Başka link dene" variant="ghost" size="md" onPress={restart} />
        </>
      );
    } else if (reel) {
      body = <ReelPreview reel={reel} />;
      footer = (
        <>
          <Text variant="footnote" color="textSecondary" align="center" numberOfLines={2}>
            Tarif, videoda anlatılanlardan ve açıklamasından hazırlanır.
          </Text>
          <Button title="Tarifi hazırla" trailingIcon="arrow-forward" onPress={() => loadRecipe()} />
          <Button title="Başka link dene" variant="ghost" size="md" onPress={restart} />
        </>
      );
    }
  } else {
    if (recipeStatus === 'loading') body = <AiLoader />;
    else if (recipeStatus === 'error') {
      body = <EmptyState icon="alert-circle-outline" tone="danger" title={err.title} message={err.message} />;
      footer = (
        <>
          <Button title="Tekrar dene" icon="refresh" onPress={() => loadRecipe()} />
          <Button title="Videoya dön" variant="ghost" size="md" onPress={() => setPhase('reel')} />
        </>
      );
    } else if (output && !output.recipe.is_recipe) {
      body = (
        <EmptyState
          icon="restaurant-outline"
          tone="warning"
          title="Bu videoda tarif yok"
          message="Videonun açıklamasında malzeme ya da yapılış bulunamadı. Tarifi açıklamaya yazılmış bir video dene."
        />
      );
      footer = <Button title="Başka link dene" onPress={restart} />;
    } else if (output) {
      body = <RecipePreview recipe={output.recipe} imageUrl={reel?.video?.thumbnail_url} />;
      footer = (
        <>
          <Button title="Tariflerime kaydet" icon="bookmark-outline" loading={saveRecipe.isPending} onPress={save} />
          <Button title="Tekrar hazırla" variant="ghost" size="md" disabled={saveRecipe.isPending} onPress={() => loadRecipe(true)} />
        </>
      );
    }
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ShareGuide visible={guide.visible} onClose={guide.close} context="shared" />
      <ScreenHeader leading="close" title="Videodan tarif" tone="muted" safeTop={Platform.OS !== 'ios'} />
      <View style={[styles.steps, { borderBottomColor: colors.border }]}>
        <StepIndicator steps={STEP_LABELS} current={stepIndex} currentDone={stepDone} />
      </View>

      <ScrollView
        style={styles.flex}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}>
        <Animated.View key={`${phase}-${phase === 'reel' ? reelStatus : recipeStatus}`} entering={FadeInDown.duration(260)}>
          {body}
        </Animated.View>
      </ScrollView>

      {footer ? <StickyFooter>{footer}</StickyFooter> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  steps: { paddingHorizontal: ScreenPadding, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  body: { paddingHorizontal: ScreenPadding, paddingTop: 24, paddingBottom: 40 },
  linkStep: { gap: 24 },
  intro: { gap: 6 },
  paste: { gap: 10 },
  pasteHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  hintIcon: { marginTop: 1 },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  typed: { gap: 12 },
});
