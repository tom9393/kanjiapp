// Stacked bar of cards becoming due over the next N days, with a range selector.
// Ported from StatsScreen.kt.
import { ScrollView, View } from 'react-native';
import { StackedBarChart } from '@/stats/charts/StackedBarChart';
import { ColorLearning, ColorMature, ColorYoung } from '@/stats/colors';
import { Chip, Legend, StatCard, shared } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';

export function FutureDueSection({ state, onSetRange }: { state: StatsUiState; onSetRange: (days: number) => void }) {
  const step = state.futureDayRange === 7 ? 1 : state.futureDayRange === 14 ? 2 : state.futureDayRange === 30 ? 5 : 15;
  const labels = state.futureDue.map((_, i) => (i % step === 0 ? (i === 0 ? 'Today' : `+${i}d`) : ''));
  return (
    <StatCard title="Future Due">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={shared.chipRow}>
        {[7, 14, 30, 90].map((days) => (
          <Chip key={days} label={`${days}d`} selected={state.futureDayRange === days} onPress={() => onSetRange(days)} />
        ))}
      </ScrollView>
      <View style={{ height: 4 }} />
      <Legend items={[['Mature', ColorMature], ['Young', ColorYoung], ['Learning', ColorLearning]]} />
      <View style={{ height: 8 }} />
      <StackedBarChart
        data={state.futureDue}
        labels={labels}
        colorYoung={ColorYoung}
        colorMature={ColorMature}
        colorLearning={ColorLearning}
      />
    </StatCard>
  );
}
