// Ported from kanji/view/KanjiScreen.kt — Grade + Radical browse with SRS-colored chips.
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { KanjiWithSrs, srsOf } from '@/data/types';
import { GRADE_TABS, useBrowseStore } from '@/state/kanjiBrowseStore';
import { cardStateColors, usePalette } from '@/ui/theme';

const CHIP = 60;
const GAP = 6;

export default function KanjiBrowse() {
  const router = useRouter();
  const p = usePalette();
  const mode = useBrowseStore((s) => s.mode);
  const selectedGrade = useBrowseStore((s) => s.selectedGrade);
  const selectedRadical = useBrowseStore((s) => s.selectedRadical);
  const kanji = useBrowseStore((s) => s.kanji);
  const loading = useBrowseStore((s) => s.loading);
  const selectMode = useBrowseStore((s) => s.selectMode);
  const selectGrade = useBrowseStore((s) => s.selectGrade);
  const clearRadical = useBrowseStore((s) => s.clearRadical);

  useEffect(() => {
    useBrowseStore.getState().init();
  }, []);

  const openKanji = (character: string) => router.push({ pathname: '/kanji/[character]', params: { character } });

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <View style={styles.segmentRow}>
        <Segment label="Grade" active={mode === 'grade'} onPress={() => selectMode('grade')} />
        <Segment label="Radical" active={mode === 'radical'} onPress={() => selectMode('radical')} />
      </View>

      {mode === 'grade' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={styles.tabRowContent}>
            {GRADE_TABS.map((tab) => (
              <Pressable key={tab.value} onPress={() => selectGrade(tab.value)} style={styles.tab}>
                <Text
                  style={[
                    styles.tabLabel,
                    { color: selectedGrade === tab.value ? p.primary : p.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <KanjiGrid kanji={kanji} loading={loading} onPress={openKanji} />
        </>
      ) : selectedRadical == null ? (
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

function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segment,
        { borderColor: p.border, backgroundColor: active ? p.primary : 'transparent' },
      ]}
    >
      <Text style={{ color: active ? p.onPrimary : p.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function KanjiGrid({
  kanji,
  loading,
  onPress,
}: {
  kanji: KanjiWithSrs[];
  loading: boolean;
  onPress: (character: string) => void;
}) {
  const { width } = useWindowDimensions();
  const available = width - GAP * 2; // content padding sits on both edges
  const numColumns = Math.max(1, Math.floor((available + GAP) / (CHIP + GAP)));
  const size = Math.floor((available - GAP * (numColumns - 1)) / numColumns);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      key={numColumns}
      data={kanji}
      keyExtractor={(item) => item.kanji.character}
      numColumns={numColumns}
      contentContainerStyle={{ padding: GAP }}
      columnWrapperStyle={numColumns > 1 ? { gap: GAP } : undefined}
      ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
      renderItem={({ item }) => <KanjiChip card={item} size={size} onPress={() => onPress(item.kanji.character)} />}
    />
  );
}

function KanjiChip({ card, size, onPress }: { card: KanjiWithSrs; size: number; onPress: () => void }) {
  const bg = cardStateColors[srsOf(card).type];
  return (
    <Pressable onPress={onPress} style={[styles.chip, { width: size, height: size, backgroundColor: bg }]}>
      <Text style={styles.chipGlyph}>{card.kanji.character}</Text>
    </Pressable>
  );
}

function RadicalPicker() {
  const p = usePalette();
  const radicals = useBrowseStore((s) => s.radicals);
  const selectRadical = useBrowseStore((s) => s.selectRadical);

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
  segmentRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1, borderRadius: 10 },
  tabRow: { flexGrow: 0, height: 44 },
  tabRowContent: { paddingHorizontal: 8, alignItems: 'center' },
  tab: { paddingHorizontal: 12, paddingVertical: 10 },
  tabLabel: { fontSize: 14, fontWeight: '600' },
  chip: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chipGlyph: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  radicalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, gap: 8 },
  back: { fontSize: 15 },
  radicalGlyph: { fontSize: 26, fontWeight: '700' },
  groupLabel: { fontSize: 13, paddingTop: 8, paddingBottom: 2, paddingHorizontal: 4 },
  radicalWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  radicalChip: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  radicalChipGlyph: { fontSize: 22, fontWeight: '700' },
  radicalCount: { fontSize: 9 },
});
