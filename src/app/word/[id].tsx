// Word detail: the word's form, reading, and meaning; the kanji it uses (each links to its
// own kanji page); and example sentences containing the word. Mirrors the kanji detail screen.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getKanjiByCharacters } from '@/data/repository/kanji';
import { getSentencesContainingWord, getWordById } from '@/data/repository/reference';
import { ExampleSentence, Kanji, Word } from '@/data/types';
import { isKanji } from '@/domain/readingFormatter';
import { usePalette } from '@/ui/theme';

const COLLAPSE_LIMIT = 5;

export default function WordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = usePalette();
  const [word, setWord] = useState<Word | null | undefined>(undefined);
  const [kanji, setKanji] = useState<Kanji[]>([]);
  const [sentences, setSentences] = useState<ExampleSentence[]>([]);
  const [sentencesExpanded, setSentencesExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const w = await getWordById(Number(id));
      if (!active) return;
      setWord(w);
      if (!w) return;

      // Distinct kanji in the word, in order of appearance; keep only those we have data for.
      const chars = [...new Set([...w.kanjiForm].filter(isKanji))];
      const found = await getKanjiByCharacters(chars);
      const byChar = new Map(found.map((k) => [k.character, k]));
      const ordered = chars.map((c) => byChar.get(c)).filter((k): k is Kanji => k != null);

      const found2 = await getSentencesContainingWord(w);
      if (active) {
        setKanji(ordered);
        setSentences(found2);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (word === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (word === null) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <Text style={{ color: p.text }}>Word not found.</Text>
      </View>
    );
  }

  const openKanji = (character: string) => router.push({ pathname: '/kanji/[character]', params: { character } });
  const shownSentences = sentencesExpanded ? sentences : sentences.slice(0, COLLAPSE_LIMIT);

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.form, { color: p.text }]}>{word.kanjiForm}</Text>
      <Text style={[styles.reading, { color: p.textSecondary }]}>{word.kana}</Text>
      <Text style={[styles.meaning, { color: p.text }]}>{word.meaning}</Text>

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

      {sentences.length > 0 && (
        <View style={[styles.card, styles.section, { backgroundColor: p.surfaceVariant }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>Sentences</Text>
          {shownSentences.map((s) => (
            <View key={s.id} style={styles.sentenceRow}>
              <Text style={[styles.sentenceJp, { color: p.text }]}>{s.japanese}</Text>
              <Text style={{ color: p.textSecondary }}>{s.english}</Text>
            </View>
          ))}
          {sentences.length > COLLAPSE_LIMIT && (
            <Pressable onPress={() => setSentencesExpanded((v) => !v)} style={styles.showMore} hitSlop={8}>
              <Text style={{ color: p.primary, fontWeight: '600' }}>
                {sentencesExpanded ? 'Show less' : `Show ${sentences.length - COLLAPSE_LIMIT} more`}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, alignItems: 'center' },
  form: { fontSize: 56, fontWeight: '700', textAlign: 'center' },
  reading: { fontSize: 22, marginTop: 4 },
  meaning: { fontSize: 18, marginTop: 8, textAlign: 'center' },
  card: { alignSelf: 'stretch', borderRadius: 12, padding: 16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  kanjiRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  kanjiGlyph: { fontSize: 34, fontWeight: '700', width: 44, textAlign: 'center' },
  kanjiMeaning: { flex: 1, fontSize: 14 },
  chevron: { fontSize: 22 },
  sentenceRow: { paddingVertical: 6 },
  sentenceJp: { fontSize: 16, lineHeight: 24 },
  showMore: { paddingTop: 10 },
});
