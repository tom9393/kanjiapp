// Ported from kanji/view/KanjiScreen.kt — radical browse, split into its own stack screen.
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useRadicalBrowseStore } from '@/state/radicalBrowseStore';
import { KanjiGrid } from '@/ui/KanjiGrid';
import { usePalette } from '@/ui/theme';

export default function RadicalBrowse() {
  const router = useRouter();
  const p = usePalette();
  const selectedRadical = useRadicalBrowseStore((s) => s.selectedRadical);
  const kanji = useRadicalBrowseStore((s) => s.kanji);
  const loading = useRadicalBrowseStore((s) => s.loading);
  const clearRadical = useRadicalBrowseStore((s) => s.clearRadical);

  useEffect(() => {
    useRadicalBrowseStore.getState().init();
  }, []);

  const openKanji = (character: string) => router.push({ pathname: '/kanji/[character]', params: { character } });

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      {selectedRadical == null ? (
        <RadicalPicker />
      ) : (
        <>
          <View style={styles.radicalHeader}>
            <Pressable onPress={clearRadical}>
              <Text style={[styles.back, { color: p.primary }]}>← Back</Text>
            </Pressable>
            <Text style={[styles.radicalGlyph, { color: p.text }]}>{selectedRadical}</Text>
          </View>
          <KanjiGrid kanji={kanji} loading={loading} onPress={openKanji} />
        </>
      )}
    </View>
  );
}

function RadicalPicker() {
  const p = usePalette();
  const radicals = useRadicalBrowseStore((s) => s.radicals);
  const selectRadical = useRadicalBrowseStore((s) => s.selectRadical);

  if (!radicals) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const groups = new Map<number, typeof radicals>();
  for (const r of radicals) {
    const list = groups.get(r.s) ?? [];
    list.push(r);
    groups.set(r.s, list);
  }
  const sortedStrokes = [...groups.keys()].sort((a, b) => a - b);

  return (
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
                onPress={() => selectRadical(entry.r)}
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
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  radicalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, gap: 8 },
  back: { fontSize: 15 },
  radicalGlyph: { fontSize: 26, fontWeight: '700' },
  groupLabel: { fontSize: 13, paddingTop: 8, paddingBottom: 2, paddingHorizontal: 4 },
  radicalWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  radicalChip: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  radicalChipGlyph: { fontSize: 22, fontWeight: '700' },
  radicalCount: { fontSize: 9 },
});
