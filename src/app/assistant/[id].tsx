import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AVATAR_INDENT, ChatBubble } from '@/components/assistant/chat-bubble';
import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Composer } from '@/components/assistant/composer';
import { ProposalCard } from '@/components/assistant/proposal-card';
import { StarterQuestions, SuggestionChips } from '@/components/assistant/suggestion-chips';
import { TypingIndicator } from '@/components/assistant/typing-indicator';
import { useKeyboardVisible } from '@/components/assistant/use-keyboard-visible';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/empty-state';
import { StickyFooter } from '@/components/ui/layout';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, describeError } from '@/lib/api';
import { capitalize } from '@/lib/format';
import { useRecipe, useSaveCustomRecipe } from '@/lib/queries';
import type { ChatTurn, Recipe } from '@/lib/types';
import { chatId, useAssistantChat, type ChatItem } from '@/store/assistant-chats';

/** Questions people ask whoever gave them a recipe, filled in for this recipe. */
function starterQuestions(recipe: Recipe): string[] {
  const main = recipe.ingredient_groups.flatMap((g) => g.ingredients).find((i) => i.quantity != null && !i.optional);
  const servings = recipe.servings.amount ? Math.round(recipe.servings.amount) : null;
  const usesOven = recipe.equipment.some((e) => e.toLocaleLowerCase('tr-TR').includes('fırın')) || recipe.steps.some((s) => s.temperature_c != null);
  return [
    main ? `${capitalize(main.name)} yoksa yerine ne kullanabilirim?` : 'Bir malzeme eksikse ne yapayım?',
    `${servings === 2 ? 4 : 2} kişilik yapacağım, oranlar nasıl olsun?`,
    usesOven ? 'Fırın yoksa nasıl yaparım?' : 'Önceden hazırlayabilir miyim?',
    'Pişip pişmediğini nasıl anlarım?',
    'Artanı nasıl saklarım?',
  ];
}

// iOS modals already sit below the status bar; on Android the modal is a full screen.
const SAFE_TOP = Platform.OS !== 'ios';

/** Yemek Asistanı: chat about one recipe; can apply a personalised version to the user's book. */
export default function AssistantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const recipeQuery = useRecipe(id);
  const entry = recipeQuery.data;
  const saveCustom = useSaveCustomRecipe();
  const [items, setItems] = useAssistantChat(id);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const keyboardUp = useKeyboardVisible();

  if (!entry) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.surface }]}>
        <ScreenHeader leading="close" title="AI Şef" tone="muted" safeTop={SAFE_TOP} />
        {recipeQuery.isError ? (
          <ErrorState
            title="Tarif açılamadı"
            message="Bağlantını kontrol edip tekrar dene."
            onRetry={() => recipeQuery.refetch()}
            retrying={recipeQuery.isFetching}
          />
        ) : (
          <LoadingState label="Tarif yükleniyor" />
        )}
      </View>
    );
  }
  const recipe = entry.recipe;
  const lastAnswer = [...items].reverse().find((m) => m.role === 'assistant' && !m.error);
  const followUps = !busy && lastAnswer ? (suggestionsByMessage.get(lastAnswer.id) ?? []) : [];

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    Haptics.selectionAsync();
    setInput('');
    const userItem: ChatItem = { id: chatId(), role: 'user', text: content };
    const history: ChatTurn[] = [...items.filter((m) => !m.error), userItem].map((m) => ({ role: m.role, content: m.text }));
    setItems((prev) => [...prev, userItem]);
    setBusy(true);
    try {
      const answer = await api.askAssistant(id, history);
      const item: ChatItem = {
        id: chatId(),
        role: 'assistant',
        text: answer.reply,
        offTopic: answer.off_topic,
        proposal: answer.proposal,
        proposalState: answer.proposal ? 'pending' : undefined,
      };
      suggestionsByMessage.set(item.id, answer.suggestions);
      setItems((prev) => [...prev, item]);
    } catch (e) {
      const { title, message } = describeError(e);
      setItems((prev) => [...prev, { id: chatId(), role: 'assistant', text: `${title}. ${message}`, error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const updateItem = (itemId: string, patch: Partial<ChatItem>) =>
    setItems((prev) => prev.map((m) => (m.id === itemId ? { ...m, ...patch } : m)));

  const apply = (item: ChatItem) => {
    if (!item.proposal) return;
    updateItem(item.id, { proposalState: 'applying' });
    saveCustom.mutate(
      { entryId: id, recipe: item.proposal.recipe, note: item.proposal.summary },
      {
        onSuccess: (saved) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          updateItem(item.id, { proposalState: 'applied', appliedEntryId: saved.id });
        },
        onError: (e) => {
          updateItem(item.id, { proposalState: 'pending' });
          Alert.alert(describeError(e).title, describeError(e).message);
        },
      },
    );
  };

  const retry = () => {
    const lastUser = [...items].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setItems((prev) => prev.filter((m) => !m.error && m.id !== lastUser.id));
    send(lastUser.text);
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ScreenHeader leading="close" title="AI Şef" subtitle={recipe.title} tone="muted" safeTop={SAFE_TOP} />
      </View>

      <ScrollView
        ref={scroll}
        style={styles.flex}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}>
        <View style={[styles.intro, { backgroundColor: colors.accentSoft }]}>
          <ChefAvatar size={76} ring />
          <View style={styles.introText}>
            <Text variant="overline" color="accent">
              AI ŞEF
            </Text>
            <Text variant="title2" align="center">
              Bu tarifte takıldığın her şeyi sor
            </Text>
            <Text variant="subhead" color="textSecondary" align="center">
              Eksik malzeme, porsiyon, süre, saklama… İstersen tarifi senin mutfağına göre uyarlarım.
            </Text>
          </View>
        </View>

        {items.length === 0 && <StarterQuestions items={starterQuestions(recipe)} onPick={send} disabled={busy} />}

        {items.map((m) => (
          <ChatBubble key={m.id} role={m.role} text={m.text} error={m.error}>
            {m.proposal && m.proposalState && (
              <ProposalCard
                proposal={m.proposal}
                state={m.proposalState}
                onApply={() => apply(m)}
                onDismiss={() => updateItem(m.id, { proposalState: 'dismissed' })}
                onOpen={m.appliedEntryId && m.appliedEntryId !== id ? () => router.replace(`/recipe/${m.appliedEntryId}`) : undefined}
              />
            )}
            {m.error && <Button title="Tekrar dene" variant="secondary" size="md" icon="refresh" onPress={retry} style={styles.retry} />}
          </ChatBubble>
        ))}

        {busy && <TypingIndicator />}

        {followUps.length > 0 && (
          <View style={styles.followUps}>
            <SuggestionChips items={followUps} onPick={send} />
          </View>
        )}
      </ScrollView>

      <StickyFooter style={[styles.footer, { paddingBottom: (keyboardUp ? 0 : insets.bottom) + 10 }]}>
        <Composer value={input} onChangeText={setInput} onSend={() => send(input)} disabled={busy} />
        <Text variant="caption" weight="400" color="textTertiary" align="center">
          Asistan sadece bu tarifle ilgili soruları yanıtlar. Yapay zeka hata yapabilir.
        </Text>
      </StickyFooter>
    </KeyboardAvoidingView>
  );
}

// Follow-up suggestions for each assistant message (kept outside the chat items to keep them small).
const suggestionsByMessage = new Map<string, string[]>();

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth },
  body: { paddingHorizontal: ScreenPadding, paddingTop: 20, paddingBottom: 20, gap: 16 },
  intro: { alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 22, borderRadius: Radius.xl },
  introText: { alignItems: 'center', gap: 6 },
  retry: { alignSelf: 'flex-start' },
  followUps: { paddingLeft: AVATAR_INDENT },
  footer: { paddingTop: 10 },
});
