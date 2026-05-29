// Kanji detail: readings + SRS status + review count, plus example words/sentences
// (served from the prebuilt reference.db).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getKanjiByCharacters, getKanjiWithSrs } from '@/data/repository/kanji';
import { getFlags, setFavorite, setSuspended, KanjiFlags } from '@/data/repository/flags';
import { getLists, getListIdsContaining, KanjiListSummary } from '@/data/repository/lists';
import { getReviewHistory } from '@/data/repository/reviews';
import { getSentencesForKanji, getWordsForKanji } from '@/data/repository/reference';
import { srsOf } from '@/data/types';
import { CardState } from '@/domain/cardState';
import {
  groupWordsByReading,
  kanjiInWordForms,
  ReadingGroup,
} from '@/domain/wordReadingGroups';
import { MetaChips } from '@/study/components/MetaChips';
import { Readings } from '@/study/components/Readings';
import { AddToListButton } from '@/ui/AddToListButton';
import { Furigana } from '@/ui/Furigana';
import { RadicalTree } from '@/ui/RadicalTree';
import { Loading, LoadError, NotFound } from '@/ui/screenStates';
import { SentenceList } from '@/ui/SentenceList';
import { ShowMore } from '@/ui/ShowMore';
import { useAsyncResource } from '@/ui/useAsyncResource';
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

  const res = useAsyncResource(async () => {
    const card = await getKanjiWithSrs(character);
    if (!card) return null;
    const [history, words, sentences] = await Promise.all([
      getReviewHistory(character),
      getWordsForKanji(character),
      getSentencesForKanji(character),
    ]);
    const chars = kanjiInWordForms(words);
    chars.add(character);
    const kanjiInfo = new Map((await getKanjiByCharacters([...chars])).map((k) => [k.character, k]));
    const wordGroups = groupWordsByReading(character, words, kanjiInfo);
    return { card, history, wordGroups, sentences };
  }, [character]);

  // Mutable per-kanji state (flags + list membership), loaded into local state independently.
  const [flags, setFlags] = useState<KanjiFlags>({ favorite: false, suspended: false });
  const [lists, setLists] = useState<KanjiListSummary[]>([]);
  const [memberOf, setMemberOf] = useState<Set<number>>(new Set());
  const [expandedReadings, setExpandedReadings] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedReadings(new Set());
  }, [character]);

  useEffect(() => {
    let active = true;
    Promise.all([getFlags(character), getLists(), getListIdsContaining(character)]).then(
      ([f, l, m]) => {
        if (!active) return;
        setFlags(f);
        setLists(l);
        setMemberOf(m);
      },
    );
    return () => {
      active = false;
    };
  }, [character]);

  if (res.status === 'loading') return <Loading />;
  if (res.status === 'error') return <LoadError />;
  if (res.status === 'missing') return <NotFound label="Kanji not found." />;
  const { card, history, wordGroups, sentences } = res.data;

  const srs = srsOf(card);
  const studied = card.rawSrs != null;
  const openWord = (id: number) => router.push({ pathname: '/word/[id]', params: { id } });
  const openSentence = (id: number) => router.push({ pathname: '/sentence/[id]', params: { id } });
  const toggleReading = (key: string) =>
    setExpandedReadings((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Optimistic toggles: flip the flag immediately, then revert it if the DB write fails so the
  // UI never silently diverges from what's persisted.
  const toggleFavorite = () => {
    const next = !flags.favorite;
    setFlags((f) => ({ ...f, favorite: next }));
    setFavorite(character, next).catch((e) => {
      console.error('Failed to update favorite', e);
      setFlags((f) => ({ ...f, favorite: !next }));
    });
  };
  const toggleSuspended = () => {
    const next = !flags.suspended;
    setFlags((f) => ({ ...f, suspended: next }));
    setSuspended(character, next).catch((e) => {
      console.error('Failed to update suspended', e);
      setFlags((f) => ({ ...f, suspended: !next }));
    });
  };

  return (
    <ScrollView style={{ backgroundColor: p.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.glyph, { color: p.text }]}>{card.kanji.character}</Text>
      <MetaChips grade={card.kanji.grade} strokes={card.kanji.strokes} kanken={card.kanji.kanken} />
      <Readings kanji={card.kanji} style={styles.readings} />

      <View style={[styles.flagRow, styles.section]}>
        <FlagToggle label="★ Favorite" active={flags.favorite} onPress={toggleFavorite} />
        <FlagToggle label="⏸ Suspend" active={flags.suspended} onPress={toggleSuspended} />
      </View>

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

      <AddToListButton
        target={{ kind: 'kanji', character }}
        lists={lists}
        memberOf={memberOf}
        onChange={(nextMembers, nextLists) => {
          setMemberOf(nextMembers);
          setLists(nextLists);
        }}
        style={styles.section}
      />

      <RadicalTree character={card.kanji.character} />

      {wordGroups.map((group) => {
        const key = group.reading ?? '__other__';
        return (
          <WordReadingCard
            key={key}
            group={group}
            soleGroup={wordGroups.length === 1}
            expanded={expandedReadings.has(key)}
            onToggle={() => toggleReading(key)}
            onOpenWord={openWord}
          />
        );
      })}

      <SentenceList sentences={sentences} onOpen={openSentence} style={styles.section} />
    </ScrollView>
  );
}

// One reading's card: the reading as its title (the lone unresolved group reads as "Words"), up to
// COLLAPSE_LIMIT words, then a "Show all N words" toggle for the rest.
function WordReadingCard({
  group,
  soleGroup,
  expanded,
  onToggle,
  onOpenWord,
}: {
  group: ReadingGroup;
  soleGroup: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOpenWord: (id: number) => void;
}) {
  const p = usePalette();
  const title = group.reading ?? (soleGroup ? 'Words' : 'Other');
  const shown = expanded ? group.words : group.words.slice(0, COLLAPSE_LIMIT);
  return (
    <View style={[styles.statusCard, styles.section, { backgroundColor: p.surfaceVariant }]}>
      <Text style={[styles.sectionTitle, { color: p.text }]}>{title}</Text>
      {shown.map((w) => (
        <Pressable
          key={w.id}
          onPress={() => onOpenWord(w.id)}
          style={({ pressed }) => [styles.wordRow, pressed && { opacity: 0.6 }]}
        >
          <View style={styles.wordText}>
            <Furigana form={w.kanjiForm} reading={w.kana} />
            <Text style={{ color: p.textSecondary }}>{w.meaning}</Text>
          </View>
          <Text style={[styles.chevron, { color: p.textSecondary }]}>›</Text>
        </Pressable>
      ))}
      {group.words.length > COLLAPSE_LIMIT && (
        <ShowMore
          expanded={expanded}
          hiddenCount={group.words.length - COLLAPSE_LIMIT}
          onToggle={onToggle}
          expandLabel={`Show all ${group.words.length} words`}
        />
      )}
    </View>
  );
}

function FlagToggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.flagBtn,
        { borderColor: active ? p.primary : p.border, backgroundColor: active ? p.primary : 'transparent' },
      ]}
    >
      <Text style={[styles.flagLabel, { color: active ? p.onPrimary : p.text }]}>{label}</Text>
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
  content: { padding: 16, alignItems: 'center' },
  glyph: { fontSize: 96, fontWeight: '700' },
  readings: { marginTop: 12 },
  flagRow: { alignSelf: 'stretch', flexDirection: 'row', gap: 10 },
  flagBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  flagLabel: { fontSize: 14, fontWeight: '600' },
  statusCard: { alignSelf: 'stretch', borderRadius: 12, padding: 16 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  statusTitle: { fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  wordText: { flex: 1 },
  chevron: { fontSize: 22 },
});
