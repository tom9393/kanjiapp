// Review by handwriting. Word-review cards (reviewWord) show the word as kana inside its sentence
// and rate every kanji in it on reveal; the fallback keeps the original prompt (a word's reading +
// kana-substituted sentence, or the bare kanji). Ported from study/view/ReviewWritingContent.
import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useStudyStore } from '@/state/studyStore';
import { ClozeSentence } from '@/study/components/ClozeSentence';
import { MetaChips } from '@/study/components/MetaChips';
import { Readings } from '@/study/components/Readings';
import { SentenceCard } from '@/study/components/SentenceCard';
import { ReviewScaffold } from '@/study/flows/ReviewScaffold';
import { flowStyles } from '@/study/flows/styles';
import { usePalette } from '@/ui/theme';

export function ReviewWriting() {
  const card = useStudyStore((s) => s.currentCard());
  const p = usePalette();
  const rw = card.reviewWord;
  const target = useMemo(() => (rw ? null : card.examples[0] ?? null), [card.cardId]);
  const label = rw ? 'Write the highlighted word' : target ? 'Write this word' : 'Write this kanji';

  return (
    <ReviewScaffold card={card} label={label} fallbackSentence={target?.sentence ?? null}>
      {rw ? (
        <ClozeSentence sentence={rw.sentence} word={rw.word} mode="writing" />
      ) : target ? (
        <>
          <Text style={[styles.bigReading, { color: p.text }]}>{target.formattedReading}</Text>
          <SentenceCard
            sentence={{
              ...target.sentence,
              japanese: target.sentence.japanese.split(target.word.kanjiForm).join(target.word.kana),
            }}
          />
        </>
      ) : (
        <>
          <MetaChips grade={card.card.kanji.grade} strokes={card.card.kanji.strokes} kanken={card.card.kanji.kanken} />
          <Readings kanji={card.card.kanji} style={flowStyles.gap8} />
        </>
      )}
    </ReviewScaffold>
  );
}

const styles = StyleSheet.create({
  bigReading: { fontSize: 44, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
});
