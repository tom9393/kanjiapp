// Radical picker: select multiple radicals to find kanji containing all of them.
// Ported from kanji/view/KanjiScreen.kt's radical grid, extended with multi-select search.
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radicals, RadicalEntry } from '@/data/radicals';
import { getKanjiWithSrsByCharacters } from '@/data/repository/kanji';
import { KanjiWithSrs, srsOf } from '@/data/types';
import { cardStateColors, usePalette } from '@/ui/theme';

const TOP_N = 24; // results shown before the user expands the box

export default function RadicalBrowse() {
  const router = useRouter();
  const p = usePalette();

  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<KanjiWithSrs[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [hideUnavailable, setHideUnavailable] = useState(false);

  const groups = useMemo(() => {
    const m = new Map<number, RadicalEntry[]>();
    for (const r of radicals) {
      const list = m.get(r.s) ?? [];
      list.push(r);
      m.set(r.s, list);
    }
    return m;
  }, []);
  const sortedStrokes = useMemo(() => [...groups.keys()].sort((a, b) => a - b), [groups]);

  // Kanji that contain every selected radical (intersection of their kanji lists).
  const matchChars = useMemo(() => {
    if (selected.length === 0) return [];
    const lists = selected.map((r) => radicals.find((e) => e.r === r)!.k);
    const [first, ...rest] = lists;
    const restSets = rest.map((l) => new Set(l));
    return first.filter((c) => restSets.every((s) => s.has(c)));
  }, [selected]);

  useEffect(() => {
    let active = true;
    (async () => {
      const kanji = await getKanjiWithSrsByCharacters(matchChars);
      kanji.sort((a, b) => a.kanji.frequency - b.kanji.frequency); // most common first
      if (active) {
        setResults(kanji);
        setExpanded(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [matchChars]);

  // Radicals that share at least one kanji with the current match set; null = nothing selected
  // yet, so every radical is still available. Selected radicals always stay available.
  const availableRadicals = useMemo(() => {
    if (selected.length === 0) return null;
    const matchSet = new Set(matchChars);
    return new Set(radicals.filter((e) => e.k.some((c) => matchSet.has(c))).map((e) => e.r));
  }, [selected, matchChars]);

  const isDisabled = (r: string) =>
    availableRadicals !== null && !selected.includes(r) && !availableRadicals.has(r);

  const toggle = (r: string) =>
    setSelected((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  const openKanji = (character: string) =>
    router.push({ pathname: '/kanji/[character]', params: { character } });

  const shown = expanded ? results : results.slice(0, TOP_N);

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <ScrollView contentContainerStyle={{ padding: 8 }}>
        <View style={[styles.resultsBox, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsTitle, { color: p.text }]}>
              {selected.length === 0 ? 'Results' : `${results.length} kanji`}
            </Text>
            {selected.length > 0 && (
              <Pressable onPress={() => setSelected([])} style={[styles.clearBtn, { borderColor: p.border }]}>
                <Text style={[styles.clearLabel, { color: p.textSecondary }]}>Clear</Text>
              </Pressable>
            )}
          </View>

          {selected.length > 0 && (
            <Pressable
              onPress={() => setHideUnavailable((h) => !h)}
              style={[
                styles.toggleBtn,
                { borderColor: p.border, backgroundColor: hideUnavailable ? p.primary : 'transparent' },
              ]}
            >
              <Text style={[styles.toggleLabel, { color: hideUnavailable ? p.onPrimary : p.textSecondary }]}>
                Hide unavailable radicals
              </Text>
            </Pressable>
          )}

          {selected.length === 0 ? (
            <Text style={[styles.note, { color: p.textSecondary }]}>
              Tap radicals below to find kanji that contain all of them.
            </Text>
          ) : results.length === 0 ? (
            <Text style={[styles.note, { color: p.textSecondary }]}>No kanji contain all selected radicals.</Text>
          ) : (
            <>
              <View style={styles.resultsWrap}>
                {shown.map((card) => (
                  <Pressable
                    key={card.kanji.character}
                    onPress={() => openKanji(card.kanji.character)}
                    style={[styles.resultChip, { backgroundColor: cardStateColors[srsOf(card).type] }]}
                  >
                    <Text style={styles.resultChipGlyph}>{card.kanji.character}</Text>
                  </Pressable>
                ))}
              </View>
              {results.length > TOP_N && (
                <Pressable onPress={() => setExpanded((e) => !e)} style={styles.showAll}>
                  <Text style={[styles.showAllLabel, { color: p.primary }]}>
                    {expanded ? 'Show less' : `Show all ${results.length}`}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </View>

        {sortedStrokes.map((strokes) => {
          const entries = hideUnavailable
            ? groups.get(strokes)!.filter((entry) => !isDisabled(entry.r))
            : groups.get(strokes)!;
          if (entries.length === 0) return null;
          return (
            <View key={strokes}>
              <Text style={[styles.groupLabel, { color: p.textSecondary }]}>
                {strokes === 0 ? 'Other' : `${strokes} strokes`}
              </Text>
              <View style={styles.radicalWrap}>
                {entries.map((entry) => {
                  const isSelected = selected.includes(entry.r);
                  const disabled = isDisabled(entry.r);
                  return (
                    <Pressable
                      key={entry.r}
                      onPress={() => toggle(entry.r)}
                      disabled={disabled}
                      style={[
                        styles.radicalChip,
                        { backgroundColor: isSelected ? p.primary : p.surfaceVariant, opacity: disabled ? 0.3 : 1 },
                      ]}
                    >
                      <Text style={[styles.radicalChipGlyph, { color: isSelected ? p.onPrimary : p.text }]}>
                        {entry.r}
                      </Text>
                      <Text style={[styles.radicalCount, { color: isSelected ? p.onPrimary : p.textSecondary }]}>
                        {entry.k.length}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  resultsBox: { borderWidth: 1, borderRadius: 10, padding: 8, marginBottom: 8 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultsTitle: { fontSize: 14, fontWeight: '700' },
  clearBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  clearLabel: { fontSize: 12, fontWeight: '600' },
  toggleBtn: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  toggleLabel: { fontSize: 12, fontWeight: '600' },
  note: { fontSize: 13, paddingTop: 8 },
  resultsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 8 },
  resultChip: { width: 48, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  resultChipGlyph: { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  showAll: { alignSelf: 'center', paddingTop: 10, paddingBottom: 2 },
  showAllLabel: { fontSize: 13, fontWeight: '600' },
  groupLabel: { fontSize: 13, paddingTop: 8, paddingBottom: 2, paddingHorizontal: 4 },
  radicalWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  radicalChip: { width: 52, height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  radicalChipGlyph: { fontSize: 22, fontWeight: '700' },
  radicalCount: { fontSize: 9 },
});
