// Word detail: the word's form, reading, and meaning; the kanji it uses (each links to its
// own kanji page); and example sentences containing the word. Mirrors the kanji detail screen.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getKanjiByCharacters } from '@/data/repository/kanji';
import {
  getLists,
  getListIdsContainingWord,
  KanjiListSummary,
} from '@/data/repository/lists';
import { getSentencesContainingWord, getWordById } from '@/data/repository/reference';
import { ExampleSentence, Kanji, Word } from '@/data/types';
import { isKanji } from '@/domain/readingFormatter';
import { AddToListModal } from '@/ui/AddToListModal';
import { Furigana } from '@/ui/Furigana';
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
  const [lists, setLists] = useState<KanjiListSummary[]>([]);
  const [memberOf, setMemberOf] = useState<Set<number>>(new Set());
  const [listModalOpen, setListModalOpen] = useState(false);

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
      const [allLists, inLists] = await Promise.all([getLists(), getListIdsContainingWord(w.id)]);
      if (active) {
        setKanji(ordered);
        setSentences(found2);
        setLists(allLists);
        setMemberOf(inLists);
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
  const openSentence = (sid: number) => router.push({ pathname: '/sentence/[id]', params: { id: sid } });
  const shownSentences = sentencesExpanded ? sentences : sentences.slice(0, COLLAPSE_LIMIT);

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content}>
      <Furigana form={word.kanjiForm} reading={word.kana} size={56} weight="700" />
      <Text style={[styles.meaning, { color: p.text }]}>{word.meaning}</Text>

      <Pressable
        onPress={() => setListModalOpen(true)}
        style={({ pressed }) => [
          styles.addToListBtn,
          styles.section,
          { borderColor: p.border, backgroundColor: p.surfaceVariant },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Text style={[styles.addToListLabel, { color: p.text }]}>
          {memberOf.size === 0 ? '+ Add to list' : `In ${memberOf.size} list${memberOf.size === 1 ? '' : 's'} — edit`}
        </Text>
      </Pressable>

      <AddToListModal
        visible={listModalOpen}
        target={{ kind: 'word', id: word.id, label: word.kanjiForm }}
        lists={lists}
        memberOf={memberOf}
        onChange={(nextMembers, nextLists) => {
          setMemberOf(nextMembers);
          setLists(nextLists);
        }}
        onClose={() => setListModalOpen(false)}
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

      {sentences.length > 0 && (
        <View style={[styles.card, styles.section, { backgroundColor: p.surfaceVariant }]}>
          <Text style={[styles.sectionTitle, { color: p.text }]}>Sentences</Text>
          {shownSentences.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => openSentence(s.id)}
              style={({ pressed }) => [styles.sentenceRow, pressed && { opacity: 0.6 }]}
            >
              <View style={styles.sentenceText}>
                <Text style={[styles.sentenceJp, { color: p.text }]}>{s.japanese}</Text>
                <Text style={{ color: p.textSecondary }}>{s.english}</Text>
              </View>
              <Text style={[styles.chevron, { color: p.textSecondary }]}>›</Text>
            </Pressable>
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
  meaning: { fontSize: 18, marginTop: 8, textAlign: 'center' },
  card: { alignSelf: 'stretch', borderRadius: 12, padding: 16 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  kanjiRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  kanjiGlyph: { fontSize: 34, fontWeight: '700', width: 44, textAlign: 'center' },
  kanjiMeaning: { flex: 1, fontSize: 14 },
  chevron: { fontSize: 22 },
  sentenceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  sentenceText: { flex: 1 },
  sentenceJp: { fontSize: 16, lineHeight: 24 },
  showMore: { paddingTop: 10 },
  addToListBtn: {
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addToListLabel: { fontSize: 15, fontWeight: '600' },
});
