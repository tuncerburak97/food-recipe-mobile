import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChefAvatar } from '@/components/ui/chef-avatar';
import { Chip } from '@/components/ui/chip';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listTr, type GuideKind } from '@/lib/agent/capabilities';
import { CATEGORY_LABELS } from '@/lib/format';
import { pantryItems, usePantry } from '@/lib/kitchen';
import { useCategories, useCreators, usePopularIngredients } from '@/lib/queries';

interface Props {
  kind: GuideKind;
  /** Sends the finished question. */
  onAsk: (q: string) => void;
  onClose: () => void;
}

/**
 * A question card in the chat for a capability tile: it asks for the one thing the request needs
 * (which ingredients, which account, which category, how many days) with real choices to tap, then
 * sends the question in the user's words. Nothing goes to the model until then.
 */
export function GuideCard({ kind, onAsk, onClose }: Props) {
  switch (kind) {
    case 'ingredient':
      return (
        <IngredientGuide
          title="İçinde ne olsun?"
          hint="Bir ya da birkaç malzeme seç, istersen kendin yaz."
          action="Tarifleri bul"
          ask={(sel) => `İçinde ${listTr(sel)} olan tarifleri getir`}
          onAsk={onAsk}
          onClose={onClose}
        />
      );
    case 'write':
      return (
        <IngredientGuide
          title="AI Şef neyle yazsın?"
          hint="Elindekileri seç; tarif birkaç dakikada Tariflerim’e gelir."
          action="Tarifi yazdır"
          ask={(sel) => `${listTr(sel)} ile bana bir tarif yaz`}
          more={(sel) => ({ label: 'Daha fazla seçenek', go: () => router.push(sel.length ? { pathname: '/chef', params: { ingredients: sel.join(',') } } : '/chef') })}
          onAsk={onAsk}
          onClose={onClose}
        />
      );
    case 'pantry':
      return (
        <IngredientGuide
          title="Dolabın boş, elinde neler var?"
          hint="Seçtiklerinle yapılabilecek tarifleri bulayım."
          action="Ne yapabilirim?"
          ask={(sel, keep) => `Elimde ${listTr(sel)} var, ne yapabilirim?${keep ? ' Bunları dolabıma da ekle.' : ''}`}
          offerKeep
          onAsk={onAsk}
          onClose={onClose}
        />
      );
    case 'creator':
      return <CreatorGuide onAsk={onAsk} onClose={onClose} />;
    case 'category':
      return <CategoryGuide onAsk={onAsk} onClose={onClose} />;
    case 'menu':
      return <MenuGuide onAsk={onAsk} onClose={onClose} />;
  }
}

// ---- shell ----

function Shell({ title, hint, children, footer }: { title: string; hint?: string; children: ReactNode; footer?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInUp.duration(220)} style={styles.row}>
      <ChefAvatar size={30} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.head}>
          <Text variant="headline">{title}</Text>
          {hint ? (
            <Text variant="footnote" color="textSecondary">
              {hint}
            </Text>
          ) : null}
        </View>
        {children}
        {footer}
      </View>
    </Animated.View>
  );
}

function Footer({ action, disabled, onAction, onClose, extra }: { action: string; disabled?: boolean; onAction: () => void; onClose: () => void; extra?: ReactNode }) {
  return (
    <View style={styles.footer}>
      <Button title={action} size="md" icon="arrow-forward" disabled={disabled} onPress={onAction} style={styles.flex} />
      <Button title="Vazgeç" variant="ghost" size="md" onPress={onClose} />
      {extra}
    </View>
  );
}

/** A small text box inside a card ("başka bir malzeme yaz"). */
function MiniInput({ placeholder, onSubmit }: { placeholder: string; onSubmit: (v: string) => void }) {
  const { colors } = useTheme();
  const [value, setValue] = useState('');
  const submit = () => {
    if (value.trim()) onSubmit(value.trim());
    setValue('');
  };
  return (
    <View style={[styles.mini, { backgroundColor: colors.surfaceMuted }]}>
      <Icon name="add" size={16} color={colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={submit}
        submitBehavior="submit"
        returnKeyType="done"
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.accent}
        style={[styles.miniInput, { color: colors.text }]}
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

const key = (s: string) => s.toLocaleLowerCase('tr-TR').trim();

// ---- ingredients (ingredient, write, empty pantry) ----

function IngredientGuide({
  title,
  hint,
  action,
  ask,
  more,
  offerKeep,
  onAsk,
  onClose,
}: {
  title: string;
  hint: string;
  action: string;
  ask: (selected: string[], keep: boolean) => string;
  more?: (selected: string[]) => { label: string; go: () => void };
  offerKeep?: boolean;
  onAsk: (q: string) => void;
  onClose: () => void;
}) {
  const pantry = pantryItems(usePantry().data).map((p) => p.name);
  const popular = (usePopularIngredients(24).data ?? []).map((i) => i.name);
  const [added, setAdded] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [keep, setKeep] = useState(true);

  // What they typed, then the pantry, then what most recipes use; each name once.
  const seen = new Set<string>();
  const options: { name: string; home: boolean }[] = [];
  for (const [list, home] of [
    [added, false],
    [pantry, true],
    [popular, false],
  ] as const) {
    for (const n of list) {
      if (!seen.has(key(n)) && options.length < 18) {
        seen.add(key(n));
        options.push({ name: n, home });
      }
    }
  }
  const isOn = (n: string) => selected.some((s) => key(s) === key(n));
  const toggle = (n: string) => setSelected((v) => (isOn(n) ? v.filter((s) => key(s) !== key(n)) : [...v, n]));
  const addTyped = (text: string) => {
    const names = text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    setAdded((v) => [...names, ...v]);
    setSelected((v) => [...v, ...names.filter((n) => !v.some((s) => key(s) === key(n)))]);
  };
  const extra = more?.(selected);

  return (
    <Shell
      title={title}
      hint={hint}
      footer={
        <Footer
          action={selected.length ? `${action} (${selected.length})` : action}
          disabled={!selected.length}
          onAction={() => onAsk(ask(selected, !!offerKeep && keep))}
          onClose={onClose}
        />
      }>
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip
            key={o.name}
            label={o.name}
            icon={o.home ? 'home-outline' : undefined}
            selected={isOn(o.name)}
            onPress={() => toggle(o.name)}
            tone="sunken"
            size="sm"
          />
        ))}
      </View>
      <MiniInput placeholder="Başka bir malzeme yaz" onSubmit={addTyped} />
      {offerKeep ? (
        <Chip label="Seçtiklerimi dolabıma da ekle" icon={keep ? 'checkmark' : 'add'} selected={keep} onPress={() => setKeep((v) => !v)} tone="sunken" size="sm" style={styles.start} />
      ) : null}
      {extra ? <Button title={extra.label} variant="ghost" size="sm" icon="options-outline" onPress={extra.go} style={styles.start} /> : null}
    </Shell>
  );
}

// ---- accounts ----

function CreatorGuide({ onAsk, onClose }: { onAsk: (q: string) => void; onClose: () => void }) {
  const { colors } = useTheme();
  const creators = (useCreators().data ?? []).slice(0, 6);
  return (
    <Shell
      title="Hangi şefin tariflerine bakalım?"
      hint="Birini seç ya da adını yaz."
      footer={<Button title="Vazgeç" variant="ghost" size="sm" onPress={onClose} style={styles.start} />}>
      <View style={[styles.list, { borderColor: colors.border }]}>
        {creators.map((c, i) => (
          <Pressable
            key={c.username}
            onPress={() => onAsk(`@${c.username} tariflerini getir`)}
            accessibilityRole="button"
            accessibilityLabel={`${c.full_name || c.username}, ${c.recipe_count} tarif`}
            style={({ pressed }) => [
              styles.person,
              i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              pressed && { backgroundColor: colors.surfaceMuted },
            ]}>
            <Avatar name={c.full_name || c.username} uri={c.avatar_url || undefined} size={34} />
            <View style={styles.flex}>
              <Text variant="headline" numberOfLines={1}>
                {c.full_name || `@${c.username}`}
              </Text>
              <Text variant="footnote" color="textSecondary" numberOfLines={1}>
                @{c.username} · {c.recipe_count} tarif
              </Text>
            </View>
            <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
          </Pressable>
        ))}
      </View>
      <MiniInput placeholder="Şef ya da hesap adı yaz" onSubmit={(v) => onAsk(`${v} tariflerini getir`)} />
    </Shell>
  );
}

// ---- categories ----

const TIMES = [
  { label: 'Süre fark etmez', minutes: 0 },
  { label: '20 dk', minutes: 20 },
  { label: '45 dk', minutes: 45 },
];

function CategoryGuide({ onAsk, onClose }: { onAsk: (q: string) => void; onClose: () => void }) {
  const counts = useCategories().data?.items ?? [];
  const [category, setCategory] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(0);
  const label = category ? CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] : '';
  const ask = () => onAsk(`${label} tariflerini getir${minutes ? `, ${minutes} dakikadan kısa olsun` : ''}`);
  return (
    <Shell
      title="Hangi tür yemek?"
      hint="Bir kategori seç, istersen süreyi de."
      footer={<Footer action="Göster" disabled={!category} onAction={ask} onClose={onClose} />}>
      <View style={styles.chips}>
        {counts.map((c) => (
          <Chip key={c.category} label={CATEGORY_LABELS[c.category]} count={c.count} selected={category === c.category} onPress={() => setCategory(c.category)} tone="sunken" size="sm" />
        ))}
      </View>
      <View style={styles.chips}>
        {TIMES.map((t) => (
          <Chip key={t.minutes} label={t.label} icon="time-outline" selected={minutes === t.minutes} onPress={() => setMinutes(t.minutes)} tone="sunken" size="sm" />
        ))}
      </View>
    </Shell>
  );
}

// ---- menus ----

const DAYS = [
  { label: '1 gün', days: 1 },
  { label: '3 gün', days: 3 },
  { label: '5 gün', days: 5 },
  { label: '1 hafta', days: 7 },
];
const MEALS = ['Kahvaltı', 'Öğle', 'Akşam'];

function MenuGuide({ onAsk, onClose }: { onAsk: (q: string) => void; onClose: () => void }) {
  const [days, setDays] = useState(3);
  const [meal, setMeal] = useState('Akşam');
  const span = days === 7 ? 'Bir haftalık' : `${days} günlük`;
  return (
    <Shell
      title="Nasıl bir menü?"
      hint="Seçtiklerine göre her gün farklı bir tarif koyarım; eksikleri sonra listene eklerim."
      footer={<Footer action="Menüyü hazırla" onAction={() => onAsk(`${span} ${meal.toLocaleLowerCase('tr-TR')} menüsü hazırla`)} onClose={onClose} />}>
      <View style={styles.chips}>
        {DAYS.map((d) => (
          <Chip key={d.days} label={d.label} selected={days === d.days} onPress={() => setDays(d.days)} tone="sunken" size="sm" />
        ))}
      </View>
      <View style={styles.chips}>
        {MEALS.map((m) => (
          <Chip key={m} label={m} selected={meal === m} onPress={() => setMeal(m)} tone="sunken" size="sm" />
        ))}
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  card: { flex: 1, gap: 12, padding: 14, borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth },
  head: { gap: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  start: { alignSelf: 'flex-start' },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, borderRadius: 20, paddingHorizontal: 12 },
  miniInput: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, paddingVertical: 8, outlineWidth: 0 },
  list: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, minHeight: 56 },
});
