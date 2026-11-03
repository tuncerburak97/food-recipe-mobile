import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOP_BAR_HEIGHT } from '@/components/onboarding/onboarding-shell';
import { Icon } from '@/components/ui/icon';
import { StickyFooter } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  /** Small line over the title, e.g. "2 / 7 · Sofran". */
  kicker?: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
  /** Sticky bottom area (e.g. "Devam"). */
  footer?: ReactNode;
}

/** Layout of every question: the question, a why-we-ask line, the answers, and "Devam" pinned below. */
export function QuestionStep({ kicker, title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.page}>
      <ScrollView
        style={styles.page}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + TOP_BAR_HEIGHT + 12, paddingBottom: footer ? 28 : insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(300)} style={styles.header}>
          {kicker ? (
            <Text variant="overline" color="accentText">
              {kicker}
            </Text>
          ) : null}
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="body" color="textSecondary">
            {subtitle}
          </Text>
        </Animated.View>
        {children}
      </ScrollView>
      {footer ? <StickyFooter>{footer}</StickyFooter> : null}
    </View>
  );
}

/** A quiet reassurance line above the answers, e.g. the allergy safety promise. */
export function QuestionNote({ text, icon = 'information-circle' }: { text: string; icon?: 'shield-checkmark' | 'information-circle' }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.note, { backgroundColor: colors.surfaceMuted }]}>
      <View style={[styles.noteWell, { backgroundColor: colors.surface }]}>
        <Icon name={icon === 'shield-checkmark' ? 'shield-checkmark-outline' : 'information-circle-outline'} size={18} color={colors.text} />
      </View>
      <Text variant="subhead" color="textSecondary" style={styles.noteText}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, gap: 20 },
  header: { gap: 10, marginBottom: 6 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: Radius.md },
  noteWell: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1 },
});
