// Review by handwriting. Word-review cards (reviewWord) show the word as kana inside its sentence
// and rate every kanji in it on reveal; the fallback keeps the original prompt (a word's reading +
// kana-substituted sentence, or the bare kanji). Ported from study/view/ReviewWritingContent.
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStudyStore } from '@/state/studyStore';
import { PromptHeader } from '@/study/PromptHeader';
import { Btn } from '@/study/components/Btn';
import { ClozeSentence } from '@/study/components/ClozeSentence';
import { DrawingArea } from '@/study/components/DrawingArea';
import { MetaChips } from '@/study/components/MetaChips';
import { Readings } from '@/study/components/Readings';
import { RevealOverlay } from '@/study/components/RevealOverlay';
import { SentenceCard } from '@/study/components/SentenceCard';
import { WordReveal } from '@/study/components/WordReveal';
import { flowStyles } from '@/study/flows/styles';
import { usePalette } from '@/ui/theme';

export function ReviewWriting() {
  const card = useStudyStore((s) => s.currentCard());
  // Per-card reveal: StudyContent remounts this per card, so it resets on its own.
  const [isRevealed, setIsRevealed] = useState(false);
  const undo = useStudyStore((s) => s.undo);
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const submitWordAnswer = useStudyStore((s) => s.submitWordAnswer);
  const canUndoCurrent = useStudyStore((s) => s.canUndoCurrent);
  const p = usePalette();
  const rw = card.reviewWord;
  const target = useMemo(() => (rw ? null : card.examples[0] ?? null), [card.cardId]);

  return (
    <View style={flowStyles.fill}>
      {isRevealed &&
        (rw ? (
          <WordReveal reviewWord={rw} onSubmit={submitWordAnswer} />
        ) : (
          <RevealOverlay kanji={card.card.kanji} sentence={target?.sentence ?? null} onAnswer={submitAnswer} />
        ))}

      {rw ? (
        <PromptHeader label="Write the highlighted word">
          <ClozeSentence sentence={rw.sentence} word={rw.word} mode="writing" />
        </PromptHeader>
      ) : target ? (
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
          <MetaChips grade={card.card.kanji.grade} strokes={card.card.kanji.strokes} kanken={card.card.kanji.kanken} />
          <Readings kanji={card.card.kanji} style={flowStyles.gap8} />
        </PromptHeader>
      )}

      <DrawingArea key={card.cardId} />

      <View style={flowStyles.bottomRow}>
        <Btn label="Undo" variant="outlined" onPress={undo} disabled={!canUndoCurrent()} />
        <Btn label="Show Answer" onPress={() => setIsRevealed(true)} style={flowStyles.flex1} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bigReading: { fontSize: 44, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
});
