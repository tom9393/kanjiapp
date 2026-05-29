// Word search: find words by reading, kanji form, or English meaning. Typing "shin" (→ しん)
// surfaces 進化, 神経, …; Japanese input matches kana/kanji-form directly. Queries hit the
// reference DB (172k words) so they are debounced; tapping a result opens the word detail.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { searchWords } from '@/data/repository/reference';
import { Word } from '@/data/types';
import { Furigana } from '@/ui/Furigana';
import { usePalette } from '@/ui/theme';

export default function WordSearch() {
  const router = useRouter();
  const p = usePalette();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let active = true;
    const handle = setTimeout(async () => {
      const found = await searchWords(query);
      if (active) {
        setResults(found);
        setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [query]);

  const openWord = (id: number) => router.push({ pathname: '/word/[id]', params: { id: String(id) } });

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="reading, kanji, or meaning — e.g. shin, しん, evolution"
          placeholderTextColor={p.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { color: p.text, borderColor: p.border, backgroundColor: p.card }]}
        />
      </View>
      {query.trim() === '' ? (
        <View style={styles.hint}>
          <Ionicons name="search-outline" size={48} color={p.textSecondary} style={styles.hintIcon} />
          <Text style={[styles.note, { color: p.textSecondary, paddingTop: 0 }]}>
            Search words by reading, kanji, or meaning. Latin and Japanese both work.
          </Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : results.length === 0 ? (
        <Text style={[styles.note, { color: p.textSecondary }]}>No matching words.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openWord(item.id)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: p.border, backgroundColor: pressed ? p.surfaceVariant : p.card },
              ]}
            >
              <Furigana form={item.kanjiForm} reading={item.kana} size={20} />
              <Text style={[styles.meaning, { color: p.textSecondary }]} numberOfLines={1}>
                {item.meaning}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchBar: { padding: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  note: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24, paddingTop: 24 },
  hint: { alignItems: 'center', paddingTop: 32 },
  hintIcon: { marginBottom: 12, opacity: 0.5 },
  row: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 6 },
  meaning: { fontSize: 14, paddingTop: 2 },
});
