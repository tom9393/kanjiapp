// Grade + stroke-count chips shown under a glyph. Ported from the study/view/* composables.
import { StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/ui/theme';

export function MetaChips({ grade, strokes }: { grade: number; strokes: number }) {
  const p = usePalette();
  return (
    <View style={styles.row}>
      <Text style={[styles.chip, { color: p.textSecondary }]}>Grade {grade}</Text>
      <Text style={[styles.chip, { color: p.textSecondary }]}>{strokes} strokes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  chip: { fontSize: 12, marginRight: 12 },
});
