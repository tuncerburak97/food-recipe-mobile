import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { StickyFooter } from '@/components/ui/layout';
import { ListGroup } from '@/components/ui/list';
import { Text } from '@/components/ui/text';
import { ScreenPadding } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describeError } from '@/lib/api';

interface Props {
  name: string;
  rows: { label: string; value: string }[];
  /** Saves the profile; the session swaps to Home on success. */
  onFinish: () => Promise<void>;
  onEdit: () => void;
}

/** Last screen: the answers in a plain list, so the user can check them, then "Başla". */
export function SummaryStep({ name, rows, onFinish, onEdit }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await onFinish();
    } catch (e) {
      setError(describeError(e));
      setSaving(false);
    }
  };

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 44 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.well, { backgroundColor: colors.successSoft }]}>
          <Icon name="checkmark" size={24} color={colors.success} />
        </View>
        <View style={styles.header}>
          <Text variant="display" accessibilityRole="header">
            {name ? `Hazırız, ${name}` : 'Hazırız'}
          </Text>
          <Text variant="body" color="textSecondary">
            Tarifleri bu bilgilere göre hazırlayacağız. Hepsini sonra Profil’den değiştirebilirsin.
          </Text>
        </View>

        {rows.length > 0 ? (
          <ListGroup title="Cevapların">
            {rows.map((r, i) => (
              <FactRow key={r.label} label={r.label} value={r.value} first={i === 0} />
            ))}
          </ListGroup>
        ) : (
          <Card tone="muted">
            <Text variant="callout" color="textSecondary">
              Soruları geçtin; tarifler genel tercihlere göre hazırlanacak.
            </Text>
          </Card>
        )}
      </ScrollView>

      <StickyFooter>
        {error ? (
          <Text variant="footnote" color="danger" align="center" accessibilityLiveRegion="polite">
            {error.title}. {error.message}
          </Text>
        ) : null}
        <Button title={error ? 'Tekrar dene' : 'Başla'} onPress={finish} loading={saving} />
        <Button title="Cevaplarımı düzenle" variant="ghost" size="md" icon="create-outline" onPress={onEdit} disabled={saving} />
      </StickyFooter>
    </View>
  );
}

/** One answer: a quiet label on the left, the answer itself on the right, wrapping when long. */
function FactRow({ label, value, first }: { label: string; value: string; first: boolean }) {
  const { colors } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}`}
      style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      <Text variant="subhead" color="textSecondary" style={styles.label}>
        {label}
      </Text>
      <Text variant="headline" style={styles.value}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: ScreenPadding, gap: 24, paddingBottom: 28 },
  well: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  header: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 14 },
  label: { width: 96, paddingTop: 1 },
  value: { flex: 1 },
});
