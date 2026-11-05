import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, FadeInUp, LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AgentComposer } from '@/components/agent/agent-composer';
import { AnswerText } from '@/components/agent/answer-text';
import { CapabilityGrid, CapabilityStrip } from '@/components/agent/capability-tiles';
import { GuideCard } from '@/components/agent/guide-card';
import { ResultBlock } from '@/components/agent/result-blocks';
import { WorkLog } from '@/components/agent/work-log';
import { useKeyboardVisible } from '@/components/assistant/use-keyboard-visible';
import { Button } from '@/components/ui/button';
import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { StickyFooter } from '@/components/ui/layout';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { openScreen, useAgentChat } from '@/hooks/use-agent-chat';
import { useDictation, useDictationRecorder, type DictationRecorder } from '@/hooks/use-dictation';
import { useTheme } from '@/hooks/use-theme';
import { MORE_EXAMPLES, type GuideKind } from '@/lib/agent/capabilities';
import { assistantStarters } from '@/lib/agent/starters';
import type { AgentAction, AssistantTurn, UserTurn } from '@/lib/agent/types';
import { pantryItems, usePantry } from '@/lib/kitchen';

const ACTION_LABELS: Record<AgentAction['screen'], string> = {
  recipe: 'Tarifi aç',
  cook: 'Pişirmeye başla',
  creator: 'Hesabı aç',
  pantry: 'Dolabımı aç',
  shopping: 'Alışveriş listesini aç',
  chef: 'AI Şef’e tarif yazdır',
  my_recipes: 'Tariflerimi aç',
  journal: 'Pişirdiklerimi aç',
  voice_recipe: 'Sesle tarif anlat',
  add: 'Tarif ekle',
  inbox: 'Bildirimleri aç',
  settings: 'Profili aç',
  search: 'Aramayı aç',
};

function UserMessage({ turn }: { turn: UserTurn }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInUp.duration(200)} style={styles.userRow}>
      <View style={[styles.userBubble, { backgroundColor: colors.ink }]} accessible accessibilityLabel={`Sen: ${turn.text}`}>
        {turn.voice ? <Icon name="mic" size={13} color={colors.onInk} style={styles.voiceMark} /> : null}
        <Text variant="body" tint={colors.onInk} style={styles.shrink}>
          {turn.text}
        </Text>
      </View>
    </Animated.View>
  );
}

function AssistantMessage({ turn, latest, onRetry, onAsk }: { turn: AssistantTurn; latest: boolean; onRetry: () => void; onAsk: (q: string) => void }) {
  const { colors } = useTheme();
  const searchedNothing = !turn.streaming && !turn.error && turn.steps.length > 0 && turn.blocks.length === 0;
  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.assistantRow}>
      <ChefAvatar size={30} style={styles.avatar} />
      <View style={styles.assistantCol}>
        <WorkLog steps={turn.steps} status={turn.status} streaming={turn.streaming} answering={turn.text.length > 0 || turn.blocks.length > 0} ms={turn.ms} />
        {turn.text ? <AnswerText text={turn.text} /> : null}
        {turn.blocks.map((b) => (
          <ResultBlock key={b.id} block={b} />
        ))}
        {turn.action && !turn.streaming ? (
          <Chip label={ACTION_LABELS[turn.action.screen]} icon="open-outline" kind="button" onPress={() => openScreen(turn.action!)} style={styles.chip} />
        ) : null}
        {latest && searchedNothing && !turn.action ? (
          <Chip label="AI Şef’e tarif yaptır" icon="sparkles-outline" kind="button" onPress={() => router.push('/chef')} style={styles.chip} />
        ) : null}
        {latest && !turn.streaming && turn.suggestions?.length ? (
          <View style={styles.suggestions}>
            {turn.suggestions.map((q) => (
              <Chip key={q} label={q} icon="arrow-forward" kind="button" tone="sunken" size="sm" onPress={() => onAsk(q)} />
            ))}
          </View>
        ) : null}
        {turn.error ? (
          <View style={[styles.error, { backgroundColor: colors.dangerSoft }]}>
            <Text variant="callout" color="danger">
              {turn.error.message}
            </Text>
            {latest ? <Button title="Tekrar dene" variant="secondary" size="md" icon="refresh" onPress={onRetry} style={styles.retry} /> : null}
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function Intro({ onPick, onAsk, disabled }: { onPick: (kind: GuideKind) => void; onAsk: (q: string) => void; disabled: boolean }) {
  const pantryCount = pantryItems(usePantry().data).length;
  const examples = [...assistantStarters({ pantryCount }).slice(0, 2), ...MORE_EXAMPLES.slice(0, 3)];
  return (
    <View style={styles.intro}>
      <View style={styles.introHead}>
        <ChefAvatar size={48} ring />
        <View style={styles.flex}>
          <Text variant="title2">Ne pişirelim?</Text>
          <Text variant="subhead" color="textSecondary">
            Bir iş seç ya da aşağıya yaz, söyle.
          </Text>
        </View>
      </View>
      <CapabilityGrid onPick={onPick} />
      <Text variant="overline" color="textTertiary">
        ŞÖYLE DE SORABİLİRSİN
      </Text>
      <View style={styles.starters}>
        {examples.map((q) => (
          <Chip key={q} label={q} kind="button" tone="sunken" size="sm" onPress={() => onAsk(q)} disabled={disabled} />
        ))}
      </View>
    </View>
  );
}

/** Renders the recorder hook for tap-to-talk where the OS has no speech recognizer. */
function RecorderBridge({ attach }: { attach: (r: DictationRecorder | null) => void }) {
  useDictationRecorder(attach);
  return null;
}

/**
 * AI Şef: ask by typing or by voice. It finds recipes ("içinde bulgur olanlar", "Refika'nın
 * tarifleri"), runs the kitchen (pantry, shopping list), saves, adapts and writes recipes, plans
 * menus, and opens screens. Params: q (ask at once), voice=1 (start listening), focus=1 (keyboard).
 */
export default function AgentScreen() {
  const params = useLocalSearchParams<{ voice?: string; q?: string; focus?: string; guide?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardVisible();
  const { turns, busy, send, retry, stop, clear, guide, dismissGuide } = useAgentChat();
  const pantryCount = pantryItems(usePantry().data).length;
  const [tools, setTools] = useState(false);
  const [input, setInput] = useState('');
  const [partial, setPartial] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  const atEnd = useRef(true);
  const laidOut = useRef(false);

  const dictation = useDictation({
    onPartial: setPartial,
    onFinal: (text) => {
      setPartial('');
      setInput('');
      send(text, { voice: true });
    },
  });

  const ask = useCallback(
    (q: string) => {
      atEnd.current = true;
      setInput('');
      send(q);
    },
    [send],
  );

  /** A capability tile: the pantry asks at once when it has something, the rest open a question card. */
  const pick = useCallback(
    (kind: GuideKind) => {
      atEnd.current = true;
      setTools(false);
      if (kind === 'pantry' && pantryCount > 0) ask('Dolabımla ne pişirebilirim?');
      else guide(kind);
    },
    [ask, guide, pantryCount],
  );

  // Opened from Home or Search with a question, a tile, the ask box or the mic: that starts a new
  // conversation. Without them ("Sohbete dön") the last one goes on.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const { q, guide: kind, voice, focus } = params;
    if (q || kind || voice === '1' || focus === '1') clear();
    if (q) setTimeout(() => ask(q), 0);
    else if (kind) setTimeout(() => pick(kind as GuideKind), 0);
    else if (voice === '1' && dictation.mode !== 'none') setTimeout(dictation.start, 350);
  }, [params, ask, pick, clear, dictation]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    atEnd.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 120;
  };

  const startVoice = () => {
    if (busy) stop();
    setPartial('');
    dictation.start();
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={[styles.screen, { backgroundColor: colors.surface }]}>
      {dictation.mode === 'record' ? <RecorderBridge attach={dictation.attachRecorder} /> : null}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <ScreenHeader
          title="AI Şef"
          tone="muted"
          right={turns.length > 0 ? <IconButton icon="create-outline" label="Yeni sohbet" tone="muted" onPress={clear} /> : undefined}
        />
      </View>

      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.body}
        onScroll={onScroll}
        scrollEventThrottle={64}
        onContentSizeChange={() => {
          // Coming back to a conversation: start at its end, without an animation.
          if (atEnd.current) scroll.current?.scrollToEnd({ animated: laidOut.current });
          laidOut.current = true;
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}>
        {turns.length === 0 ? <Intro onPick={pick} onAsk={ask} disabled={busy} /> : null}
        {/* Messages already there when the screen opens appear at once; new ones fade in. */}
        <LayoutAnimationConfig skipEntering>
          {turns.map((t, i) =>
            t.role === 'user' ? (
              <UserMessage key={t.id} turn={t} />
            ) : t.role === 'guide' ? (
              <GuideCard key={t.id} kind={t.kind} onAsk={ask} onClose={dismissGuide} />
            ) : (
              <AssistantMessage key={t.id} turn={t} latest={i === turns.length - 1} onRetry={retry} onAsk={ask} />
            ),
          )}
        </LayoutAnimationConfig>
      </ScrollView>

      <StickyFooter style={[styles.footer, { paddingBottom: (keyboardUp ? 0 : insets.bottom) + 10 }]}>
        {tools && turns.length > 0 ? <CapabilityStrip onPick={pick} /> : null}
        <View style={styles.composerRow}>
          {turns.length > 0 && dictation.phase === 'idle' ? (
            <IconButton
              icon={tools ? 'close' : 'apps-outline'}
              label={tools ? 'Kısayolları kapat' : 'Neler yapabilirim'}
              tone="muted"
              size={44}
              onPress={() => setTools((v) => !v)}
            />
          ) : null}
          <View style={styles.flex}>
            <AgentComposer
              value={input}
              onChangeText={setInput}
              onSend={() => ask(input)}
              busy={busy}
              onStop={stop}
              voice={{ ...dictation, start: startVoice, partial }}
              autoFocus={params.focus === '1' && !params.q && !params.guide}
            />
          </View>
        </View>
      </StickyFooter>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth },
  body: { paddingHorizontal: ScreenPadding, paddingTop: 16, paddingBottom: 24, gap: 18 },
  intro: { gap: 14 },
  introHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  starters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingLeft: 56 },
  userBubble: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.lg, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10, flexShrink: 1 },
  voiceMark: { opacity: 0.7 },
  shrink: { flexShrink: 1 },
  assistantRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatar: { marginTop: 0 },
  assistantCol: { flex: 1, gap: 10, paddingTop: 4 },
  chip: { alignSelf: 'flex-start' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { borderRadius: Radius.md, padding: 12, gap: 10 },
  retry: { alignSelf: 'flex-start' },
  footer: { paddingTop: 10, gap: 10 },
});
