// Shared building blocks for the stats sections, ported from StatsScreen.kt. These are the
// small repeated pieces (cards, stat boxes, chips, dividers, legends) every section composes
// from; each section component lives in src/stats/sections/. `shared` holds the style
// fragments that several sections reuse so they aren't redefined per file.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePalette } from '@/ui/theme';

export function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={[styles.card, { backgroundColor: p.surfaceVariant }]}>
      <Text style={[styles.cardTitle, { color: p.text }]}>{title}</Text>
      {children}
    </View>
  );
}

export function StatBox({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: p.text }]}>{value}</Text>
      <Text style={[shared.statLabel, { color: p.textSecondary }]}>{label}</Text>
    </View>
  );
}

export function Divider() {
  const p = usePalette();
  return <View style={[styles.divider, { backgroundColor: p.border }]} />;
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
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

export function Legend({ items }: { items: [string, string][] }) {
  const p = usePalette();
  return (
    <View style={styles.legendRow}>
      {items.map(([label, color]) => (
        <View key={label} style={shared.legendItem}>
          <View style={[shared.legendSwatch, { backgroundColor: color }]} />
          <Text style={{ fontSize: 10, color: p.textSecondary }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

export function SectionNote({ text }: { text: string }) {
  const p = usePalette();
  return <Text style={[styles.note, { color: p.textSecondary }]}>{text}</Text>;
}

export function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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

// Style fragments reused by several section files.
export const shared = StyleSheet.create({
  bodySmall: { fontSize: 13 },
  statLabel: { fontSize: 11 },
  spaceBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipRow: { gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 10, height: 10, borderRadius: 2 },
});

const styles = StyleSheet.create({
  card: { borderRadius: 12, marginHorizontal: 16, marginVertical: 6, padding: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  legendRow: { flexDirection: 'row', gap: 12 },
  note: { fontSize: 13 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1, borderRadius: 10 },
});
