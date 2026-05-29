// Parsed-sentence view: the sentence + its translation, then the component words found by
// dictionary longest-match (de-conjugated to their plain form, e.g. かかった → かかる). Each word
// links to its word page; grammatical/kana-only words absent from the dictionary aren't listed.
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getSentenceById, lookupWordsByForms } from '@/data/repository/reference';
import { candidateForms, segment } from '@/domain/sentenceParser';
import { Furigana } from '@/ui/Furigana';
import { useNav } from '@/ui/nav';
import { Loading, LoadError, NotFound } from '@/ui/screenStates';
import { useAsyncResource } from '@/ui/useAsyncResource';
import { usePalette } from '@/ui/theme';

export default function SentenceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = usePalette();
  const { word: openWord } = useNav();

  const res = useAsyncResource(async () => {
    const sentence = await getSentenceById(Number(id));
    if (!sentence) return null;
    const dict = await lookupWordsByForms(candidateForms(sentence.japanese));
    const words = segment(sentence.japanese, dict).filter((seg) => seg.word);
    return { sentence, words };
  }, [id]);

  if (res.status === 'loading') return <Loading />;
  if (res.status === 'error') return <LoadError />;
  if (res.status === 'missing') return <NotFound label="Sentence not found." />;
  const { sentence, words } = res.data;

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
                onPress={() => openWord(w.id)}
                style={({ pressed }) => [styles.wordRow, pressed && { opacity: 0.6 }]}
              >
                <View style={styles.wordText}>
                  <View style={styles.wordTop}>
                    {dictForm && (
                      <Text style={[styles.wordForm, { color: p.text }]}>
                        {seg.text} <Text style={{ color: p.textSecondary }}>→</Text>
                      </Text>
                    )}
                    <Furigana form={w.kanjiForm} reading={w.kana} />
                  </View>
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
  content: { padding: 16 },
  japanese: { fontSize: 24, lineHeight: 36, fontWeight: '600' },
  english: { fontSize: 16, marginTop: 8 },
  card: { alignSelf: 'stretch', borderRadius: 12, padding: 16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  wordText: { flex: 1 },
  wordTop: { flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap', columnGap: 6 },
  wordForm: { fontSize: 18, fontWeight: '600' },
  chevron: { fontSize: 22 },
});
