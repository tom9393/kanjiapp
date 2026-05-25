// Day-of-week × hour activity heatmap — a plain View grid. Ported from
// stats/view/StatsCharts.kt.
import React from 'react';
import { Text, View } from 'react-native';
import { clamp } from '@/stats/charts/scale';
import { usePalette, withAlpha } from '@/ui/theme';

export function DowHourHeatmap({ data }: { data: number[][] }) {
  const p = usePalette();
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const labelWidth = 36;
  const cellHeight = 20;

  let maxCount = 1;
  for (const row of data) for (const c of row) maxCount = Math.max(maxCount, c);
  const gridColor = withAlpha(p.border, 0.15);

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: labelWidth }} />
        <View style={{ flexDirection: 'row', flex: 1 }}>
          {Array.from({ length: 24 }, (_, hour) => (
            <Text key={hour} style={{ flex: 1, textAlign: 'center', fontSize: 7, color: p.textSecondary }}>
              {hour % 6 === 0 ? `${hour}h` : ''}
            </Text>
          ))}
        </View>
      </View>
      <View style={{ height: 2 }} />
      <View style={{ gap: 1 }}>
        {dayLabels.map((label, dow) => (
          <View key={dow} style={{ flexDirection: 'row', alignItems: 'center', height: cellHeight }}>
            <Text style={{ width: labelWidth, fontSize: 8, color: p.textSecondary }}>{label}</Text>
            <View style={{ flexDirection: 'row', flex: 1, height: '100%', backgroundColor: gridColor }}>
              {Array.from({ length: 24 }, (_, hour) => {
                const count = data[dow]?.[hour] ?? 0;
                const color =
                  count === 0 ? p.surfaceVariant : withAlpha(p.primary, clamp(0.2 + (count / maxCount) * 0.8, 0, 1));
                return (
                  <View key={hour} style={{ flex: 1, height: '100%', padding: 1 }}>
                    <View style={{ flex: 1, borderRadius: 1, backgroundColor: color }} />
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
