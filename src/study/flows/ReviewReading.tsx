// Review by reading. Word-review cards (reviewWord) show the word masked in its sentence and rate
// every kanji in it on reveal; the fallback (a review kanji with no usable word, or noSrs list
// sessions) keeps the original single-word prompt. Ported from study/view/ReviewReadingContent.
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useStudyStore } from '@/state/studyStore';
import { PromptHeader } from '@/study/PromptHeader';
import { Btn } from '@/study/components/Btn';
import { ClozeSentence } from '@/study/components/ClozeSentence';
import { DrawingArea } from '@/study/components/DrawingArea';
import { RevealOverlay } from '@/study/components/RevealOverlay';
import { SentenceCard } from '@/study/components/SentenceCard';
import { WordReveal } from '@/study/components/WordReveal';
import { flowStyles } from '@/study/flows/styles';
import { usePalette } from '@/ui/theme';

export function ReviewReading() {
  const card = useStudyStore((s) => s.currentCard());
  // Per-card reveal: StudyContent remounts this per card, so it resets on its own.
  const [isRevealed, setIsRevealed] = useState(false);
  const undo = useStudyStore((s) => s.undo);
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const submitWordAnswer = useStudyStore((s) => s.submitWordAnswer);
  const canUndoCurrent = useStudyStore((s) => s.canUndoCurrent);
  const p = usePalette();
  const rw = card.reviewWord;
  const target = useMemo(
    () => (rw ? null : card.examples[Math.floor(Math.random() * card.examples.length)] ?? null),
    [card.cardId],
  );

  return (
    <View style={flowStyles.fill}>
      {isRevealed &&
        (rw ? (
          <WordReveal reviewWord={rw} onSubmit={submitWordAnswer} />
        ) : (
          <RevealOverlay kanji={card.card.kanji} sentence={target?.sentence ?? null} onAnswer={submitAnswer} />
        ))}

      <PromptHeader label={rw ? 'Read the highlighted word' : 'Read this word'}>
        {rw ? (
          <ClozeSentence sentence={rw.sentence} word={rw.word} mode="reading" />
        ) : (
          <>
            <Text style={[flowStyles.bigGlyph, { color: p.text }]}>{target?.word.kanjiForm}</Text>
            {target && <SentenceCard sentence={target.sentence} />}
          </>
        )}
      </PromptHeader>

      <DrawingArea key={card.cardId} />

      <View style={flowStyles.bottomRow}>
        <Btn label="Undo" variant="outlined" onPress={undo} disabled={!canUndoCurrent()} />
        <Btn label="Show Answer" onPress={() => setIsRevealed(true)} style={flowStyles.flex1} />
      </View>
    </View>
  );
}
