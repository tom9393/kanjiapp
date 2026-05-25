// Reviews by hour of day. Ported from StatsScreen.kt.
import { View } from 'react-native';
import { BarChart } from '@/stats/charts/BarChart';
import { ColorYoung } from '@/stats/colors';
import { SectionNote, StatCard } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';

export function HourlySection({ state }: { state: StatsUiState }) {
  const data = state.hourlyData.map((count, hour) => [hour % 6 === 0 ? `${hour}h` : '', count] as [string, number]);
  return (
    <StatCard title="Activity by Hour">
      <SectionNote text="Reviews by hour of day" />
      <View style={{ height: 8 }} />
      <BarChart data={data} barColor={ColorYoung} />
    </StatCard>
  );
}
