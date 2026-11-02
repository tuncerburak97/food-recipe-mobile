import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  icon: IconName;
  title: string;
  message?: string;
  /** 'danger' and 'warning' tint the glyph only; the well stays neutral. */
  tone?: 'neutral' | 'accent' | 'danger' | 'warning';
  /** Buttons under the message. */
  children?: ReactNode;
}

/** Centered glyph + message, for empty lists and failures. */
export function EmptyState({ icon, title, message, tone = 'neutral', children }: Props) {
  const { colors } = useTheme();
  const glyph = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.textSecondary;
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={[styles.well, { backgroundColor: colors.surfaceMuted }]}>
        <Icon name={icon} size={24} color={glyph} />
      </View>
      <Text variant="title3" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="callout" color="textSecondary" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

/** A failure with a retry button. */
export function ErrorState({ title, message, onRetry, retrying }: { title: string; message?: string; onRetry?: () => void; retrying?: boolean }) {
  return (
    <EmptyState icon="cloud-offline-outline" tone="danger" title={title} message={message}>
      {onRetry ? <Button title="Tekrar dene" icon="refresh" variant="secondary" loading={retrying} onPress={onRetry} /> : null}
    </EmptyState>
  );
}

/** A calm spinner for a whole area. */
export function LoadingState({ label = 'Yükleniyor' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.loading} accessible accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 },
  well: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  message: { maxWidth: 300 },
  actions: { marginTop: 18, gap: 8, alignSelf: 'stretch' },
  loading: { paddingVertical: 64, alignItems: 'center', justifyContent: 'center' },
});
