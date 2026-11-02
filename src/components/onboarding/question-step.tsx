import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOP_BAR_HEIGHT } from '@/components/onboarding/onboarding-shell';
import { Icon } from '@/components/ui/icon';
import { StickyFooter } from '@/components/ui/layout';
import { Text } from '@/components/ui/text';
import { Radius, ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  title: string;
  subtitle: string;
  children?: ReactNode;
  /** Sticky bottom area (e.g. "Devam"). */
  footer?: ReactNode;
}

/** Layout of every question: the question, a why-we-ask line, the answers, and "Devam" pinned below. */
export function QuestionStep({ title, subtitle, children, footer }: Props) {
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
        <View style={styles.header}>
          <Text variant="title" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="callout" color="textSecondary">
            {subtitle}
          </Text>
        </View>
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
  header: { gap: 8, marginBottom: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: Radius.md },
  noteWell: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  noteText: { flex: 1 },
});
