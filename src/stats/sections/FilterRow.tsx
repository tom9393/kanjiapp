import { ScrollView, StyleSheet } from 'react-native';
import { Chip, shared } from '@/stats/primitives';
import { StatsFilter } from '@/stats/statsModels';

export function FilterRow({ filter, onSetFilter }: { filter: StatsFilter; onSetFilter: (f: StatsFilter) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[shared.chipRow, styles.row]}>
      <Chip label="All" selected={filter.kind === 'all'} onPress={() => onSetFilter({ kind: 'all' })} />
      {[1, 2, 3, 4, 5, 6].map((grade) => (
        <Chip
          key={grade}
          label={`Grade ${grade}`}
          selected={filter.kind === 'grade' && filter.grade === grade}
          onPress={() => onSetFilter({ kind: 'grade', grade })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 4 },
});
