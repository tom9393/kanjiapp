// Card-state distribution: a single proportional bar + a scrollable count legend.
// Ported from StatsScreen.kt.
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ColorLearning, ColorMature, ColorRelearning, ColorUnseen, ColorYoung } from '@/stats/colors';
import { StatCard, shared } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';
import { usePalette } from '@/ui/theme';

export function CardCountsSection({ state }: { state: StatsUiState }) {
  const p = usePalette();
  const all: [string, number, string][] = [
    ['Unseen', state.unseenCount, ColorUnseen],
    ['Learning', state.learningCount, ColorLearning],
    ['Young', state.youngCount, ColorYoung],
    ['Mature', state.matureCount, ColorMature],
    ['Relearn', state.relearningCount, ColorRelearning],
  ];
  const present = all.filter((c) => c[1] > 0);

  return (
    <StatCard title="Card Counts">
      {state.totalCount > 0 ? (
        <>
          {present.length > 0 && (
            <>
              <View style={styles.countBar}>
                {present.map(([label, count, color]) => (
                  <View key={label} style={{ flex: count, backgroundColor: color }} />
                ))}
              </View>
              <View style={{ height: 10 }} />
            </>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countLegend}>
            {all.map(([label, count, color]) => (
              <View key={label} style={shared.legendItem}>
                <View style={[shared.legendSwatch, { backgroundColor: color }]} />
                <Text style={{ fontSize: 10, textAlign: 'center', color: p.textSecondary }}>{`${label}\n${count}`}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <Text style={{ color: p.textSecondary, fontSize: 14 }}>No characters in this filter</Text>
      )}
    </StatCard>
  );
}

const styles = StyleSheet.create({
  countBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' },
  countLegend: { gap: 12 },
});
