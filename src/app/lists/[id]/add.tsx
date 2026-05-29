// Add-kanji picker for a single list. Same query syntax as /search/kanji; each result
// row is a toggle that adds or removes the kanji from this list.
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { getAllKanjiWithSrs } from '@/data/repository/kanji';
import {
  addKanjiToList,
  getList,
  getListMemberCharacters,
  KanjiList,
  removeKanjiFromList,
} from '@/data/repository/lists';
import { byFrequency, KanjiWithSrs } from '@/data/types';
import { matchesKanji, parseQuery } from '@/domain/search';
import { usePalette } from '@/ui/theme';

export default function AddToList() {
  const params = useLocalSearchParams<{ id: string }>();
  const listId = Number(params.id);
  const p = usePalette();

  const [query, setQuery] = useState('');
  const [all, setAll] = useState<KanjiWithSrs[]>([]);
  const [members, setMembers] = useState<Set<string>>(new Set());
  const [list, setList] = useState<KanjiList | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getAllKanjiWithSrs(), getListMemberCharacters(listId), getList(listId)]).then(
      ([k, m, l]) => {
        if (!active) return;
        k.sort(byFrequency);
        setAll(k);
        setMembers(m);
        setList(l);
      },
    );
    return () => {
      active = false;
    };
  }, [listId]);

  const results = useMemo(() => {
    const q = parseQuery(query);
    if (!q) return [];
    return all.filter((c) => matchesKanji(c.kanji, q)).slice(0, 200);
  }, [query, all]);

  const toggle = async (character: string) => {
    const isMember = members.has(character);
    const next = new Set(members);
    if (isMember) {
      next.delete(character);
      await removeKanjiFromList(listId, character);
    } else {
      next.add(character);
      await addKanjiToList(listId, character);
    }
    setMembers(next);
  };

  return (
    <View style={[styles.fill, { backgroundColor: p.background }]}>
      <View style={styles.searchBar}>
        {list && (
          <Text style={[styles.subheader, { color: p.textSecondary }]}>
            {`Adding to "${list.name}" · ${members.size} kanji`}
          </Text>
        )}
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
          Search by reading, meaning, or character. Tap a result to add or remove it.
        </Text>
      ) : results.length === 0 ? (
        <Text style={[styles.note, { color: p.textSecondary }]}>No matching kanji.</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.kanji.character}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const checked = members.has(item.kanji.character);
            return (
              <Pressable
                onPress={() => toggle(item.kanji.character)}
                style={({ pressed }) => [
                  styles.row,
                  { borderColor: p.border, backgroundColor: checked ? p.surfaceVariant : 'transparent' },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.glyph, { color: p.text }]}>{item.kanji.character}</Text>
                <Text style={[styles.meaning, { color: p.textSecondary }]} numberOfLines={1}>
                  {item.kanji.meanings}
                </Text>
                <Text style={[styles.check, { color: checked ? p.primary : p.textSecondary }]}>
                  {checked ? '✓' : '+'}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  searchBar: { padding: 8 },
  subheader: { fontSize: 12, paddingHorizontal: 4, paddingBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16 },
  note: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24, paddingTop: 24 },
  list: { paddingHorizontal: 8, paddingBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  glyph: { fontSize: 28, fontWeight: '700', width: 40, textAlign: 'center' },
  meaning: { flex: 1, fontSize: 14 },
  check: { fontSize: 22, fontWeight: '700', width: 28, textAlign: 'center' },
});
