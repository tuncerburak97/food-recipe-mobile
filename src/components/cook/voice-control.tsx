import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding, TouchSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useVoiceRecorder } from '@/hooks/use-voice-recorder';
import { useVoiceSession } from '@/hooks/use-voice-session';
import type { VoiceChip, VoiceFeedback, VoiceInput, VoiceSession, VoiceSheet as SheetKind, VoiceState } from '@/lib/voice/session';
import type { Recipe } from '@/lib/types';

export interface VoiceControlProps {
  entryId: string;
  recipe: Recipe;
  /** 0 = ingredients, 1..n = steps, n + 1 = finished. */
  page: number;
  /** Opens a page (same as tapping it on the step rail). */
  onGo: (page: number) => void;
  /** Same as the main button: "Tamamladım" / "Sıradaki adım". */
  onComplete: () => void;
}

/** Same size as the close button beside it. */
const CONTROL = TouchSize - 4;
const GAP = 8;
/** The close button's slot at the top right (its size plus the gap). */
const CLOSE_SLOT = CONTROL + 10;
/** The same soft shadow as IconButton's overlay tone, for controls over the video. */
const OVERLAY_SHADOW = '0 2px 10px rgba(0,0,0,0.16)';

/**
 * Hands-free cooking: reads the step aloud and listens for "sonraki", "tekrar", "10 dakika kur" or a
 * question. A mic button left of the close button turns it on; while on, a small pill beside it
 * says what voice is doing (with the live mic level) and confirms each command for a moment.
 * Answers worth reading (amounts, the assistant) also get a dark card under the controls.
 */
export function VoiceControl({ entryId, recipe, page, onGo, onComplete }: VoiceControlProps) {
  const insets = useSafeAreaInsets();
  const { session, state } = useVoiceSession({ entryId, recipe, page, onGo, onComplete });
  const level = useSharedValue(0);
  const top = insets.top + 8;

  useEffect(() => session.onLevel((v) => level.set(withTiming(v, { duration: 140 }))), [session, level]);

  return (
    <>
      {state.on && state.input === 'record' ? <RecorderBridge session={session} /> : null}

      <View pointerEvents="box-none" style={[styles.bar, { top, right: ScreenPadding + CLOSE_SLOT }]}>
        {state.on ? <StatusPill state={state} level={level} onPress={() => session.tap()} /> : null}
        <IconButton
          icon="mic-outline"
          label={state.on ? 'Sesli komutları kapat' : 'Sesli komutları aç'}
          tone={state.on ? 'accent' : 'overlay'}
          size={CONTROL}
          busy={state.phase === 'starting'}
          onPress={() => session.toggle()}
        />
      </View>

      {state.feedback ? <FeedbackCard feedback={state.feedback} top={top + CONTROL + 10} onClose={() => session.dismissFeedback()} /> : null}

      <VoiceSheet
        kind={state.sheet}
        input={state.input}
        canAskAgain={state.canAskAgain}
        onEnable={() => session.enable()}
        onClose={() => session.closeSheet()}
      />
    </>
  );
}

/** Mounted only for tap to talk, so expo-audio is loaded only where it exists. */
function RecorderBridge({ session }: { session: VoiceSession }) {
  useVoiceRecorder(session);
  return null;
}

interface PillLook {
  label: string;
  /** Quiet second word: what a tap does. */
  hint?: string;
  a11y: string;
  lead: 'level' | 'spinner' | IconName;
  tappable: boolean;
}

function pillLook({ phase, input, thinking }: VoiceState, chip: VoiceChip | null): PillLook {
  const tappable = phase === 'speaking' || phase === 'recording' || phase === 'waiting' || thinking;
  if (chip) return { label: chip.title, a11y: chip.title, lead: chip.icon, tappable };
  if (thinking) return { label: 'Düşünüyorum', hint: 'Vazgeç', a11y: 'Asistan düşünüyor. Vazgeçmek için dokun.', lead: 'spinner', tappable: true };
  switch (phase) {
    case 'speaking':
      return { label: 'Okuyorum', hint: 'Durdur', a11y: 'Sesli okuyor. Durdurmak için dokun.', lead: 'volume-high-outline', tappable: true };
    case 'listening':
      return { label: 'Dinliyorum', a11y: 'Dinliyor', lead: 'level', tappable: false };
    case 'recording':
      return { label: 'Dinliyorum', hint: 'Bitir', a11y: 'Seni dinliyor. Bitirmek için dokun.', lead: 'level', tappable: true };
    case 'waiting':
      if (input === 'record') return { label: 'Dokun, konuş', a11y: 'Konuşmak için dokun', lead: 'mic-outline', tappable: true };
      if (input === 'native') return { label: 'Dinle', a11y: 'Dinlemeyi yeniden başlat', lead: 'refresh-outline', tappable: true };
      return { label: 'Tekrar oku', a11y: 'Adımı tekrar oku', lead: 'volume-medium-outline', tappable: true };
    default:
      return { label: 'Bir saniye', a11y: 'Hazırlanıyor', lead: 'spinner', tappable: false };
  }
}

/** What voice is doing right now, in one quiet line. */
function StatusPill({ state, level, onPress }: { state: VoiceState; level: SharedValue<number>; onPress: () => void }) {
  const { colors } = useTheme();
  const look = pillLook(state, state.chip);
  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)}>
      <Pressable
        onPress={onPress}
        disabled={!look.tappable}
        hitSlop={6}
        accessibilityRole={look.tappable ? 'button' : 'text'}
        accessibilityLabel={look.a11y}
        accessibilityLiveRegion="polite"
        style={({ pressed }) => [styles.pill, { backgroundColor: colors.surface, boxShadow: OVERLAY_SHADOW, opacity: pressed ? 0.7 : 1 }]}>
        <View style={styles.lead}>
          {look.lead === 'level' ? (
            <LevelBars level={level} color={colors.accent} />
          ) : look.lead === 'spinner' ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Icon name={look.lead} size={18} color={colors.text} />
          )}
        </View>
        <Text variant="subhead" weight="600" numberOfLines={1} style={styles.shrink}>
          {look.label}
        </Text>
        {look.hint ? (
          <Text variant="subhead" color="textTertiary" numberOfLines={1}>
            · {look.hint}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const BAR_WEIGHTS = [0.55, 1, 0.75, 0.4];

/** Four small bars that follow the microphone level; flat dots when it is quiet. */
function LevelBars({ level, color }: { level: SharedValue<number>; color: string }) {
  return (
    <View style={styles.bars} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {BAR_WEIGHTS.map((w, i) => (
        <Bar key={i} level={level} weight={w} color={color} />
      ))}
    </View>
  );
}

function Bar({ level, weight, color }: { level: SharedValue<number>; weight: number; color: string }) {
  const style = useAnimatedStyle(() => ({ height: 4 + 12 * Math.min(1, level.get() * 1.4) * weight }));
  return <Animated.View style={[styles.levelBar, { backgroundColor: color }, style]} />;
}

/** An answer worth reading: what was heard, then the answer. Tap to dismiss. */
function FeedbackCard({ feedback, top, onClose }: { feedback: VoiceFeedback; top: number; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <Animated.View key={feedback.id} entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} pointerEvents="box-none" style={[styles.feedbackWrap, { top }]}>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={[feedback.heard ? `Duyduğum: ${feedback.heard}` : '', feedback.title, feedback.detail ?? ''].filter(Boolean).join('. ')}
        accessibilityHint="Kapatır"
        accessibilityLiveRegion="polite"
        style={[styles.feedback, { backgroundColor: colors.ink, boxShadow: '0 10px 30px rgba(0,0,0,0.22)' }]}>
        <Icon name={feedback.icon} size={18} color={colors.onInk} style={styles.feedbackIcon} />
        <View style={styles.flex}>
          {feedback.heard ? (
            <Text variant="footnote" tint={colors.onInk} style={styles.muted} numberOfLines={1}>
              “{feedback.heard}”
            </Text>
          ) : null}
          <Text variant="headline" tint={colors.onInk} numberOfLines={3}>
            {feedback.title}
          </Text>
          {feedback.detail ? (
            <Text variant="callout" tint={colors.onInk} style={styles.detail} numberOfLines={7}>
              {feedback.detail}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const EXAMPLES: { say: string; does: string }[] = [
  { say: '“sonraki”, “önceki”, “tekrar”', does: 'Adımlar arasında gezer' },
  { say: '“10 dakika kur”', does: 'Zamanlayıcıyı başlatır' },
  { say: '“un ne kadardı?”', does: 'Miktarı tariften söyler' },
  { say: 'Aklına gelen soru', does: 'Asistan kısaca cevaplar' },
];

/** Explains voice the first time, and the friendly "no permission" / "not on this phone" states. */
function VoiceSheet({
  kind,
  input,
  canAskAgain,
  onEnable,
  onClose,
}: {
  kind: SheetKind | null;
  input: VoiceInput;
  canAskAgain: boolean;
  onEnable: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Keep the last content while the sheet fades out.
  const [shown, setShown] = useState<SheetKind>(kind ?? 'intro');
  if (kind && kind !== shown) setShown(kind);

  const openSettings = () => {
    onClose();
    Linking.openSettings().catch(() => undefined);
  };

  return (
    <Modal visible={kind != null} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Kapat" />
        <Animated.View
          entering={SlideInDown.duration(260)}
          accessibilityViewIsModal
          style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
          {shown === 'intro' ? (
            <>
              <View style={styles.sheetText}>
                <Text variant="title2" accessibilityRole="header">
                  Sesle pişir
                </Text>
                <Text variant="body" color="textSecondary">
                  Elin hamurluyken: “sonraki”, “tekrar”, “10 dakika kur” ya da sorunu söyle.
                </Text>
              </View>
              {input !== 'none' ? (
                <View style={[styles.examples, { backgroundColor: colors.surfaceMuted }]}>
                  {EXAMPLES.map((e, i) => (
                    <View key={e.say} style={[styles.example, i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                      <Text variant="headline" style={styles.flex}>
                        {e.say}
                      </Text>
                      <Text variant="subhead" color="textSecondary" align="right" style={styles.does}>
                        {e.does}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
              <Text variant="footnote" color="textSecondary">
                {input === 'native'
                  ? 'Her adımı sesli okur, sonra dinlerim; okurken dinlemem. Okumayı üstteki düğmeye dokunarak durdurabilirsin. Mikrofon yalnızca pişirme modunda ve bu özellik açıkken çalışır.'
                  : input === 'record'
                    ? 'Bu sürümde sürekli dinleme yok: konuşmadan önce üstteki “Dokun, konuş” düğmesine dokun. Mikrofon yalnızca sen dokununca açılır.'
                    : 'Bu cihazda sesli komut yok; adımları sesli okurum.'}
              </Text>
              <View style={styles.actions}>
                <Button title={input === 'none' ? 'Sesli okumayı aç' : 'Sesli komutları aç'} icon="mic-outline" onPress={onEnable} />
                <Button title="Şimdi değil" variant="ghost" size="md" onPress={onClose} />
              </View>
            </>
          ) : shown === 'denied' ? (
            <>
              <View style={styles.sheetText}>
                <Text variant="title2" accessibilityRole="header">
                  Mikrofon izni kapalı
                </Text>
                <Text variant="body" color="textSecondary">
                  {`Sesli komutlar için ${input === 'native' && Platform.OS === 'ios' ? 'mikrofon ve konuşma tanıma' : 'mikrofon'} izni gerekiyor. İzni Ayarlar’dan açabilirsin; bu arada adımları ekrandan takip edebilirsin.`}
                </Text>
              </View>
              <View style={styles.actions}>
                {canAskAgain ? (
                  <>
                    <Button title="Tekrar dene" onPress={onEnable} />
                    <Button title="Ayarları aç" variant="ghost" size="md" onPress={openSettings} />
                  </>
                ) : (
                  <>
                    <Button title="Ayarları aç" trailingIcon="open-outline" onPress={openSettings} />
                    <Button title="Vazgeç" variant="ghost" size="md" onPress={onClose} />
                  </>
                )}
              </View>
            </>
          ) : (
            <>
              <View style={styles.sheetText}>
                <Text variant="title2" accessibilityRole="header">
                  Bu cihazda sesli komut yok
                </Text>
                <Text variant="body" color="textSecondary">
                  Bu cihazda konuşma tanıma ve sesli okuma bulunamadı. Adımları ekrandaki düğmelerle rahatça takip edebilirsin.
                </Text>
              </View>
              <View style={styles.actions}>
                <Button title="Tamam" variant="secondary" onPress={onClose} />
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  bar: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: GAP },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: CONTROL,
    maxWidth: 230,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: Radius.pill,
  },
  lead: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 18 },
  levelBar: { width: 3, borderRadius: 1.5 },
  feedbackWrap: { position: 'absolute', left: ScreenPadding, right: ScreenPadding, alignItems: 'flex-end' },
  feedback: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
    maxWidth: 380,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.lg,
  },
  feedbackIcon: { marginTop: 1 },
  muted: { opacity: 0.72, marginBottom: 2 },
  detail: { opacity: 0.85, marginTop: 4 },
  modal: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,12,10,0.45)' },
  sheet: {
    gap: 20,
    paddingTop: 28,
    paddingHorizontal: ScreenPadding,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
  },
  sheetText: { gap: 8 },
  examples: { borderRadius: Radius.lg, paddingHorizontal: 16 },
  example: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10 },
  does: { flexShrink: 1, maxWidth: '50%' },
  actions: { gap: 6 },
});
