// Simple vertical bar chart, drawn with react-native-svg (replacing Compose Canvas +
// nativeCanvas text). Ported from stats/view/StatsCharts.kt.
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { ceilToStep, makeTicks, niceStep } from '@/stats/charts/scale';
import { usePalette } from '@/ui/theme';
import { NoData } from '@/stats/charts/NoData';

const BAR_HEIGHT = 148;

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
