// Ease-factor distribution across review and relearning cards. Ported from StatsScreen.kt.
import { View } from 'react-native';
import { BarChart } from '@/stats/charts/BarChart';
import { ColorEase } from '@/stats/colors';
import { SectionNote, StatCard } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';

export function EaseSection({ state }: { state: StatsUiState }) {
  return (
    <StatCard title="Card Ease">
      <SectionNote text="Ease factor distribution across review and relearning cards" />
      <View style={{ height: 8 }} />
      <BarChart data={state.easeBuckets} barColor={ColorEase} />
    </StatCard>
  );
}
