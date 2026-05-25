// The header + row of the retention tables, shared by RetentionSection and
// RetentionByIntervalSection. Ported from StatsScreen.kt.
import { StyleSheet, Text, View } from 'react-native';
import { shared } from '@/stats/primitives';
import { RetentionData, retentionRate } from '@/stats/statsModels';
import { usePalette } from '@/ui/theme';

export function RetentionHeader({ first }: { first: string }) {
  const p = usePalette();
  const cell = (text: string, flex: number, end = true) => (
    <Text style={[styles.tableHead, { color: p.text, flex }, end && styles.alignEnd]}>{text}</Text>
  );
  return (
    <View style={styles.row}>
      <Text style={[styles.tableHead, { color: p.text, flex: 2 }]}>{first}</Text>
      {cell('Correct', 1.5)}
      {cell('Total', 1)}
      {cell('Rate', 1)}
    </View>
  );
}

export function RetentionRow({ period, data }: { period: string; data: RetentionData }) {
  const p = usePalette();
  const rateText = data.total === 0 ? '—' : `${Math.round(retentionRate(data) * 100)}%`;
  return (
    <View style={[styles.row, { paddingVertical: 3, alignItems: 'center' }]}>
      <Text style={[shared.bodySmall, { color: p.text, flex: 2 }]}>{period}</Text>
      <Text style={[shared.bodySmall, styles.alignEnd, { color: p.text, flex: 1.5 }]}>{String(data.correct)}</Text>
      <Text style={[shared.bodySmall, styles.alignEnd, { color: p.text, flex: 1 }]}>{String(data.total)}</Text>
      <Text style={[shared.bodySmall, styles.alignEnd, { color: p.text, flex: 1, fontWeight: '500' }]}>{rateText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  alignEnd: { textAlign: 'right' },
  tableHead: { fontSize: 12, fontWeight: '600' },
});
