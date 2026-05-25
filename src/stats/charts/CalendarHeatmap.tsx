// GitHub-style contribution calendar — a plain View grid (replacing the native canvas).
// Ported from stats/view/StatsCharts.kt. Scrolls to the latest week on layout.
import React, { useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { clamp } from '@/stats/charts/scale';
import { usePalette, withAlpha } from '@/ui/theme';

export function CalendarHeatmap({ data, weeks = 26 }: { data: Map<number, number>; weeks?: number }) {
  const p = usePalette();
  const scrollRef = useRef<ScrollView>(null);

  const zoneOffsetSecs = -new Date().getTimezoneOffset() * 60;
  const todayEpochDay = Math.floor((Math.floor(Date.now() / 1000) + zoneOffsetSecs) / 86400);
  const cell = 16;
  const pad = 2;

  const monthsAgo = todayEpochDay - weeks * 7;
  const firstMonday = monthsAgo - ((monthsAgo + 3) % 7);
  const totalWeeks = Math.floor((todayEpochDay - firstMonday) / 7) + 1;

  let maxCount = 1;
  for (const c of data.values()) maxCount = Math.max(maxCount, c);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const gridColor = withAlpha(p.border, 0.15);

  return (
    <View style={styles.calendarRow}>
      <View>
        <View style={{ height: cell }} />
        {dayLabels.map((label, i) => (
          <View key={i} style={{ width: cell, height: cell, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 8, color: p.textSecondary }}>{label}</Text>
          </View>
        ))}
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        style={[styles.calendarScroll, { backgroundColor: gridColor }]}
      >
        {Array.from({ length: totalWeeks }, (_, weekIndex) => {
          const weekStart = firstMonday + weekIndex * 7;
          let monthLabel = '';
          for (let d = 0; d < 7; d++) {
            const date = new Date((weekStart + d) * 86_400_000);
            if (date.getUTCDate() === 1) {
              monthLabel = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
              break;
            }
          }
          return (
            <View key={weekIndex}>
              <View style={{ width: cell + pad, height: cell, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 7, color: p.textSecondary }}>{monthLabel}</Text>
              </View>
              {Array.from({ length: 7 }, (_, dayIndex) => {
                const epochDay = weekStart + dayIndex;
                const count = data.get(epochDay) ?? 0;
                const isFuture = epochDay > todayEpochDay;
                const cellColor =
                  isFuture || count === 0
                    ? p.surfaceVariant
                    : withAlpha(p.primary, 0.2 + clamp(count / maxCount, 0, 1) * 0.8);
                return (
                  <View key={dayIndex} style={{ width: cell, height: cell, padding: pad }}>
                    <View style={{ flex: 1, borderRadius: 2, backgroundColor: cellColor }} />
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarRow: { flexDirection: 'row' },
  calendarScroll: { flex: 1 },
});
