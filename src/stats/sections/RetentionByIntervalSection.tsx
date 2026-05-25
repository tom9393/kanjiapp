// Success rate at each current interval bucket. Ported from StatsScreen.kt.
import { View } from 'react-native';
import { Divider, SectionNote, StatCard } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';
import { RetentionHeader, RetentionRow } from '@/stats/sections/RetentionTable';

export function RetentionByIntervalSection({ state }: { state: StatsUiState }) {
  const meaningful = state.retentionByInterval.filter((r) => r[1].total > 0);
  if (meaningful.length === 0) return null;
  return (
    <StatCard title="Retention by Interval">
      <SectionNote text="Success rate at each interval — higher is better for longer intervals" />
      <View style={{ height: 8 }} />
      <RetentionHeader first="Interval" />
      <Divider />
      {meaningful.map(([label, data]) => (
        <RetentionRow key={label} period={label} data={data} />
      ))}
    </StatCard>
  );
}
