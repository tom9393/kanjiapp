// Ported from stats/view/StatsScreen.kt — the scrolling statistics dashboard. Each section is a
// card; charts come from src/stats/charts.tsx. The native grade-filter dropdown is rendered here
// as a segmented control (the idiomatic RN equivalent), with grade chips when "Grade" is active.
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarChart, CalendarHeatmap, DowHourHeatmap, StackedBarChart } from '@/stats/charts';
import {
  HardCard,
  RetentionData,
  StatsFilter,
  StatsUiState,
  retentionRate,
  useStatsStore,
} from '@/state/statsStore';
import { usePalette, withAlpha } from '@/ui/theme';

const ColorUnseen = '#9E9E9E';
const ColorLearning = '#FF9800';
const ColorYoung = '#2196F3';
const ColorMature = '#4CAF50';
const ColorRelearning = '#F44336';
const ColorEase = '#9575CD'; // substitute for MaterialTheme tertiary (the RN palette has none)

export default function StatsScreen() {
  const p = usePalette();
  const state = useStatsStore((s) => s.state);
  const setFilter = useStatsStore((s) => s.setFilter);
  const setReviewRange = useStatsStore((s) => s.setReviewRange);
  const setFutureDayRange = useStatsStore((s) => s.setFutureDayRange);

  useFocusEffect(
    useCallback(() => {
      useStatsStore.getState().init();
    }, []),
  );

  if (state.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={{ paddingBottom: 24 }}>
      <FilterRow filter={state.filter} onSetFilter={setFilter} />
      <ProgressSection state={state} />
      <TodaySection state={state} />
      <ReviewsSection state={state} onSetRange={setReviewRange} />
      <CardCountsSection state={state} />
      <RetentionSection state={state} />
      <FutureDueSection state={state} onSetRange={setFutureDayRange} />
      <CalendarSection state={state} />
      <MaturityTimelineSection state={state} />
      <IntervalsSection state={state} />
      <RetentionByIntervalSection state={state} />
      <EaseSection state={state} />
      <HourlySection state={state} />
      <StudyPatternSection state={state} />
      <HardestCardsSection state={state} />
    </ScrollView>
  );
}

// === Shared UI ===============================================================

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: p.surfaceVariant }]}>
      <Text style={[styles.cardTitle, { color: p.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: p.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: p.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Divider() {
  const p = usePalette();
  return <View style={[styles.divider, { backgroundColor: p.border }]} />;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? p.primary : 'transparent', borderColor: selected ? p.primary : p.border },
      ]}
    >
      <Text style={{ color: selected ? p.onPrimary : p.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  const p = usePalette();
  return (
    <View style={styles.legendRow}>
      {items.map(([label, color]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: color }]} />
          <Text style={{ fontSize: 10, color: p.textSecondary }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionNote({ text }: { text: string }) {
  const p = usePalette();
  return <Text style={[styles.note, { color: p.textSecondary }]}>{text}</Text>;
}

// === Filter ==================================================================

function FilterRow({ filter, onSetFilter }: { filter: StatsFilter; onSetFilter: (f: StatsFilter) => void }) {
  return (
    <View style={styles.filterRow}>
      <View style={styles.segmentRow}>
        <Segment label="All" active={filter.kind === 'all'} onPress={() => onSetFilter({ kind: 'all' })} />
        <Segment
          label="Grade"
          active={filter.kind === 'grade'}
          onPress={() => onSetFilter({ kind: 'grade', grade: filter.kind === 'grade' ? filter.grade : 1 })}
        />
      </View>
      {filter.kind === 'grade' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {[1, 2, 3, 4, 5, 6].map((grade) => (
            <Chip
              key={grade}
              label={`Grade ${grade}`}
              selected={filter.grade === grade}
              onPress={() => onSetFilter({ kind: 'grade', grade })}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segment, { borderColor: p.border, backgroundColor: active ? p.primary : 'transparent' }]}
    >
      <Text style={{ color: active ? p.onPrimary : p.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

// === Progress ================================================================

function ProgressSection({ state }: { state: StatsUiState }) {
  if (state.gradeProgress.length === 0) return null;
  return (
    <StatCard title="Progress">
      {state.gradeProgress.map((tier) => (
        <TierProgressRow key={tier.grade} label={`Grade ${tier.grade}`} total={tier.total} learned={tier.learned} mature={tier.mature} />
      ))}
    </StatCard>
  );
}

function TierProgressRow({ label, total, learned, mature }: { label: string; total: number; learned: number; mature: number }) {
  const p = usePalette();
  const learnedFraction = total > 0 ? learned / total : 0;
  const matureFraction = total > 0 ? mature / total : 0;
  const learnedPct = total > 0 ? Math.floor((learned * 100) / total) : 0;

  return (
    <View>
      <View style={{ paddingVertical: 4 }}>
        <View style={styles.spaceBetween}>
          <Text style={[styles.bodySmall, { color: p.text, fontWeight: '500' }]}>{label}</Text>
          <Text style={[styles.bodySmall, { color: p.textSecondary }]}>{`${learned}/${total} (${learnedPct}%)`}</Text>
        </View>
        <View style={{ height: 4 }} />
        <View style={[styles.tierTrack, { backgroundColor: withAlpha(p.text, 0.12) }]}>
          <View style={[styles.tierFill, { width: `${learnedFraction * 100}%`, backgroundColor: withAlpha(ColorYoung, 0.5) }]} />
          <View style={[styles.tierFill, { width: `${matureFraction * 100}%`, backgroundColor: ColorMature }]} />
        </View>
        {mature > 0 && <Text style={[styles.statLabel, { color: p.textSecondary, marginTop: 2 }]}>{`${mature} mature`}</Text>}
      </View>
      <Divider />
    </View>
  );
}

// === Today ===================================================================

function TodaySection({ state }: { state: StatsUiState }) {
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
      <View style={styles.spaceBetween}>
        <TodaySmall text={`Streak: ${state.currentStreak} day${state.currentStreak !== 1 ? 's' : ''}`} />
        <TodaySmall text={`Total reviews: ${state.totalReviews}`} />
      </View>
    </StatCard>
  );
}

function TodaySmall({ text }: { text: string }) {
  const p = usePalette();
  return <Text style={[styles.bodySmall, { color: p.text }]}>{text}</Text>;
}

function RetentionLine({ label, correct, total }: { label: string; correct: number; total: number }) {
  const p = usePalette();
  const pct = Math.round((correct / total) * 100);
  return (
    <View style={[styles.spaceBetween, { paddingVertical: 2 }]}>
      <Text style={[styles.bodySmall, { color: p.text }]}>{`${label}: ${correct}/${total} correct`}</Text>
      <Text style={[styles.bodySmall, { color: p.text, fontWeight: '700' }]}>{`${pct}%`}</Text>
    </View>
  );
}

// === Card Counts =============================================================

function CardCountsSection({ state }: { state: StatsUiState }) {
  const p = usePalette();
  const all: [string, number, string][] = [
    ['Unseen', state.unseenCount, ColorUnseen],
    ['Learning', state.learningCount, ColorLearning],
    ['Young', state.youngCount, ColorYoung],
    ['Mature', state.matureCount, ColorMature],
    ['Relearn', state.relearningCount, ColorRelearning],
  ];
  const present = all.filter((c) => c[1] > 0);

  return (
    <StatCard title="Card Counts">
      {state.totalCount > 0 ? (
        <>
          {present.length > 0 && (
            <>
              <View style={styles.countBar}>
                {present.map(([label, count, color]) => (
                  <View key={label} style={{ flex: count, backgroundColor: color }} />
                ))}
              </View>
              <View style={{ height: 10 }} />
            </>
          )}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.countLegend}>
            {all.map(([label, count, color]) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: color }]} />
                <Text style={{ fontSize: 10, textAlign: 'center', color: p.textSecondary }}>{`${label}\n${count}`}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <Text style={{ color: p.textSecondary, fontSize: 14 }}>No characters in this filter</Text>
      )}
    </StatCard>
  );
}

// === Retention ===============================================================

function RetentionHeader({ first }: { first: string }) {
  const p = usePalette();
  const cell = (text: string, flex: number, end = true) => (
    <Text style={[styles.tableHead, { color: p.text, flex }, end && styles.alignEnd]}>{text}</Text>
  );
  return (
    <View style={styles.row}>
      <Text style={[styles.tableHead, { color: p.text, flex: 2 }]}>{first}</Text>
      {cell('Correct', 1.5)}
      {cell('Total', 1)}
      {cell('Rate', 1)}
    </View>
  );
}

function RetentionRow({ period, data }: { period: string; data: RetentionData }) {
  const p = usePalette();
  const rateText = data.total === 0 ? '—' : `${Math.round(retentionRate(data) * 100)}%`;
  return (
    <View style={[styles.row, { paddingVertical: 3, alignItems: 'center' }]}>
      <Text style={[styles.bodySmall, { color: p.text, flex: 2 }]}>{period}</Text>
      <Text style={[styles.bodySmall, styles.alignEnd, { color: p.text, flex: 1.5 }]}>{String(data.correct)}</Text>
      <Text style={[styles.bodySmall, styles.alignEnd, { color: p.text, flex: 1 }]}>{String(data.total)}</Text>
      <Text style={[styles.bodySmall, styles.alignEnd, { color: p.text, flex: 1, fontWeight: '500' }]}>{rateText}</Text>
    </View>
  );
}

function RetentionSection({ state }: { state: StatsUiState }) {
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

// === Future Due ==============================================================

function FutureDueSection({ state, onSetRange }: { state: StatsUiState; onSetRange: (days: number) => void }) {
  const step = state.futureDayRange === 7 ? 1 : state.futureDayRange === 14 ? 2 : state.futureDayRange === 30 ? 5 : 15;
  const labels = state.futureDue.map((_, i) => (i % step === 0 ? (i === 0 ? 'Today' : `+${i}d`) : ''));
  return (
    <StatCard title="Future Due">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
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

// === Study Activity (calendar) ===============================================

function CalendarSection({ state }: { state: StatsUiState }) {
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

// === Maturity Timeline =======================================================

function MaturityTimelineSection({ state }: { state: StatsUiState }) {
  if (state.maturityTimeline.every((t) => t[1] === 0)) return null;
  return (
    <StatCard title="Maturity Timeline">
      <SectionNote text="Cards first reaching review state per week (last 26 weeks)" />
      <View style={{ height: 8 }} />
      <BarChart data={state.maturityTimeline} barColor={ColorMature} />
    </StatCard>
  );
}

// === Intervals ===============================================================

function IntervalsSection({ state }: { state: StatsUiState }) {
  return (
    <StatCard title="Review Intervals">
      <SectionNote text="Distribution of current review intervals" />
      <View style={{ height: 8 }} />
      <BarChart data={state.intervalBuckets} barColor={ColorMature} />
    </StatCard>
  );
}

// === Retention by Interval ===================================================

function RetentionByIntervalSection({ state }: { state: StatsUiState }) {
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

// === Ease ====================================================================

function EaseSection({ state }: { state: StatsUiState }) {
  return (
    <StatCard title="Card Ease">
      <SectionNote text="Ease factor distribution across review and relearning cards" />
      <View style={{ height: 8 }} />
      <BarChart data={state.easeBuckets} barColor={ColorEase} />
    </StatCard>
  );
}

// === Hourly ==================================================================

function HourlySection({ state }: { state: StatsUiState }) {
  const data = state.hourlyData.map((count, hour) => [hour % 6 === 0 ? `${hour}h` : '', count] as [string, number]);
  return (
    <StatCard title="Activity by Hour">
      <SectionNote text="Reviews by hour of day" />
      <View style={{ height: 8 }} />
      <BarChart data={data} barColor={ColorYoung} />
    </StatCard>
  );
}

// === Study Pattern ===========================================================

function StudyPatternSection({ state }: { state: StatsUiState }) {
  if (state.dowHourlyData.every((row) => row.every((c) => c === 0))) return null;
  return (
    <StatCard title="Study Pattern">
      <SectionNote text="Reviews by day of week and hour" />
      <View style={{ height: 8 }} />
      <DowHourHeatmap data={state.dowHourlyData} />
    </StatCard>
  );
}

// === Reviews =================================================================

function ReviewsSection({ state, onSetRange }: { state: StatsUiState; onSetRange: (days: number) => void }) {
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
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
    <View style={[styles.spaceBetween, { paddingVertical: 2 }]}>
      <Text style={[styles.bodySmall, { color: p.textSecondary }]}>{label}</Text>
      <Text style={[styles.bodySmall, { color: p.text, fontWeight: '500' }]}>{value}</Text>
    </View>
  );
}

// === Hardest Cards ===========================================================

function HardestCardsSection({ state }: { state: StatsUiState }) {
  const router = useRouter();
  if (state.hardestCards.length === 0) return null;
  return (
    <StatCard title="Hardest Characters">
      <SectionNote text="Cards with the most lapses" />
      <View style={{ height: 8 }} />
      {state.hardestCards.map((card) => (
        <HardCardRow
          key={card.character}
          card={card}
          onPress={() => router.push({ pathname: '/kanji/[character]', params: { character: card.character } })}
        />
      ))}
    </StatCard>
  );
}

function HardCardRow({ card, onPress }: { card: HardCard; onPress: () => void }) {
  const p = usePalette();
  return (
    <View>
      <Pressable onPress={onPress} style={styles.hardRow}>
        <Text style={[styles.hardGlyph, { color: p.text }]}>{card.character}</Text>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 14, color: p.text }}>{`${card.lapses} lapse${card.lapses !== 1 ? 's' : ''}`}</Text>
          <Text style={[styles.bodySmall, { color: p.textSecondary }]}>{`Ease: ${Math.floor(card.factor / 10)}%`}</Text>
        </View>
        <Text style={{ color: p.textSecondary, fontSize: 18 }}>›</Text>
      </Pressable>
      <Divider />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 12, marginHorizontal: 16, marginVertical: 6, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11 },
  bodySmall: { fontSize: 13 },
  note: { fontSize: 13 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  spaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  spaceEvenly: { flexDirection: 'row', justifyContent: 'space-evenly' },
  alignEnd: { textAlign: 'right' },
  tableHead: { fontSize: 12, fontWeight: '600' },
  filterRow: { paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1, borderRadius: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  chipRow: { gap: 8 },
  tierTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  tierFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  countBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' },
  countLegend: { gap: 12 },
  legendRow: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
  calendarLegend: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calendarLegendSwatch: { width: 12, height: 12, borderRadius: 2 },
  hardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  hardGlyph: { fontSize: 28, width: 48, textAlign: 'center' },
});
