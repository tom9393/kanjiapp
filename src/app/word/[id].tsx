// Word detail: the word's form, reading, and meaning; the kanji it uses (each links to its
// own kanji page); and example sentences containing the word. Mirrors the kanji detail screen.
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getKanjiByCharacters } from '@/data/repository/kanji';
import { getSentencesContainingWord, getWordById } from '@/data/repository/reference';
import { Kanji } from '@/data/types';
import { isKanji } from '@/domain/readingFormatter';
import { AddToListButton } from '@/ui/AddToListButton';
import { Furigana } from '@/ui/Furigana';
import { Loading, LoadError, NotFound } from '@/ui/screenStates';
import { SentenceList } from '@/ui/SentenceList';
import { useAsyncResource } from '@/ui/useAsyncResource';
import { useNav } from '@/ui/nav';
import { usePalette } from '@/ui/theme';

export default function WordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const { kanji: openKanji, sentence: openSentence } = useNav();

  const res = useAsyncResource(async () => {
    const word = await getWordById(Number(id));
    if (!word) return null;
    // Distinct kanji in the word, in order of appearance; keep only those we have data for.
    const chars = [...new Set([...word.kanjiForm].filter(isKanji))];
    const found = await getKanjiByCharacters(chars);
    const byChar = new Map(found.map((k) => [k.character, k]));
    const kanji = chars.map((c) => byChar.get(c)).filter((k): k is Kanji => k != null);
    const sentences = await getSentencesContainingWord(word);
    return { word, kanji, sentences };
  }, [id]);

  if (res.status === 'loading') return <Loading />;
  if (res.status === 'error') return <LoadError />;
  if (res.status === 'missing') return <NotFound label="Word not found." />;
  const { word, kanji, sentences } = res.data;

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content}>
      <Furigana form={word.kanjiForm} reading={word.kana} size={56} weight="700" />
      <Text style={[styles.meaning, { color: p.text }]}>{word.meaning}</Text>

      <AddToListButton
        target={{ kind: 'word', id: word.id, label: word.kanjiForm }}
        style={styles.section}
      />

      {kanji.length > 0 && (
        <View style={[styles.card, styles.section, { backgroundColor: p.surfaceVariant }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>Kanji</Text>
          {kanji.map((k) => (
            <Pressable
              key={k.character}
              onPress={() => openKanji(k.character)}
              style={({ pressed }) => [styles.kanjiRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={[styles.kanjiGlyph, { color: p.text }]}>{k.character}</Text>
              <Text style={[styles.kanjiMeaning, { color: p.textSecondary }]} numberOfLines={2}>
                {k.meanings}
              </Text>
              <Text style={[styles.chevron, { color: p.textSecondary }]}>›</Text>
            </Pressable>
          ))}
        </View>
      )}

      <SentenceList sentences={sentences} onOpen={openSentence} style={styles.section} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, alignItems: 'center' },
  meaning: { fontSize: 18, marginTop: 8, textAlign: 'center' },
  card: { alignSelf: 'stretch', borderRadius: 12, padding: 16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  kanjiRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  kanjiGlyph: { fontSize: 34, fontWeight: '700', width: 44, textAlign: 'center' },
  kanjiMeaning: { flex: 1, fontSize: 14 },
  chevron: { fontSize: 22 },
});
