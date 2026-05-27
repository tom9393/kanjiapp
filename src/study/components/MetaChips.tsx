// Grade + stroke-count chips shown under a glyph. Ported from the study/view/* composables.
import { StyleSheet, Text, View } from 'react-native';
import { kankenLabel } from '@/data/types';
import { usePalette } from '@/ui/theme';

export function MetaChips({ grade, strokes, kanken }: { grade: number; strokes: number; kanken: number }) {
  const p = usePalette();
  const kankenLevel = kankenLabel(kanken);
  return (
    <View style={styles.row}>
      <Text style={[styles.chip, { color: p.textSecondary }]}>Grade {grade}</Text>
      <Text style={[styles.chip, { color: p.textSecondary }]}>{strokes} strokes</Text>
      {kankenLevel && <Text style={[styles.chip, { color: p.textSecondary }]}>Kanken {kankenLevel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  chip: { fontSize: 12, marginRight: 12 },
});
