import { StyleSheet, View } from 'react-native';

import { ChoiceCard } from '@/components/ui/choice-card';
import { TextField } from '@/components/ui/text-field';
import { TELLERS } from '@/lib/voice-recipe';

interface Props {
  preset: string | null;
  custom: string;
  title: string;
  onPreset: (teller: string | null) => void;
  onCustom: (name: string) => void;
  onTitle: (title: string) => void;
}

/** "Tarifi kim anlatıyor?": four quick answers or a typed name, and the dish name. All optional. */
export function TellerStep({ preset, custom, title, onPreset, onCustom, onTitle }: Props) {
  const typed = custom.trim().length > 0;
  return (
    <View style={styles.sections}>
      <View style={styles.grid} accessibilityRole="radiogroup">
        {TELLERS.map((t) => {
          const selected = !typed && preset === t;
          return <ChoiceCard key={t} compact title={t} selected={selected} onPress={() => onPreset(selected ? null : t)} />;
        })}
      </View>
      <TextField
        label="Ya da adını yaz"
        value={custom}
        onChangeText={onCustom}
        placeholder="ör. Fatma teyze"
        maxLength={40}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
      />
      <TextField
        label="Yemeğin adı (isteğe bağlı)"
        value={title}
        onChangeText={onTitle}
        placeholder="ör. Mercimek köftesi"
        maxLength={80}
        autoCapitalize="sentences"
        returnKeyType="done"
        help="Boş bırakırsan adını anlatılandan biz koyarız."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { gap: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
