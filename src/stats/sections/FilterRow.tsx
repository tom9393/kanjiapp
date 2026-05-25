// Grade filter: an All / Grade segmented control, with grade chips when "Grade" is active.
// Ported from StatsScreen.kt (the native dropdown rendered the idiomatic RN way).
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Segment, shared } from '@/stats/primitives';
import { StatsFilter } from '@/stats/statsModels';

export function FilterRow({ filter, onSetFilter }: { filter: StatsFilter; onSetFilter: (f: StatsFilter) => void }) {
  return (
    <View style={styles.filterRow}>
      <View style={styles.segmentRow}>
        <Segment label="All" active={filter.kind === 'all'} onPress={() => onSetFilter({ kind: 'all' })} />
        <Segment
          label="Grade"
          active={filter.kind === 'grade'}
          onPress={() => onSetFilter({ kind: 'grade', grade: filter.kind === 'grade' ? filter.grade : 1 })}
        />
      </View>
      {filter.kind === 'grade' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={shared.chipRow}>
          {[1, 2, 3, 4, 5, 6].map((grade) => (
            <Chip
              key={grade}
              label={`Grade ${grade}`}
              selected={filter.grade === grade}
              onPress={() => onSetFilter({ kind: 'grade', grade })}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
  segmentRow: { flexDirection: 'row', gap: 8 },
});
