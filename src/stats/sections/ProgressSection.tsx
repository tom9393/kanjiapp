// Per-grade progress bars (learned + mature), ported from StatsScreen.kt.
import { StyleSheet, Text, View } from 'react-native';
import { ColorMature, ColorYoung } from '@/stats/colors';
import { Divider, StatCard, shared } from '@/stats/primitives';
import { StatsUiState } from '@/stats/statsModels';
import { usePalette, withAlpha } from '@/ui/theme';

export function ProgressSection({ state }: { state: StatsUiState }) {
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
        <View style={shared.spaceBetween}>
          <Text style={[shared.bodySmall, { color: p.text, fontWeight: '500' }]}>{label}</Text>
          <Text style={[shared.bodySmall, { color: p.textSecondary }]}>{`${learned}/${total} (${learnedPct}%)`}</Text>
        </View>
        <View style={{ height: 4 }} />
        <View style={[styles.tierTrack, { backgroundColor: withAlpha(p.text, 0.12) }]}>
          <View style={[styles.tierFill, { width: `${learnedFraction * 100}%`, backgroundColor: withAlpha(ColorYoung, 0.5) }]} />
          <View style={[styles.tierFill, { width: `${matureFraction * 100}%`, backgroundColor: ColorMature }]} />
        </View>
        {mature > 0 && <Text style={[shared.statLabel, { color: p.textSecondary, marginTop: 2 }]}>{`${mature} mature`}</Text>}
      </View>
      <Divider />
    </View>
  );
}

const styles = StyleSheet.create({
  tierTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  tierFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
});
