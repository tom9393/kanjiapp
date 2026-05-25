// Ported from stats/view/StatsCharts.kt. The two bar charts draw with react-native-svg
// (replacing Compose Canvas + nativeCanvas text); the two heatmaps are plain View grids.
import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { FutureDueEntry, entryTotal } from '@/state/statsStore';
import { usePalette, withAlpha } from '@/ui/theme';

const BAR_HEIGHT = 148;
const STACKED_HEIGHT = 180;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function niceStep(max: number, targetTicks = 5): number {
  if (max <= 0) return 1;
  const rough = max / (targetTicks - 1);
  const magnitude = Math.max(1, Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1)))));
  if (rough / magnitude <= 1.5) return magnitude;
  if (rough / magnitude <= 3.5) return 2 * magnitude;
  if (rough / magnitude <= 7.5) return 5 * magnitude;
  return 10 * magnitude;
}

function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

function makeTicks(yMax: number, step: number): number[] {
  const out: number[] = [];
  for (let v = 0; v <= yMax; v += step) out.push(v);
  return out;
}

function NoData() {
  const p = usePalette();
  return (
    <View style={styles.noData}>
      <Text style={{ color: p.textSecondary, fontSize: 15 }}>No data</Text>
    </View>
  );
}

export function BarChart({ data, barColor }: { data: [string, number][]; barColor: string }) {
  const p = usePalette();
  const [w, setW] = useState(0);

  const maxValue = data.reduce((m, d) => Math.max(m, d[1]), 0);
  if (maxValue === 0) return <NoData />;

  const yStep = niceStep(maxValue);
  const yMax = ceilToStep(maxValue, yStep);
  const yTicks = makeTicks(yMax, yStep);

  const leftAxis = 32;
  const bottom = 16;
  const top = 4;
  const chartLeft = leftAxis;
  const chartTop = top;
  const chartBottom = BAR_HEIGHT - bottom;
  const chartWidth = w - leftAxis;
  const chartHeight = chartBottom - chartTop;
  const barWidth = chartWidth / data.length;
  const gap = Math.min(barWidth * 0.1, 3);

  return (
    <View style={{ height: BAR_HEIGHT }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={BAR_HEIGHT}>
          {yTicks.map((tick, i) => {
            const y = chartBottom - (tick / yMax) * chartHeight;
            return (
              <React.Fragment key={`t${i}`}>
                <Line x1={chartLeft} y1={y} x2={w} y2={y} stroke={p.textSecondary} strokeWidth={0.5} opacity={0.15} />
                <SvgText x={chartLeft - 4} y={y + 3} fontSize={8} fill={p.textSecondary} textAnchor="end">
                  {tick}
                </SvgText>
              </React.Fragment>
            );
          })}
          <Line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={p.textSecondary} strokeWidth={1} opacity={0.4} />
          {data.map(([, value], i) =>
            value > 0 ? (
              <Rect
                key={`b${i}`}
                x={chartLeft + i * barWidth + gap}
                y={chartBottom - (value / yMax) * chartHeight}
                width={Math.max(barWidth - gap * 2, 1)}
                height={(value / yMax) * chartHeight}
                fill={barColor}
              />
            ) : null,
          )}
          {data.map(([label], i) =>
            label ? (
              <SvgText
                key={`l${i}`}
                x={chartLeft + i * barWidth + barWidth / 2}
                y={chartBottom + 12}
                fontSize={8}
                fill={p.textSecondary}
                textAnchor="middle"
              >
                {label}
              </SvgText>
            ) : null,
          )}
        </Svg>
      )}
    </View>
  );
}

export function StackedBarChart({
  data,
  labels,
  colorYoung,
  colorMature,
  colorLearning,
}: {
  data: FutureDueEntry[];
  labels: string[];
  colorYoung: string;
  colorMature: string;
  colorLearning: string;
}) {
  const p = usePalette();
  const [w, setW] = useState(0);

  const maxBarValue = data.reduce((m, e) => Math.max(m, entryTotal(e)), 0);
  if (maxBarValue === 0) return <NoData />;

  const cumulative: number[] = [];
  let run = 0;
  for (const e of data) {
    run += entryTotal(e);
    cumulative.push(run);
  }
  const cumTotal = cumulative.length ? cumulative[cumulative.length - 1] : 0;

  const yStep = niceStep(maxBarValue);
  const yMax = ceilToStep(maxBarValue, yStep);
  const yTicks = makeTicks(yMax, yStep);

  const cumStep = niceStep(cumTotal);
  const cumYMax = ceilToStep(cumTotal, cumStep);
  const cumTicks = makeTicks(cumYMax, cumStep);

  const cumFillColor = withAlpha(p.text, 0.1);
  const cumLineColor = withAlpha(p.text, 0.45);

  const leftAxis = 32;
  const rightAxis = 48;
  const bottom = 16;
  const top = 4;
  const chartLeft = leftAxis;
  const chartRight = w - rightAxis;
  const chartTop = top;
  const chartBottom = STACKED_HEIGHT - bottom;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const barWidth = chartWidth / data.length;
  const gap = Math.min(barWidth * 0.1, 3);
  const labelBarWidth = chartWidth / labels.length;

  const cumPoints = cumulative.map((cv, i) => ({
    x: chartLeft + (i + 1) * barWidth,
    y: chartBottom - (cumYMax > 0 ? (cv / cumYMax) * chartHeight : 0),
  }));
  const fillPath =
    `M ${chartLeft} ${chartBottom}` +
    cumPoints.map((pt) => ` L ${pt.x} ${pt.y}`).join('') +
    ` L ${chartRight} ${chartBottom} Z`;
  const linePath = `M ${chartLeft} ${chartBottom}` + cumPoints.map((pt) => ` L ${pt.x} ${pt.y}`).join('');

  return (
    <View style={{ height: STACKED_HEIGHT }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={STACKED_HEIGHT}>
          {yTicks.map((tick, i) => {
            const y = chartBottom - (tick / yMax) * chartHeight;
            return (
              <React.Fragment key={`t${i}`}>
                <Line x1={chartLeft} y1={y} x2={chartRight} y2={y} stroke={p.textSecondary} strokeWidth={0.5} opacity={0.15} />
                <SvgText x={chartLeft - 4} y={y + 3} fontSize={8} fill={p.textSecondary} textAnchor="end">
                  {tick}
                </SvgText>
              </React.Fragment>
            );
          })}
          {cumTicks.map((tick, i) => {
            const y = chartBottom - (tick / cumYMax) * chartHeight;
            return (
              <SvgText key={`c${i}`} x={chartRight + 4} y={y + 3} fontSize={8} fill={p.textSecondary} textAnchor="start">
                {tick.toLocaleString()}
              </SvgText>
            );
          })}
          <Line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke={p.textSecondary} strokeWidth={1} opacity={0.4} />
          <Line x1={chartRight} y1={chartTop} x2={chartRight} y2={chartBottom} stroke={p.textSecondary} strokeWidth={1} opacity={0.4} />
          {data.map((entry, i) => {
            const x = chartLeft + i * barWidth + gap;
            const bw = Math.max(barWidth - gap * 2, 1);
            const segments: [number, string][] = [
              [entry.learning, colorLearning],
              [entry.young, colorYoung],
              [entry.mature, colorMature],
            ];
            let y = chartBottom;
            return segments.map(([count, color], si) => {
              if (count <= 0) return null;
              const h = (count / yMax) * chartHeight;
              y -= h;
              return <Rect key={`b${i}-${si}`} x={x} y={y} width={bw} height={h} fill={color} />;
            });
          })}
          {cumulative.length > 0 && cumYMax > 0 && (
            <>
              <Path d={fillPath} fill={cumFillColor} />
              <Path d={linePath} fill="none" stroke={cumLineColor} strokeWidth={1.5} />
            </>
          )}
          {labels.map((label, i) =>
            label ? (
              <SvgText
                key={`l${i}`}
                x={chartLeft + i * labelBarWidth + labelBarWidth / 2}
                y={chartBottom + 12}
                fontSize={8}
                fill={p.textSecondary}
                textAnchor="middle"
              >
                {label}
              </SvgText>
            ) : null,
          )}
        </Svg>
      )}
    </View>
  );
}

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

const styles = StyleSheet.create({
  noData: { height: 80, alignItems: 'center', justifyContent: 'center' },
  calendarRow: { flexDirection: 'row' },
  calendarScroll: { flex: 1 },
});
