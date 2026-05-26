// Kanji detail: readings + SRS status + review count, plus example words/sentences
// (served from the prebuilt reference.db).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getKanjiWithSrs } from '@/data/repository/kanji';
import { getReviewHistory } from '@/data/repository/reviews';
import { getSentencesForKanji, getWordsForKanji } from '@/data/repository/reference';
import { ExampleSentence, KanjiWithSrs, Review, srsOf, Word } from '@/data/types';
import { CardState } from '@/domain/cardState';
import { MetaChips } from '@/study/components/MetaChips';
import { Readings } from '@/study/components/Readings';
import { cardStateColors, usePalette } from '@/ui/theme';

const STATE_LABEL: Record<CardState, string> = {
  [CardState.NEW]: 'New',
  [CardState.LEARNING]: 'Learning',
  [CardState.REVIEW]: 'Review',
  [CardState.RELEARNING]: 'Relearning',
};

const COLLAPSE_LIMIT = 5;

export default function KanjiDetail() {
  const { character } = useLocalSearchParams<{ character: string }>();
  const router = useRouter();
  const p = usePalette();
  const [card, setCard] = useState<KanjiWithSrs | null | undefined>(undefined);
  const [history, setHistory] = useState<Review[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [sentences, setSentences] = useState<ExampleSentence[]>([]);
  const [wordsExpanded, setWordsExpanded] = useState(false);
  const [sentencesExpanded, setSentencesExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      setCard(await getKanjiWithSrs(character));
      setHistory(await getReviewHistory(character));
      setWords(await getWordsForKanji(character));
      setSentences(await getSentencesForKanji(character));
    })();
  }, [character]);

  if (card === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (card === null) {
    return (
      <View style={[styles.center, { backgroundColor: p.background }]}>
        <Text style={{ color: p.text }}>Kanji not found.</Text>
      </View>
    );
  }

  const srs = srsOf(card);
  const studied = card.rawSrs != null;
  const openWord = (id: number) => router.push({ pathname: '/word/[id]', params: { id } });

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.glyph, { color: p.text }]}>{card.kanji.character}</Text>
      <MetaChips grade={card.kanji.grade} strokes={card.kanji.strokes} />
      <Readings kanji={card.kanji} style={styles.readings} />

      <View style={[styles.statusCard, styles.section, { backgroundColor: p.surfaceVariant }]}>
        <View style={styles.statusHeader}>
          <View style={[styles.dot, { backgroundColor: cardStateColors[srs.type] }]} />
          <Text style={[styles.statusTitle, { color: p.text }]}>{STATE_LABEL[srs.type]}</Text>
        </View>
        {studied ? (
          <>
            <StatusRow label="Interval" value={`${(srs.interval / 86400).toFixed(1)} days`} />
            <StatusRow label="Due" value={new Date(srs.due * 1000).toLocaleDateString()} />
            <StatusRow label="Ease" value={`${(srs.factor / 1000).toFixed(2)}`} />
            <StatusRow label="Lapses" value={`${srs.lapses}`} />
          </>
        ) : (
          <Text style={{ color: p.textSecondary }}>Not studied yet.</Text>
        )}
        <StatusRow label="Reviews" value={`${history.length}`} />
      </View>

      {words.length > 0 && (
        <View style={[styles.statusCard, styles.section, { backgroundColor: p.surfaceVariant }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>Words</Text>
          {(wordsExpanded ? words : words.slice(0, COLLAPSE_LIMIT)).map((w) => (
            <Pressable
              key={w.id}
              onPress={() => openWord(w.id)}
              style={({ pressed }) => [styles.wordRow, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.wordText}>
                <Text style={[styles.wordForm, { color: p.text }]}>
                  {w.kanjiForm} <Text style={{ color: p.textSecondary }}>{w.kana}</Text>
                </Text>
                <Text style={{ color: p.textSecondary }}>{w.meaning}</Text>
              </View>
              <Text style={[styles.chevron, { color: p.textSecondary }]}>›</Text>
            </Pressable>
          ))}
          {words.length > COLLAPSE_LIMIT && (
            <ShowMore
              expanded={wordsExpanded}
              hiddenCount={words.length - COLLAPSE_LIMIT}
              onToggle={() => setWordsExpanded((v) => !v)}
            />
          )}
        </View>
      )}

      {sentences.length > 0 && (
        <View style={[styles.statusCard, styles.section, { backgroundColor: p.surfaceVariant }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>Sentences</Text>
          {(sentencesExpanded ? sentences : sentences.slice(0, COLLAPSE_LIMIT)).map((s) => (
            <View key={s.id} style={styles.sentenceRow}>
              <Text style={[styles.sentenceJp, { color: p.text }]}>{s.japanese}</Text>
              <Text style={{ color: p.textSecondary }}>{s.english}</Text>
            </View>
          ))}
          {sentences.length > COLLAPSE_LIMIT && (
            <ShowMore
              expanded={sentencesExpanded}
              hiddenCount={sentences.length - COLLAPSE_LIMIT}
              onToggle={() => setSentencesExpanded((v) => !v)}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

function ShowMore({
  expanded,
  hiddenCount,
  onToggle,
}: {
  expanded: boolean;
  hiddenCount: number;
  onToggle: () => void;
}) {
  const p = usePalette();
  return (
    <Pressable onPress={onToggle} style={styles.showMore} hitSlop={8}>
      <Text style={{ color: p.primary, fontWeight: '600' }}>
        {expanded ? 'Show less' : `Show ${hiddenCount} more`}
      </Text>
    </Pressable>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  const p = usePalette();
  return (
    <View style={styles.statusRow}>
      <Text style={{ color: p.textSecondary }}>{label}</Text>
      <Text style={{ color: p.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, alignItems: 'center' },
  glyph: { fontSize: 96, fontWeight: '700' },
  readings: { marginTop: 12 },
  statusCard: { alignSelf: 'stretch', borderRadius: 12, padding: 16 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusTitle: { fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  wordText: { flex: 1 },
  wordForm: { fontSize: 18, fontWeight: '600' },
  chevron: { fontSize: 22 },
  sentenceRow: { paddingVertical: 6 },
  sentenceJp: { fontSize: 16, lineHeight: 24 },
  showMore: { paddingTop: 10 },
});
