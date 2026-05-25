// Ported from stats/view/StatsScreen.kt — the scrolling statistics dashboard. Each section is
// its own component in src/stats/sections/; this screen loads the store and lists them.
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { useStatsStore } from '@/state/statsStore';
import { CalendarSection } from '@/stats/sections/CalendarSection';
import { CardCountsSection } from '@/stats/sections/CardCountsSection';
import { EaseSection } from '@/stats/sections/EaseSection';
import { FilterRow } from '@/stats/sections/FilterRow';
import { FutureDueSection } from '@/stats/sections/FutureDueSection';
import { HardestCardsSection } from '@/stats/sections/HardestCardsSection';
import { HourlySection } from '@/stats/sections/HourlySection';
import { IntervalsSection } from '@/stats/sections/IntervalsSection';
import { MaturityTimelineSection } from '@/stats/sections/MaturityTimelineSection';
import { ProgressSection } from '@/stats/sections/ProgressSection';
import { RetentionByIntervalSection } from '@/stats/sections/RetentionByIntervalSection';
import { RetentionSection } from '@/stats/sections/RetentionSection';
import { ReviewsSection } from '@/stats/sections/ReviewsSection';
import { StudyPatternSection } from '@/stats/sections/StudyPatternSection';
import { TodaySection } from '@/stats/sections/TodaySection';
import { usePalette } from '@/ui/theme';

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

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
