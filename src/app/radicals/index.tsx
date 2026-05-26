// Ported from kanji/view/KanjiScreen.kt — radical picker; tapping a radical pushes its kanji grid.
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radicals, RadicalEntry } from '@/data/radicals';
import { usePalette } from '@/ui/theme';

export default function RadicalBrowse() {
  const router = useRouter();
  const p = usePalette();

  const groups = new Map<number, RadicalEntry[]>();
  for (const r of radicals) {
    const list = groups.get(r.s) ?? [];
    list.push(r);
    groups.set(r.s, list);
  }
  const sortedStrokes = [...groups.keys()].sort((a, b) => a - b);

  const openRadical = (radical: string) =>
    router.push({ pathname: '/radicals/[radical]', params: { radical } });

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <ScrollView contentContainerStyle={{ padding: 8 }}>
        {sortedStrokes.map((strokes) => (
          <View key={strokes}>
            <Text style={[styles.groupLabel, { color: p.textSecondary }]}>
              {strokes === 0 ? 'Other' : `${strokes} strokes`}
            </Text>
            <View style={styles.radicalWrap}>
              {groups.get(strokes)!.map((entry) => (
                <Pressable
                  key={entry.r}
                  onPress={() => openRadical(entry.r)}
                  style={[styles.radicalChip, { backgroundColor: p.surfaceVariant }]}
                >
                  <Text style={[styles.radicalChipGlyph, { color: p.text }]}>{entry.r}</Text>
                  <Text style={[styles.radicalCount, { color: p.textSecondary }]}>{entry.k.length}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  groupLabel: { fontSize: 13, paddingTop: 8, paddingBottom: 2, paddingHorizontal: 4 },
  radicalWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  radicalChip: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  radicalChipGlyph: { fontSize: 22, fontWeight: '700' },
  radicalCount: { fontSize: 9 },
});
