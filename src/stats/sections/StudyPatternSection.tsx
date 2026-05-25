// Reviews by day-of-week × hour heatmap. Ported from StatsScreen.kt.
import { View } from 'react-native';
import { DowHourHeatmap } from '@/stats/charts/DowHourHeatmap';
import { SectionNote, StatCard } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';

export function StudyPatternSection({ state }: { state: StatsUiState }) {
  if (state.dowHourlyData.every((row) => row.every((c) => c === 0))) return null;
  return (
    <StatCard title="Study Pattern">
      <SectionNote text="Reviews by day of week and hour" />
      <View style={{ height: 8 }} />
      <DowHourHeatmap data={state.dowHourlyData} />
    </StatCard>
  );
}
