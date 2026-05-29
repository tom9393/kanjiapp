// Review by reading. Word-review cards (reviewWord) show the word masked in its sentence and rate
// every kanji in it on reveal; the fallback (a review kanji with no usable word, or noSrs list
// sessions) keeps the original single-word prompt. Ported from study/view/ReviewReadingContent.
import { useMemo } from 'react';
import { Text } from 'react-native';
import { useStudyStore } from '@/state/studyStore';
import { ClozeSentence } from '@/study/components/ClozeSentence';
import { SentenceCard } from '@/study/components/SentenceCard';
import { ReviewScaffold } from '@/study/flows/ReviewScaffold';
import { flowStyles } from '@/study/flows/styles';
import { usePalette } from '@/ui/theme';

export function ReviewReading() {
  const card = useStudyStore((s) => s.currentCard());
  const p = usePalette();
  const rw = card.reviewWord;
  const target = useMemo(
    () => (rw ? null : card.examples[Math.floor(Math.random() * card.examples.length)] ?? null),
    [card.cardId],
  );

  return (
    <ReviewScaffold
      card={card}
      label={rw ? 'Read the highlighted word' : 'Read this word'}
      fallbackSentence={target?.sentence ?? null}
    >
      {rw ? (
        <ClozeSentence sentence={rw.sentence} word={rw.word} mode="reading" />
      ) : (
        <>
          <Text style={[flowStyles.bigGlyph, { color: p.text }]}>{target?.word.kanjiForm}</Text>
          {target && <SentenceCard sentence={target.sentence} />}
        </>
      )}
    </ReviewScaffold>
  );
}
