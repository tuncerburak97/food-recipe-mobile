import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { ProgressBar } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  /** Flow name, e.g. "Elimdekilerle tarif". */
  flow: string;
  /** The question of this step. */
  title: string;
  hint?: string;
  /** 1-based. */
  step: number;
  totalSteps: number;
  onBack: () => void;
  onClose: () => void;
  /** Main action of the step ("Devam" / "Tarifimi oluştur"). */
  next: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; icon?: 'arrow-forward' | 'sparkles-outline' | null };
  /** Optional quiet line above the buttons (e.g. "3 malzeme seçili"). */
  summary?: string;
  /** Slide direction of the step change. */
  forward?: boolean;
  /** Set true when the screen is presented as an iOS modal (already below the status bar). */
  modal?: boolean;
  children: ReactNode;
}

/**
 * Multi-step form shell: flow name and "Adım 2/7", a progress bar, one question per screen and a
 * Geri / Devam footer. Choosing an answer never moves on by itself.
 */
export function WizardLayout({ flow, title, hint, step, totalSteps, onBack, onClose, next, summary, forward = true, modal = false, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const top = modal && Platform.OS === 'ios' ? 14 : insets.top + 8;
  const icon = next.icon === undefined ? (step < totalSteps ? 'arrow-forward' : null) : next.icon;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { paddingTop: top }]}>
        <View style={styles.topRow}>
          {step > 1 ? <IconButton icon="chevron-back" label="Önceki adım" tone="muted" onPress={onBack} /> : <View style={styles.spacer} />}
          <View style={styles.flex}>
            <Text variant="footnote" color="textSecondary" align="center" numberOfLines={1}>
              {flow}
            </Text>
            <Text variant="subhead" weight="700" align="center" accessibilityLabel={`Adım ${step} / ${totalSteps}`}>
              Adım {step}/{totalSteps}
            </Text>
          </View>
          <IconButton icon="close" label="Kapat" tone="muted" onPress={onClose} />
        </View>
        <ProgressBar value={step / totalSteps} label={`Adım ${step} / ${totalSteps}`} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}>
        <Animated.View key={step} entering={(forward ? FadeInRight : FadeInLeft).duration(240)} style={styles.step}>
          <View style={styles.titles}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {hint ? (
              <Text variant="callout" color="textSecondary">
                {hint}
              </Text>
            ) : null}
          </View>
          {children}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        {summary ? (
          <Text variant="footnote" color="textSecondary" align="center" numberOfLines={1}>
            {summary}
          </Text>
        ) : null}
        <View style={styles.buttons}>
          {step > 1 ? <Button title="Geri" variant="secondary" onPress={onBack} style={styles.back} /> : null}
          <Button
            title={next.label}
            onPress={next.onPress}
            loading={next.loading}
            disabled={next.disabled}
            trailingIcon={icon}
            style={styles.flex}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { paddingHorizontal: ScreenPadding, gap: 14, paddingBottom: 6 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  spacer: { width: 44 },
  content: { paddingHorizontal: ScreenPadding, paddingTop: 18, paddingBottom: 32 },
  step: { gap: 22 },
  titles: { gap: 8 },
  footer: { paddingHorizontal: ScreenPadding, paddingTop: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  buttons: { flexDirection: 'row', gap: 10 },
  back: { minWidth: 100 },
});
