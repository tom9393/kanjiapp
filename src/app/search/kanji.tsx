// Kanji search: find kanji by on/kun reading, English meaning, or the character itself.
// Latin input is matched as a reading (mizu, sui) or meaning (water); Japanese input matches
// readings/character directly. The full kanji set is loaded once and filtered in memory.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { getAllKanjiWithSrs } from '@/data/repository/kanji';
import { getSuspendedCharacters } from '@/data/repository/flags';
import { frequencyRank, KanjiWithSrs } from '@/data/types';
import { matchesKanji, parseQuery } from '@/domain/search';
import { Prefs } from '@/settings/preferences';
import { KanjiGrid } from '@/ui/KanjiGrid';
import { KanjiList } from '@/ui/KanjiList';
import { useKanjiView, ViewModeToggle } from '@/ui/ViewModeToggle';
import { usePalette } from '@/ui/theme';

export default function KanjiSearch() {
  const router = useRouter();
  const p = usePalette();
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<KanjiWithSrs[]>([]);
  const [suspended, setSuspended] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useKanjiView(Prefs.kanjiSearchView);

  useEffect(() => {
    let active = true;
    Promise.all([getAllKanjiWithSrs(), getSuspendedCharacters()]).then(([k, s]) => {
      if (!active) return;
      k.sort((a, b) => frequencyRank(a.kanji) - frequencyRank(b.kanji)); // most common first
      setAll(k);
      setSuspended(s);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const results = useMemo(() => {
    const q = parseQuery(query);
    if (!q) return [];
    return all.filter((c) => matchesKanji(c.kanji, q));
  }, [query, all]);

  const openKanji = (character: string) => router.push({ pathname: '/kanji/[character]', params: { character } });
  const Results = view === 'grid' ? KanjiGrid : KanjiList;

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="kun, on, meaning, or kanji — e.g. mizu, すい, water"
          placeholderTextColor={p.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: p.text, borderColor: p.border, backgroundColor: p.card }]}
        />
        <ViewModeToggle mode={view} onChange={setView} />
      </View>
      {query.trim() === '' ? (
        <View style={styles.hint}>
          <Ionicons name="search-outline" size={48} color={p.textSecondary} style={styles.hintIcon} />
          <Text style={[styles.note, { color: p.textSecondary, paddingTop: 0 }]}>
            Search by reading, meaning, or character. Latin and Japanese both work.
          </Text>
        </View>
      ) : results.length === 0 && !loading ? (
        <Text style={[styles.note, { color: p.textSecondary }]}>No matching kanji.</Text>
      ) : (
        <Results kanji={results} loading={loading} onPress={openKanji} suspended={suspended} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  hint: { alignItems: 'center', paddingTop: 32 },
  hintIcon: { marginBottom: 12, opacity: 0.5 },
  note: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24, paddingTop: 24 },
});
