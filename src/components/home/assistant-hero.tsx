import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, Radius } from '@/constants/theme';
import { useAgentTurns } from '@/hooks/use-agent-chat';
import { ASK_EXAMPLES, assistantStarters } from '@/lib/agent/starters';
import { pantryItems, usePantry } from '@/lib/kitchen';

// The same warm colors in both themes, like the other Home strips: espresso into the app's orange.
const GRADIENT = ['#2A1B16', '#5A2C1E', '#B4471F'] as const;
const INK = '#FFFFFF';
const SOFT = 'rgba(255,244,236,0.82)';
const GLASS = 'rgba(255,255,255,0.12)';
const GLASS_EDGE = 'rgba(255,244,236,0.28)';
const BOX_TEXT = '#1D1B18';
const BOX_HINT = '#8F8781';
const ACCENT = '#D65C30';
/** How long each example stays in the ask box. */
const EXAMPLE_MS = 3200;

/**
 * Home's main card: the AI chef assistant. Type or say anything the app can do ("içinde bulgur
 * olanlar", "dolabıma yumurta ekle", "bu haftaya menü"); a send, a quick question or the mic opens
 * the chat with it. When a conversation is going, "Sohbete dön" goes back to it.
 */
export function AssistantHero() {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [example, setExample] = useState(0);
  const pantryCount = pantryItems(usePantry().data).length;
  const starters = assistantStarters({ pantryCount }).slice(0, 4);
  const talking = useAgentTurns().length > 0;

  // The placeholder turns through examples while the box is empty and idle.
  useEffect(() => {
    if (focused || text) return;
    const t = setInterval(() => setExample((i) => (i + 1) % ASK_EXAMPLES.length), EXAMPLE_MS);
    return () => clearInterval(t);
  }, [focused, text]);

  const ask = (q: string) => {
    const content = q.trim();
    if (!content) return;
    setText('');
    router.push({ pathname: '/agent', params: { q: content } });
  };

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.card}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.top}>
        <ChefAvatar size={44} ring />
        <Pressable onPress={() => router.push({ pathname: '/agent', params: { focus: '1' } })} accessibilityRole="button" accessibilityLabel="AI Şef sohbetini aç" style={styles.titles}>
          <Text variant="overline" tint={SOFT}>
            AI ŞEF ASİSTANI
          </Text>
          <Text variant="title2" tint={INK}>
            Sor, ben halledeyim
          </Text>
        </Pressable>
        {talking ? (
          <Pressable
            onPress={() => router.push('/agent')}
            accessibilityRole="button"
            accessibilityLabel="Sohbete dön"
            hitSlop={8}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
            <Icon name="chatbubble-ellipses-outline" size={14} color={INK} />
            <Text variant="caption" tint={INK}>
              Sohbete dön
            </Text>
          </Pressable>
        ) : null}
      </View>
      <Text variant="footnote" tint={SOFT} style={styles.desc}>
        Tarif bulur, dolabını ve alışveriş listeni düzenler, menü hazırlar, tarifleri uyarlar.
      </Text>

      <View style={styles.box}>
        <Icon name="sparkles" size={18} color={ACCENT} />
        <TextInput
          value={text}
          onChangeText={setText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={() => ask(text)}
          returnKeyType="send"
          submitBehavior="blurAndSubmit"
          placeholder={ASK_EXAMPLES[example]}
          placeholderTextColor={BOX_HINT}
          selectionColor={ACCENT}
          maxLength={800}
          style={styles.input}
          accessibilityLabel="AI Şef’e sor"
        />
        <Pressable
          onPress={() => (text.trim() ? ask(text) : router.push({ pathname: '/agent', params: { voice: '1' } }))}
          accessibilityRole="button"
          accessibilityLabel={text.trim() ? 'Gönder' : 'Sesle sor'}
          hitSlop={6}
          style={({ pressed }) => [styles.go, pressed && styles.pressed]}>
          <Icon name={text.trim() ? 'arrow-up' : 'mic'} size={20} color={INK} />
        </Pressable>
      </View>

      <View style={styles.quick}>
        {starters.map((q) => (
          <Pressable key={q} onPress={() => ask(q)} accessibilityRole="button" style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
            <Text variant="caption" tint={INK} numberOfLines={1}>
              {q}
            </Text>
          </Pressable>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    padding: 16,
    gap: 12,
    boxShadow: '0 10px 24px rgba(180,71,31,0.28)',
  },
  // A soft light in the top right corner.
  glow: { position: 'absolute', top: -70, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,154,77,0.28)' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, gap: 2 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: GLASS, borderWidth: StyleSheet.hairlineWidth, borderColor: GLASS_EDGE },
  desc: { marginTop: -4 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
  },
  input: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, color: BOX_TEXT, paddingVertical: 12, outlineWidth: 0 },
  go: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 32, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 16, backgroundColor: GLASS, borderWidth: StyleSheet.hairlineWidth, borderColor: GLASS_EDGE, maxWidth: '100%' },
  pressed: { opacity: 0.75 },
});
