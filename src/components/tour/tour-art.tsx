import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PlateMark } from '@/components/recipe/ai-hero';
import { Chip, ChipWrap } from '@/components/ui/chip';
import { Icon, type IconName } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { upperTr } from '@/lib/format';

/**
 * Still illustrations for the tour, built from the app's own pieces (cards, chips, rows) on a warm
 * panel, so people recognise them later in the app. Nothing here is tappable or read aloud: the
 * page text below the panel says the same thing in words.
 */
function Frame({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.frame, { backgroundColor: colors.peachSoft, borderColor: colors.peach }]}>
      {children}
    </View>
  );
}

function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border, boxShadow: `0 2px 10px ${colors.shadow}` }, style]}>
      {children}
    </View>
  );
}

/** A small round link between two pieces: "this turns into that". */
function Connector() {
  const { colors } = useTheme();
  return (
    <View style={styles.connector}>
      <View style={[styles.connectorDot, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="arrow-down" size={15} color={colors.textSecondary} />
      </View>
    </View>
  );
}

function Thumb({ size }: { size: number }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.thumb, { width: size, height: size, backgroundColor: colors.peach }]}>
      <PlateMark size={size * 0.42} />
    </View>
  );
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.meta}>
      <Icon name={icon} size={13} color={colors.textSecondary} />
      <Text variant="footnote" color="textSecondary" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

/** 1: what you have becomes a recipe that suits you. */
export function PantryArt() {
  return (
    <Frame>
      <Panel>
        <View style={styles.spread}>
          <Text variant="overline" color="textTertiary">
            {upperTr('Elindekiler')}
          </Text>
          <Text variant="footnote" color="textTertiary">
            3 malzeme
          </Text>
        </View>
        <ChipWrap>
          <Chip label="Kabak" tone="sunken" size="sm" removable />
          <Chip label="Yumurta" tone="sunken" size="sm" removable />
          <Chip label="Beyaz peynir" tone="sunken" size="sm" removable />
        </ChipWrap>
      </Panel>
      <Connector />
      <Panel style={styles.recipe}>
        <Thumb size={64} />
        <View style={styles.flexGap}>
          <Text variant="title3" numberOfLines={2}>
            Peynirli Kabak Yatağında Yumurta
          </Text>
          <Meta icon="time-outline" text="30 dk · 2 kişilik · Kolay" />
          <Tag tone="success" icon="checkmark-circle" label="Alerjilerine uygun" style={styles.tag} />
        </View>
      </Panel>
    </Frame>
  );
}

/** 2: a pasted video link becomes a tidy recipe. */
export function VideoArt() {
  const { colors } = useTheme();
  return (
    <Frame>
      <Panel style={styles.link}>
        <Icon name="link-outline" size={18} color={colors.textSecondary} />
        <Text variant="subhead" color="textSecondary" numberOfLines={1} style={styles.flex}>
          instagram.com/reel/…
        </Text>
        <View style={[styles.miniButton, { backgroundColor: colors.accentStrong }]}>
          <Text variant="footnote" weight="700" tint={colors.onAccent}>
            Yapıştır
          </Text>
        </View>
      </Panel>
      <Connector />
      <Panel>
        <Text variant="title3">Fırında Sebzeli Köfte</Text>
        <View>
          {[
            ['Kıyma', '500 g'],
            ['Patates', '2 adet'],
            ['Soğan', '1 adet'],
          ].map(([name, amount]) => (
            <View key={name} style={[styles.ingredient, { borderTopColor: colors.border }]}>
              <Text variant="subhead" style={styles.flex}>
                {name}
              </Text>
              <Text variant="subhead" color="textSecondary">
                {amount}
              </Text>
            </View>
          ))}
        </View>
        <Meta icon="list-outline" text="6 adım · 45 dk" />
      </Panel>
    </Frame>
  );
}

/** 3: one big step at a time, with a timer that rings. */
export function CookArt() {
  const { colors } = useTheme();
  return (
    <Frame>
      <Panel>
        <View style={styles.spread}>
          <Text variant="overline" color="accentText">
            {upperTr('Adım 3 / 6')}
          </Text>
          <Text variant="footnote" color="textTertiary">
            Sos
          </Text>
        </View>
        <ProgressBar value={0.5} />
        <Text variant="title2">Sosu kısık ateşte 12 dakika pişir.</Text>
      </Panel>
      <Panel style={styles.timer}>
        <View style={styles.flex}>
          <Text variant="overline" color="textTertiary">
            {upperTr('Zamanlayıcı')}
          </Text>
          <Text variant="numeral">12:00</Text>
        </View>
        <View style={[styles.startButton, { backgroundColor: colors.accentStrong }]}>
          <Text variant="headline" tint={colors.onAccent}>
            Başlat
          </Text>
        </View>
      </Panel>
      <View style={styles.hint}>
        <Icon name="alarm-outline" size={16} color={colors.textSecondary} />
        <Text variant="footnote" color="textSecondary">
          Süre dolunca alarm çalar
        </Text>
      </View>
    </Frame>
  );
}

/** 4: every recipe in one place, and questions answered while you cook. */
export function BookArt() {
  const { colors } = useTheme();
  return (
    <Frame>
      <SegmentedControl
        tone="raised"
        value="saved"
        onChange={() => {}}
        segments={[
          { value: 'saved', label: 'Kaydettiklerim' },
          { value: 'ai', label: 'Hazırladıklarım' },
        ]}
      />
      <Panel style={styles.list}>
        {[
          { title: 'Tavuk Tikka Masala', meta: '40 dk · 4 kişilik' },
          { title: 'Limonlu Avokado Tost', meta: '10 dk · 1 kişilik' },
        ].map((r, i) => (
          <View key={r.title} style={[styles.listRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Thumb size={44} />
            <View style={styles.flexGap}>
              <Text variant="headline" numberOfLines={1}>
                {r.title}
              </Text>
              <Text variant="footnote" color="textSecondary">
                {r.meta}
              </Text>
            </View>
            <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
          </View>
        ))}
      </Panel>
      <View style={[styles.bubble, styles.mine, { backgroundColor: colors.ink }]}>
        <Text variant="subhead" tint={colors.onInk}>
          Krema yerine ne kullanabilirim?
        </Text>
      </View>
      <View style={[styles.bubble, styles.theirs, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text variant="subhead">Süzme yoğurt kullanabilirsin; ocaktan alınca ekle.</Text>
      </View>
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 10,
    minHeight: 300,
    justifyContent: 'center',
  },
  panel: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 10 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 4 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  connector: { alignItems: 'center', marginVertical: -4 },
  connectorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  recipe: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tag: { marginTop: 4 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.pill, paddingVertical: 8, paddingLeft: 16, paddingRight: 8 },
  miniButton: { height: 32, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  ingredient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  startButton: { height: 44, paddingHorizontal: 20, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  hint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2 },
  list: { padding: 0, gap: 0, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  bubble: { maxWidth: '84%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.lg },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: 6, marginTop: 4 },
  theirs: { alignSelf: 'flex-start', borderBottomLeftRadius: 6, borderWidth: StyleSheet.hairlineWidth },
});
