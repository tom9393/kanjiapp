// Ported from study/view: StudyingContent, ReviewWritingContent, ReviewReadingContent,
// LearningContent (+ Presentation/Practice/Rating). Dispatches on the active learning phase.
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { currentCard } from '@/domain/session';
import { ActiveSession, CardWithContext } from '@/domain/models';
import { useStudyStore } from '@/state/studyStore';
import {
  AnswerButtons,
  Btn,
  DrawingArea,
  MetaChips,
  Readings,
  RevealOverlay,
  SentenceCard,
  StrokeOrderDiagram,
} from '@/study/components';
import { usePalette } from '@/ui/theme';

export function StudyContent({ active }: { active: ActiveSession }) {
  const card = currentCard(active.session);
  if (!card) return null;

  switch (active.learningPhase.kind) {
    case 'reviewing':
      return active.learningPhase.mode === 'reading' ? (
        <ReviewReading active={active} card={card} />
      ) : (
        <ReviewWriting active={active} card={card} />
      );
    case 'presentation':
      return <Presentation card={card} />;
    case 'practice':
      return <Practice active={active} card={card} round={active.learningPhase.round} total={active.learningPhase.total} />;
    case 'rating':
      return <Rating card={card} />;
  }
}

function PromptHeader({ label, children }: { label: string; children?: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={styles.prompt}>
      <Text style={[styles.promptLabel, { color: p.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function ReviewWriting({ active, card }: { active: ActiveSession; card: CardWithContext }) {
  const reveal = useStudyStore((s) => s.reveal);
  const undo = useStudyStore((s) => s.undo);
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const canUndoCurrent = useStudyStore((s) => s.canUndoCurrent);
  const target = useMemo(() => card.examples[0] ?? null, [card.card.kanji.character]);
  const p = usePalette();

  return (
    <View style={styles.fill}>
      {active.isRevealed && (
        <RevealOverlay kanji={card.card.kanji} sentence={target?.sentence ?? null} onAnswer={submitAnswer} />
      )}

      {target ? (
        <PromptHeader label="Write this word">
          <Text style={[styles.bigReading, { color: p.text }]}>{target.formattedReading}</Text>
          <SentenceCard
            sentence={{
              ...target.sentence,
              japanese: target.sentence.japanese.split(target.word.kanjiForm).join(target.word.kana),
            }}
          />
        </PromptHeader>
      ) : (
        <PromptHeader label="Write this kanji">
          <MetaChips grade={card.card.kanji.grade} strokes={card.card.kanji.strokes} />
          <Readings kanji={card.card.kanji} style={styles.gap8} />
        </PromptHeader>
      )}

      <DrawingArea key={card.card.kanji.character} strokeWidth={active.strokeWidth} />

      <View style={styles.bottomRow}>
        <Btn label="Undo" variant="outlined" onPress={undo} disabled={!canUndoCurrent()} />
        <Btn label="Show Answer" onPress={reveal} style={styles.flex1} />
      </View>
    </View>
  );
}

function ReviewReading({ active, card }: { active: ActiveSession; card: CardWithContext }) {
  const reveal = useStudyStore((s) => s.reveal);
  const undo = useStudyStore((s) => s.undo);
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const canUndoCurrent = useStudyStore((s) => s.canUndoCurrent);
  const target = useMemo(
    () => card.examples[Math.floor(Math.random() * card.examples.length)],
    [card.card.kanji.character],
  );
  const p = usePalette();

  return (
    <View style={styles.fill}>
      {active.isRevealed && (
        <RevealOverlay kanji={card.card.kanji} sentence={target?.sentence ?? null} onAnswer={submitAnswer} />
      )}

      <PromptHeader label="Read this word">
        <Text style={[styles.bigGlyph, { color: p.text }]}>{target?.word.kanjiForm}</Text>
        {target && <SentenceCard sentence={target.sentence} />}
      </PromptHeader>

      <DrawingArea key={card.card.kanji.character} strokeWidth={active.strokeWidth} />

      <View style={styles.bottomRow}>
        <Btn label="Undo" variant="outlined" onPress={undo} disabled={!canUndoCurrent()} />
        <Btn label="Show Answer" onPress={reveal} style={styles.flex1} />
      </View>
    </View>
  );
}

function Presentation({ card }: { card: CardWithContext }) {
  const beginPractice = useStudyStore((s) => s.beginPractice);
  const p = usePalette();
  const kanji = card.card.kanji;
  const sentence = card.examples[0]?.sentence ?? null;

  return (
    <View style={styles.fillPadded}>
      <ScrollView style={styles.flex1} contentContainerStyle={{ alignItems: 'center' }}>
        <Text style={[styles.bigGlyph, { color: p.text }]}>{kanji.character}</Text>
        <MetaChips grade={kanji.grade} strokes={kanji.strokes} />
        <View style={[styles.alignStart, styles.gap8]}>
          <Readings kanji={kanji} />
          {sentence && <SentenceCard sentence={sentence} style={styles.gap8} />}
        </View>
        <View style={[styles.strokeWrap, styles.gap12]}>
          <StrokeOrderDiagram character={kanji.character} />
        </View>
      </ScrollView>
      <Btn label="Begin Practice" onPress={beginPractice} style={{ marginTop: 8 }} />
    </View>
  );
}

function Practice({
  active,
  card,
  round,
  total,
}: {
  active: ActiveSession;
  card: CardWithContext;
  round: number;
  total: number;
}) {
  const practiceRoundComplete = useStudyStore((s) => s.practiceRoundComplete);
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const p = usePalette();
  const kanji = card.card.kanji;
  const isLast = round === total;
  // Bumping this remounts the canvas — the idiomatic way to clear local drawing state.
  // The round and character are also in the key, so advancing either resets the canvas too.
  const [clearNonce, setClearNonce] = useState(0);

  return (
    <View style={styles.fill}>
      <View style={styles.practiceHeader}>
        <Text style={[styles.midGlyph, { color: p.text }]}>{kanji.character}</Text>
        <View style={styles.flex1}>
          <Readings kanji={kanji} />
        </View>
      </View>

      <DrawingArea key={`${kanji.character}-${round}-${clearNonce}`} strokeWidth={active.strokeWidth} />

      <Text style={[styles.roundLabel, { color: p.textSecondary }]}>
        Round {round} of {total}
      </Text>

      {isLast ? (
        <AnswerButtons onAnswer={submitAnswer} />
      ) : (
        <View style={styles.bottomRow}>
          <Btn label="Clear" variant="outlined" onPress={() => setClearNonce((n) => n + 1)} />
          <Btn label="Next" onPress={practiceRoundComplete} style={styles.flex1} />
        </View>
      )}
    </View>
  );
}

function Rating({ card }: { card: CardWithContext }) {
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const p = usePalette();
  const kanji = card.card.kanji;
  const sentence = card.examples[0]?.sentence ?? null;

  return (
    <View style={styles.fill}>
      <ScrollView style={styles.flex1} contentContainerStyle={styles.ratingScroll}>
        <Text style={[styles.bigGlyph, { color: p.text }]}>{kanji.character}</Text>
        <MetaChips grade={kanji.grade} strokes={kanji.strokes} />
        <View style={[styles.alignStart, styles.gap8]}>
          <Readings kanji={kanji} />
          {sentence && <SentenceCard sentence={sentence} style={styles.gap8} />}
        </View>
      </ScrollView>
      <AnswerButtons onAnswer={submitAnswer} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  fillPadded: { flex: 1, padding: 16 },
  flex1: { flex: 1 },
  alignStart: { alignSelf: 'stretch' },
  // Vertical spacing folded onto real elements, replacing standalone spacer Views.
  gap8: { marginTop: 8 },
  gap12: { marginTop: 12 },
  prompt: { padding: 16 },
  promptLabel: { fontSize: 13, marginBottom: 8 },
  bigGlyph: { fontSize: 64, fontWeight: '700', textAlign: 'center' },
  midGlyph: { fontSize: 48, fontWeight: '700', marginRight: 16 },
  bigReading: { fontSize: 44, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  bottomRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, gap: 8 },
  practiceHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  roundLabel: { fontSize: 13, textAlign: 'center', paddingTop: 4 },
  strokeWrap: { alignSelf: 'stretch' },
  ratingScroll: { alignItems: 'center', padding: 16 },
});
