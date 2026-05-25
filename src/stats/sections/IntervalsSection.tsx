// Distribution of current review intervals. Ported from StatsScreen.kt.
import { View } from 'react-native';
import { BarChart } from '@/stats/charts/BarChart';
import { ColorMature } from '@/stats/colors';
import { SectionNote, StatCard } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';

export function IntervalsSection({ state }: { state: StatsUiState }) {
  return (
    <StatCard title="Review Intervals">
      <SectionNote text="Distribution of current review intervals" />
      <View style={{ height: 8 }} />
      <BarChart data={state.intervalBuckets} barColor={ColorMature} />
    </StatCard>
  );
}
