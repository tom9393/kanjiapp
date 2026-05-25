// Review-history bars with a range selector + period summary stats. Ported from StatsScreen.kt.
import { ScrollView, Text, View } from 'react-native';
import { StackedBarChart } from '@/stats/charts/StackedBarChart';
import { ColorLearning, ColorMature, ColorYoung } from '@/stats/colors';
import { Chip, Divider, Legend, StatCard, shared } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';
import { usePalette } from '@/ui/theme';

export function ReviewsSection({ state, onSetRange }: { state: StatsUiState; onSetRange: (days: number) => void }) {
  if (state.reviewHistory.every((e) => e.young + e.mature + e.learning === 0)) return null;
  const ranges: [number, string][] = [
    [30, '1 month'],
    [90, '3 months'],
    [365, '1 year'],
    [-1, 'All'],
  ];
  const studiedPct =
    state.reviewPeriodDays > 0 ? Math.floor((state.reviewDaysStudied * 100) / (state.reviewPeriodDays + 1)) : 0;
  return (
    <StatCard title="Reviews">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={shared.chipRow}>
        {ranges.map(([days, label]) => (
          <Chip key={days} label={label} selected={state.reviewRange === days} onPress={() => onSetRange(days)} />
        ))}
      </ScrollView>
      <View style={{ height: 4 }} />
      <Legend items={[['Mature', ColorMature], ['Young', ColorYoung], ['Learning', ColorLearning]]} />
      <View style={{ height: 8 }} />
      <StackedBarChart
        data={state.reviewHistory}
        labels={state.reviewHistoryLabels}
        colorYoung={ColorYoung}
        colorMature={ColorMature}
        colorLearning={ColorLearning}
      />
      <View style={{ height: 12 }} />
      <Divider />
      <View style={{ height: 8 }} />
      <ReviewStat label="Days studied" value={`${state.reviewDaysStudied} of ${state.reviewPeriodDays + 1} (${studiedPct}%)`} />
      <ReviewStat label="Total" value={`${state.reviewPeriodTotal.toLocaleString()} reviews`} />
      <ReviewStat label="Average over period" value={`${state.reviewPeriodAvg.toFixed(1)}/day`} />
      <ReviewStat label="Average for days studied" value={`${state.reviewStudiedAvg.toFixed(1)}/day`} />
    </StatCard>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={[shared.spaceBetween, { paddingVertical: 2 }]}>
      <Text style={[shared.bodySmall, { color: p.textSecondary }]}>{label}</Text>
      <Text style={[shared.bodySmall, { color: p.text, fontWeight: '500' }]}>{value}</Text>
    </View>
  );
}
