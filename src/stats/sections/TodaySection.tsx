// Today's study summary: reviews/new/again, per-type retention, streak + lifetime total.
// Ported from StatsScreen.kt.
import { StyleSheet, Text, View } from 'react-native';
import { Divider, StatBox, StatCard, shared } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';
import { usePalette } from '@/ui/theme';

export function TodaySection({ state }: { state: StatsUiState }) {
  return (
    <StatCard title="Today">
      <View style={styles.spaceEvenly}>
        <StatBox label="Reviews" value={String(state.todayReviews)} />
        <StatBox label="New" value={String(state.todayNew)} />
        <StatBox label="Again" value={String(state.todayAgain)} />
      </View>
      {(state.todayMatureTotal > 0 || state.todayLearningTotal > 0) && (
        <>
          <View style={{ height: 8 }} />
          <Divider />
          <View style={{ height: 8 }} />
          {state.todayMatureTotal > 0 && (
            <RetentionLine label="Review cards" correct={state.todayMatureCorrect} total={state.todayMatureTotal} />
          )}
          {state.todayLearningTotal > 0 && (
            <RetentionLine label="Learning cards" correct={state.todayLearningCorrect} total={state.todayLearningTotal} />
          )}
        </>
      )}
      <View style={{ height: 8 }} />
      <Divider />
      <View style={{ height: 8 }} />
      <View style={shared.spaceBetween}>
        <TodaySmall text={`Streak: ${state.currentStreak} day${state.currentStreak !== 1 ? 's' : ''}`} />
        <TodaySmall text={`Total reviews: ${state.totalReviews}`} />
      </View>
    </StatCard>
  );
}

function TodaySmall({ text }: { text: string }) {
  const p = usePalette();
  return <Text style={[shared.bodySmall, { color: p.text }]}>{text}</Text>;
}

function RetentionLine({ label, correct, total }: { label: string; correct: number; total: number }) {
  const p = usePalette();
  const pct = Math.round((correct / total) * 100);
  return (
    <View style={[shared.spaceBetween, { paddingVertical: 2 }]}>
      <Text style={[shared.bodySmall, { color: p.text }]}>{`${label}: ${correct}/${total} correct`}</Text>
      <Text style={[shared.bodySmall, { color: p.text, fontWeight: '700' }]}>{`${pct}%`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  spaceEvenly: { flexDirection: 'row', justifyContent: 'space-evenly' },
});
