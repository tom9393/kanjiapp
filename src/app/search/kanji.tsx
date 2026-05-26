// Kanji search: find kanji by on/kun reading, English meaning, or the character itself.
// Latin input is matched as a reading (mizu, sui) or meaning (water); Japanese input matches
// readings/character directly. The full kanji set is loaded once and filtered in memory.
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { getAllKanjiWithSrs } from '@/data/repository/kanji';
import { frequencyRank, KanjiWithSrs } from '@/data/types';
import { matchesKanji, parseQuery } from '@/domain/search';
import { KanjiGrid } from '@/ui/KanjiGrid';
import { usePalette } from '@/ui/theme';

export default function KanjiSearch() {
  const router = useRouter();
  const p = usePalette();
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<KanjiWithSrs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getAllKanjiWithSrs().then((k) => {
      if (!active) return;
      k.sort((a, b) => frequencyRank(a.kanji) - frequencyRank(b.kanji)); // most common first
      setAll(k);
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
      </View>
      {query.trim() === '' ? (
        <Text style={[styles.note, { color: p.textSecondary }]}>
          Search by reading, meaning, or character. Latin and Japanese both work.
        </Text>
      ) : results.length === 0 && !loading ? (
        <Text style={[styles.note, { color: p.textSecondary }]}>No matching kanji.</Text>
      ) : (
        <KanjiGrid kanji={results} loading={loading} onPress={openKanji} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  searchBar: { padding: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  note: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24, paddingTop: 24 },
});
