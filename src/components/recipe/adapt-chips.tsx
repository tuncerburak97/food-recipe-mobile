import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Chip, ChipRow } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import {
  adaptOptions,
  appliedKind,
  describeAdaptError,
  restoreVersion,
  useAdaptRecipe,
  type AdaptKind,
  type PreviousVersion,
} from '@/lib/adapt';
import { describeError } from '@/lib/api';
import { upperTr } from '@/lib/format';
import { useMe } from '@/lib/queries';
import type { RecipeEntry } from '@/lib/types';
import { showToast } from '@/store/toast';

const TOAST_MS = 7000;

/**
 * "Tek dokunuşla uyarla": one chip per adaptation that fits this recipe (airfryer, no oven,
 * lighter, vegetarian, quicker, for kids). A tap rewrites the original recipe as the user's
 * personal version; the toast offers "Geri al". The applied chip shows as picked; tapping it again
 * goes back to the original. On someone else's recipe the version is saved to the user's book and
 * the screen moves to that entry, as with the assistant.
 */
export function AdaptChips({ entry, mine }: { entry: RecipeEntry; mine: boolean }) {
  const { colors } = useTheme();
  const client = useQueryClient();
  const profile = useMe().data?.profile;
  const adapt = useAdaptRecipe();
  const [reverting, setReverting] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const applied = mine ? appliedKind(entry) : undefined;
  const options = adaptOptions(entry.recipe, profile, applied);
  if (options.length === 0) return null;

  const busyKind = adapt.isPending ? adapt.variables?.kind : undefined;
  const busy = adapt.isPending || reverting;

  /** Brings back `previous` (or the original) and offers to redo what was undone. */
  const revert = async (entryId: string, previous: PreviousVersion | undefined, redo?: PreviousVersion) => {
    if (mounted.current) setReverting(true);
    try {
      await restoreVersion(client, entryId, previous);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToast(
        {
          title: previous ? 'Önceki haline döndü' : 'Orijinal tarife dönüldü',
          action: redo ? { label: 'Geri al', onPress: () => revert(entryId, redo) } : undefined,
        },
        redo ? TOAST_MS : 3000,
      );
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const { title, message } = describeError(e);
      showToast({ title, message, action: { label: 'Tekrar dene', onPress: () => revert(entryId, previous, redo) } }, TOAST_MS);
    } finally {
      if (mounted.current) setReverting(false);
    }
  };

  const run = async (kind: AdaptKind) => {
    // What "Geri al" brings back: the user's earlier version, or the original recipe.
    const previous: PreviousVersion | undefined = mine && entry.customized ? { recipe: entry.recipe, note: entry.customNote } : undefined;
    try {
      const res = await adapt.mutateAsync({ entryId: entry.id, kind });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const moved = res.entry.id !== entry.id;
      if (moved && mounted.current) router.replace(`/recipe/${res.entry.id}`);
      showToast(
        {
          title: res.note,
          message: [moved ? 'Tariflerine kaydedildi' : null, res.changes[0]].filter(Boolean).join(' · ') || undefined,
          action: { label: 'Geri al', onPress: () => revert(res.entry.id, previous) },
        },
        TOAST_MS,
      );
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const err = describeAdaptError(e);
      showToast(
        { title: err.title, message: err.message, action: err.retry ? { label: 'Tekrar dene', onPress: () => run(kind) } : undefined },
        TOAST_MS,
      );
    }
  };

  const onPick = (kind: AdaptKind) => {
    if (kind === applied) revert(entry.id, undefined, { recipe: entry.recipe, note: entry.customNote });
    else run(kind);
  };

  // A personal version made in the assistant (e.g. scaled to 2 people) is replaced, so say so.
  const replacesAssistantVersion = mine && entry.customized && !applied;

  return (
    <View style={styles.section}>
      <Text variant="overline" color="textTertiary" accessibilityRole="header">
        {upperTr('Tek dokunuşla uyarla')}
      </Text>
      <ChipRow>
        {options.map((o) => {
          const working = o.kind === busyKind;
          const picked = o.kind === applied && !working;
          return (
            <Chip
              key={o.kind}
              label={working ? 'Uyarlanıyor…' : o.label}
              icon={picked ? 'checkmark' : undefined}
              selected={picked}
              tone="sunken"
              disabled={busy && !working}
              onPress={busy ? undefined : () => onPick(o.kind)}
            />
          );
        })}
      </ChipRow>
      {adapt.isPending ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text variant="footnote" color="textSecondary" style={styles.flex}>
            Tarifin yeniden yazılıyor, birkaç saniye sürebilir.
          </Text>
        </View>
      ) : replacesAssistantVersion ? (
        <Text variant="footnote" color="textTertiary">
          Orijinal tarife uygulanır, şimdiki uyarlamanın yerini alır.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
