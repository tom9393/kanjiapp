// Retention rates by time period (today → all time). Ported from StatsScreen.kt.
import { Divider, StatCard } from '@/stats/primitives';
import { RetentionData, StatsUiState } from '@/stats/statsModels';
import { RetentionHeader, RetentionRow } from '@/stats/sections/RetentionTable';

export function RetentionSection({ state }: { state: StatsUiState }) {
  const rows: [string, RetentionData][] = [
    ['Today', state.retentionToday],
    ['Yesterday', state.retentionYesterday],
    ['Last 7 days', state.retentionWeek],
    ['Last 30 days', state.retentionMonth],
    ['All time', state.retentionAllTime],
  ];
  return (
    <StatCard title="Retention">
      <RetentionHeader first="Period" />
      <Divider />
      {rows.map(([period, data]) => (
        <RetentionRow key={period} period={period} data={data} />
      ))}
    </StatCard>
  );
}
