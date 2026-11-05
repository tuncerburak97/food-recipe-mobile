import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useAgentTurns } from '@/hooks/use-agent-chat';
import { HOME_CAPABILITIES } from '@/lib/agent/capabilities';
import { useAssistantExamples } from '@/hooks/use-assistant-examples';

// The same warm colors in both themes, like the other Home strips: espresso into the app's orange.
const GRADIENT = ['#2A1B16', '#5A2C1E', '#B4471F'] as const;
const INK = '#FFFFFF';
const SOFT = 'rgba(255,244,236,0.82)';
const GLASS = 'rgba(255,255,255,0.12)';
const GLASS_EDGE = 'rgba(255,244,236,0.28)';
const BOX_HINT = '#8F8781';
const ACCENT = '#D65C30';
/** How long each example stays in the ask box. */
const EXAMPLE_MS = 3200;

/**
 * Home's main card: the AI chef assistant. The ask box opens the chat with the keyboard up (typing
 * happens there, so the keyboard opens once); the mic opens it listening; a tile opens it with a
 * short question card for that job. Each of these starts a new conversation; "Sohbete dön" and the
 * title go back to the last one.
 */
export function AssistantHero() {
  const [tick, setTick] = useState(0);
  const talking = useAgentTurns().length > 0;
  // The box turns through one example per capability, with the app's data ("@hesap tariflerini getir").
  const examples = useAssistantExamples();
  const example = examples[tick % examples.length].text;

  useEffect(() => {
    const t = setInterval(() => setTick((i) => i + 1), EXAMPLE_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(280)} style={styles.card}>
      <LinearGradient colors={GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.top}>
        <ChefAvatar size={40} ring />
        <Pressable onPress={() => router.push('/agent')} accessibilityRole="button" accessibilityLabel="AI Şef sohbetini aç" style={styles.titles}>
          <Text variant="overline" tint={SOFT}>
            AI ŞEF
          </Text>
          <Text variant="title2" tint={INK} numberOfLines={1}>
            Ne pişirelim?
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

      <View style={styles.box}>
        <Pressable
          onPress={() => router.push({ pathname: '/agent', params: { focus: '1' } })}
          accessibilityRole="search"
          accessibilityLabel="AI Şef’e yaz"
          style={({ pressed }) => [styles.ask, pressed && styles.pressed]}>
          <Icon name="sparkles" size={18} color={ACCENT} />
          <Animated.View key={example} entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={styles.flex}>
            <Text variant="body" tint={BOX_HINT} numberOfLines={1}>
              {example}…
            </Text>
          </Animated.View>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/agent', params: { voice: '1' } })}
          accessibilityRole="button"
          accessibilityLabel="Sesle sor"
          hitSlop={6}
          style={({ pressed }) => [styles.go, pressed && styles.pressed]}>
          <Icon name="mic" size={20} color={INK} />
        </Pressable>
      </View>

      <View style={styles.tiles}>
        {HOME_CAPABILITIES.map((c) => (
          <Pressable
            key={c.kind}
            onPress={() => router.push({ pathname: '/agent', params: { guide: c.kind } })}
            accessibilityRole="button"
            accessibilityLabel={`${c.title}. ${c.hint}`}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <Icon name={c.icon} size={20} color={INK} />
            <Text variant="caption" tint={INK} numberOfLines={1}>
              {c.title}
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
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 52,
    paddingRight: 6,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
  },
  ask: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingLeft: 16, borderRadius: 26 },
  flex: { flex: 1 },
  go: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT },
  // Four tiles share the width: all of them visible, nothing to scroll.
  tiles: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
    borderRadius: Radius.md,
    backgroundColor: GLASS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_EDGE,
  },
  pressed: { opacity: 0.75 },
});
