import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { Fonts } from '@/constants/theme';
import type { DictationMode, DictationPhase } from '@/hooks/use-dictation';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  /** The assistant is answering: send turns into stop. */
  busy: boolean;
  onStop: () => void;
  voice: { mode: DictationMode; phase: DictationPhase; level: number; partial: string; start: () => void; stop: () => void; cancel: () => void };
  autoFocus?: boolean;
}

/** A little longer than the stack's push animation. */
const FOCUS_DELAY_MS = 420;

/** A ring that swells with the voice level. */
function LevelRing({ level }: { level: number }) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(1 + level * 0.55, { damping: 14, stiffness: 220 }) }] }));
  return <Animated.View pointerEvents="none" style={[styles.ring, { backgroundColor: colors.accentSoft }, style]} />;
}

/**
 * The message bar. Typing: a pill that grows to a few lines at most, a mic and a send button.
 * Talking: the same height, showing the words as they are heard, with cancel and done.
 */
export function AgentComposer({ value, onChangeText, onSend, busy, onStop, voice, autoFocus }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInputInstance>(null);
  const listening = voice.phase !== 'idle';
  const canSend = value.trim().length > 0;

  useEffect(() => {
    if (listening) input.current?.blur();
  }, [listening]);

  // Focus once the screen has slid in: the keyboard rising during the push makes the layout jump.
  useEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => input.current?.focus(), FOCUS_DELAY_MS);
    return () => clearTimeout(t);
  }, [autoFocus]);

  if (listening) {
    const transcribing = voice.phase === 'transcribing';
    return (
      <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)} style={[styles.box, styles.voiceBox, { backgroundColor: colors.surfaceMuted, borderColor: colors.accent }]}>
        <IconButton icon="close" label="Vazgeç" tone="surface" size={40} onPress={voice.cancel} />
        <View style={styles.heard} accessibilityLiveRegion="polite">
          <Text variant="callout" color={voice.partial ? 'text' : 'textTertiary'} numberOfLines={2}>
            {transcribing ? 'Yazıya çeviriyorum…' : voice.partial || 'Dinliyorum… ne aradığını söyle'}
          </Text>
        </View>
        <View style={styles.micWrap}>
          {!transcribing && <LevelRing level={voice.level} />}
          {transcribing ? (
            <ActivityIndicator color={colors.accent} style={styles.busy} />
          ) : (
            <IconButton icon="checkmark" label="Bitti, gönder" tone="accent" size={40} onPress={voice.stop} />
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.box, { backgroundColor: colors.surfaceMuted, borderColor: focused ? colors.text : colors.surfaceMuted }]}>
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Tarif, malzeme ya da hesap sor…"
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        multiline
        maxLength={800}
        submitBehavior="submit"
        returnKeyType="send"
        onSubmitEditing={() => canSend && !busy && onSend()}
        // Web: Enter sends, Shift+Enter starts a new line.
        onKeyPress={
          Platform.OS === 'web'
            ? (e) => {
                const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean; preventDefault?: () => void };
                if (ev.key === 'Enter' && !ev.shiftKey) {
                  (e as unknown as { preventDefault: () => void }).preventDefault();
                  if (canSend && !busy) onSend();
                }
              }
            : undefined
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, { color: colors.text }]}
        accessibilityLabel="AI Şef’e mesaj"
      />
      {busy ? (
        <IconButton icon="stop" label="Durdur" tone="muted" size={40} onPress={onStop} style={{ backgroundColor: colors.surface }} />
      ) : canSend || voice.mode === 'none' ? (
        <IconButton icon="arrow-up" label="Gönder" tone="accent" size={40} disabled={!canSend} onPress={onSend} />
      ) : (
        <IconButton icon="mic" label="Sesle sor" tone="accent" size={40} onPress={voice.start} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    paddingLeft: 18,
    paddingRight: 4,
    paddingVertical: 4,
  },
  voiceBox: { alignItems: 'center', paddingLeft: 4 },
  // At most ~4 lines: the bar never takes over the screen.
  input: { flex: 1, minHeight: 40, maxHeight: 104, fontFamily: Fonts.regular, fontSize: 16, lineHeight: 21, paddingTop: 10, paddingBottom: 10, outlineWidth: 0 },
  heard: { flex: 1, justifyContent: 'center', minHeight: 40 },
  micWrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 40, height: 40, borderRadius: 20 },
  busy: { width: 40, height: 40 },
});
