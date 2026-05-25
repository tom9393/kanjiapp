// Shared axis math for the bar charts, ported from stats/view/StatsCharts.kt. Picks "nice"
// round tick steps and clamps values to a range.

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function niceStep(max: number, targetTicks = 5): number {
  if (max <= 0) return 1;
  const rough = max / (targetTicks - 1);
  const magnitude = Math.max(1, Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1)))));
  if (rough / magnitude <= 1.5) return magnitude;
  if (rough / magnitude <= 3.5) return 2 * magnitude;
  if (rough / magnitude <= 7.5) return 5 * magnitude;
  return 10 * magnitude;
}

export function ceilToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function makeTicks(yMax: number, step: number): number[] {
  const out: number[] = [];
  for (let v = 0; v <= yMax; v += step) out.push(v);
  return out;
}
