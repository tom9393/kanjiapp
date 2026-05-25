// Study-activity calendar heatmap with a less→more legend. Ported from StatsScreen.kt.
import { StyleSheet, Text, View } from 'react-native';
import { CalendarHeatmap } from '@/stats/charts/CalendarHeatmap';
import { StatCard } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';
import { usePalette, withAlpha } from '@/ui/theme';

export function CalendarSection({ state }: { state: StatsUiState }) {
  const p = usePalette();
  return (
    <StatCard title="Study Activity">
      <CalendarHeatmap data={state.calendarData} weeks={26} />
      <View style={{ height: 8 }} />
      <View style={styles.calendarLegend}>
        <Text style={{ fontSize: 10, color: p.textSecondary }}>Less</Text>
        {[0, 0.25, 0.5, 0.75, 1].map((alpha) => (
          <View
            key={alpha}
            style={[
              styles.calendarLegendSwatch,
              { backgroundColor: alpha === 0 ? p.surfaceVariant : withAlpha(p.primary, 0.2 + alpha * 0.8) },
            ]}
          />
        ))}
        <Text style={{ fontSize: 10, color: p.textSecondary }}>More</Text>
      </View>
    </StatCard>
  );
}

const styles = StyleSheet.create({
  calendarLegend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calendarLegendSwatch: { width: 12, height: 12, borderRadius: 2 },
});
