// Review by handwriting: prompt the word/kanji, draw it, reveal + rate. Ported from
// study/view/ReviewWritingContent.
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useStudyStore } from '@/state/studyStore';
import { PromptHeader } from '@/study/PromptHeader';
import { Btn } from '@/study/components/Btn';
import { DrawingArea } from '@/study/components/DrawingArea';
import { MetaChips } from '@/study/components/MetaChips';
import { Readings } from '@/study/components/Readings';
import { RevealOverlay } from '@/study/components/RevealOverlay';
import { SentenceCard } from '@/study/components/SentenceCard';
import { flowStyles } from '@/study/flows/styles';
import { usePalette } from '@/ui/theme';

export function ReviewWriting() {
  const card = useStudyStore((s) => s.currentCard());
  // Per-card reveal: StudyContent remounts this per card, so it resets on its own.
  const [isRevealed, setIsRevealed] = useState(false);
  const undo = useStudyStore((s) => s.undo);
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const canUndoCurrent = useStudyStore((s) => s.canUndoCurrent);
  const target = useMemo(() => card.examples[0] ?? null, [card.cardId]);
  const p = usePalette();

  return (
    <View style={flowStyles.fill}>
      {isRevealed && (
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
