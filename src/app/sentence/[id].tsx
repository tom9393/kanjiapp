// Parsed-sentence view: the sentence + its translation, then the component words found by
// dictionary longest-match (de-conjugated to their plain form, e.g. かかった → かかる). Each word
// links to its word page; grammatical/kana-only words absent from the dictionary aren't listed.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSentenceById, lookupWordsByForms } from '@/data/repository/reference';
import { ExampleSentence, Word } from '@/data/types';
import { candidateForms, segment, Segment } from '@/domain/sentenceParser';
import { usePalette } from '@/ui/theme';

export default function SentenceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const p = usePalette();
  const [sentence, setSentence] = useState<ExampleSentence | null | undefined>(undefined);
  const [words, setWords] = useState<Segment[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const s = await getSentenceById(Number(id));
      if (!active) return;
      setSentence(s);
      if (!s) return;
      const dict = await lookupWordsByForms(candidateForms(s.japanese));
      if (active) setWords(segment(s.japanese, dict).filter((seg) => seg.word));
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (sentence === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (sentence === null) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <Text style={{ color: p.text }}>Sentence not found.</Text>
      </View>
    );
  }

  const openWord = (w: Word) => router.push({ pathname: '/word/[id]', params: { id: w.id } });

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.japanese, { color: p.text }]}>{sentence.japanese}</Text>
      <Text style={[styles.english, { color: p.textSecondary }]}>{sentence.english}</Text>

      {words.length > 0 && (
        <View style={[styles.card, styles.section, { backgroundColor: p.surfaceVariant }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>Words</Text>
          {words.map((seg, i) => {
            const w = seg.word!;
            // The plain dictionary form, shown only when the word appears conjugated/abbreviated.
            const dictForm = seg.text === w.kanjiForm || seg.text === w.kana ? null : w.kanjiForm;
            return (
              <Pressable
                key={i}
                onPress={() => openWord(w)}
                style={({ pressed }) => [styles.wordRow, pressed && { opacity: 0.6 }]}
              >
                <View style={styles.wordText}>
                  <Text style={[styles.wordForm, { color: p.text }]}>
                    {seg.text}
                    {dictForm && <Text style={{ color: p.textSecondary }}> → {dictForm}</Text>}
                    <Text style={{ color: p.textSecondary }}> {w.kana}</Text>
                  </Text>
                  <Text style={{ color: p.textSecondary }}>{w.meaning}</Text>
                </View>
                <Text style={[styles.chevron, { color: p.textSecondary }]}>›</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  japanese: { fontSize: 24, lineHeight: 36, fontWeight: '600' },
  english: { fontSize: 16, marginTop: 8 },
  card: { alignSelf: 'stretch', borderRadius: 12, padding: 16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  wordText: { flex: 1 },
  wordForm: { fontSize: 18, fontWeight: '600' },
  chevron: { fontSize: 22 },
});
