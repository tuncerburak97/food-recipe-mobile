import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import Animated, { FadeIn, FadeInUp, LayoutAnimationConfig } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AgentComposer } from '@/components/agent/agent-composer';
import { AnswerText } from '@/components/agent/answer-text';
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
import type { AgentAction, AssistantTurn, UserTurn } from '@/lib/agent/types';

const STARTERS = [
  'Elimde pirinç ve soğan var, ne yapabilirim?',
  'Bulgur pilavı tarifi var mı?',
  '20 dakikada hazır bir kahvaltılık öner',
  'Dolabımdakilerle ne pişirebilirim?',
  'Tatlı tariflerini göster',
];

const ACTION_LABELS: Record<AgentAction['screen'], string> = {
  recipe: 'Tarifi aç',
  creator: 'Hesabı aç',
  pantry: 'Dolabımı aç',
  shopping: 'Alışveriş listesini aç',
  chef: 'AI Şef’i aç',
  my_recipes: 'Tariflerimi aç',
  journal: 'Pişirdiklerimi aç',
  voice_recipe: 'Sesle tarif anlat',
  add: 'Tarif ekle',
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

function AssistantMessage({ turn, latest, onRetry }: { turn: AssistantTurn; latest: boolean; onRetry: () => void }) {
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

function Intro({ onPick, disabled }: { onPick: (q: string) => void; disabled: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.intro}>
      <View style={[styles.introCard, { backgroundColor: colors.accentSoft }]}>
        <ChefAvatar size={68} ring />
        <Text variant="title2" align="center">
          Ne pişirelim?
        </Text>
        <Text variant="subhead" color="textSecondary" align="center">
          Elindekileri söyle, bir yemeğin ya da hesabın adını ver. Tarifleri bulup açarım.
        </Text>
      </View>
      <View style={styles.starters}>
        {STARTERS.map((q) => (
          <Chip key={q} label={q} kind="button" tone="sunken" onPress={() => onPick(q)} disabled={disabled} />
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
 * AI Şef: ask by typing or by voice ("bulgur pilavı var mı?", "elimde pirinç var", "Refika'nın
 * tarifleri"). It searches the app's recipes, shows them as cards and opens screens when asked.
 */
export default function AgentScreen() {
  const params = useLocalSearchParams<{ voice?: string; q?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardVisible();
  const { turns, busy, send, retry, stop, clear } = useAgentChat();
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

  // Opened from Home's mic or with a question.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const q = params.q;
    if (q) setTimeout(() => ask(q), 0);
    else if (params.voice === '1' && dictation.mode !== 'none') setTimeout(dictation.start, 350);
  }, [params.q, params.voice, ask, dictation]);

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
        {turns.length === 0 ? <Intro onPick={ask} disabled={busy} /> : null}
        {/* Messages already there when the screen opens appear at once; new ones fade in. */}
        <LayoutAnimationConfig skipEntering>
          {turns.map((t, i) =>
            t.role === 'user' ? (
              <UserMessage key={t.id} turn={t} />
            ) : (
              <AssistantMessage key={t.id} turn={t} latest={i === turns.length - 1} onRetry={retry} />
            ),
          )}
        </LayoutAnimationConfig>
      </ScrollView>

      <StickyFooter style={[styles.footer, { paddingBottom: (keyboardUp ? 0 : insets.bottom) + 10 }]}>
        <AgentComposer
          value={input}
          onChangeText={setInput}
          onSend={() => ask(input)}
          busy={busy}
          onStop={stop}
          voice={{ ...dictation, start: startVoice, partial }}
        />
      </StickyFooter>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  header: { borderBottomWidth: StyleSheet.hairlineWidth },
  body: { paddingHorizontal: ScreenPadding, paddingTop: 16, paddingBottom: 24, gap: 18 },
  intro: { gap: 16 },
  introCard: { alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 20, borderRadius: Radius.xl },
  starters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingLeft: 56 },
  userBubble: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.lg, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingVertical: 10, flexShrink: 1 },
  voiceMark: { opacity: 0.7 },
  shrink: { flexShrink: 1 },
  assistantRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avatar: { marginTop: 0 },
  assistantCol: { flex: 1, gap: 10, paddingTop: 4 },
  chip: { alignSelf: 'flex-start' },
  error: { borderRadius: Radius.md, padding: 12, gap: 10 },
  retry: { alignSelf: 'flex-start' },
  footer: { paddingTop: 10 },
});
