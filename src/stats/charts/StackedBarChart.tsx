// Stacked bar chart (learning/young/mature) with a cumulative-total overlay line. Ported
// from stats/view/StatsCharts.kt.
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { ceilToStep, makeTicks, niceStep } from '@/stats/charts/scale';
import { FutureDueEntry, entryTotal } from '@/stats/statsModels';
import { usePalette, withAlpha } from '@/ui/theme';
import { NoData } from '@/stats/charts/NoData';

const STACKED_HEIGHT = 180;

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
