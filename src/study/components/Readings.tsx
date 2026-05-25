// Meanings / On / Kun reading list for a kanji. Ported from the study/view/* composables.
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Kanji } from '@/data/types';
import { usePalette } from '@/ui/theme';

function LabeledField({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  if (!value || value.trim().length === 0) return null;
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: p.text }]}>{label}: </Text>
      <Text style={[styles.fieldValue, { color: p.text }]}>{value}</Text>
    </View>
  );
}

export function Readings({ kanji, style }: { kanji: Kanji; style?: ViewStyle }) {
  return (
    <View style={style}>
      <LabeledField label="Meanings" value={kanji.meanings} />
      <LabeledField label="On" value={kanji.on} />
      <LabeledField label="Kun" value={kanji.kun} />
    </View>
  );
}

const styles = StyleSheet.create({
  fieldRow: { flexDirection: 'row', paddingVertical: 2, flexWrap: 'wrap' },
  fieldLabel: { fontSize: 15, fontWeight: '600' },
  fieldValue: { fontSize: 15, flexShrink: 1 },
});
