// Cards first reaching review state per week, last 26 weeks. Ported from StatsScreen.kt.
import { View } from 'react-native';
import { BarChart } from '@/stats/charts/BarChart';
import { ColorMature } from '@/stats/colors';
import { SectionNote, StatCard } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';

export function MaturityTimelineSection({ state }: { state: StatsUiState }) {
  if (state.maturityTimeline.every((t) => t[1] === 0)) return null;
  return (
    <StatCard title="Maturity Timeline">
      <SectionNote text="Cards first reaching review state per week (last 26 weeks)" />
      <View style={{ height: 8 }} />
      <BarChart data={state.maturityTimeline} barColor={ColorMature} />
    </StatCard>
  );
}
