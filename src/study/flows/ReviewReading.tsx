// Review by reading: show a word, draw the reading, reveal + rate. Ported from
// study/view/ReviewReadingContent.
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useCurrentCard, useStudyStore } from '@/state/studyStore';
import { PromptHeader } from '@/study/PromptHeader';
import { Btn } from '@/study/components/Btn';
import { DrawingArea } from '@/study/components/DrawingArea';
import { RevealOverlay } from '@/study/components/RevealOverlay';
import { SentenceCard } from '@/study/components/SentenceCard';
import { flowStyles } from '@/study/flows/styles';
import { usePalette } from '@/ui/theme';

export function ReviewReading() {
  const card = useCurrentCard();
  // Per-card reveal: StudyContent remounts this per card, so it resets on its own.
  const [isRevealed, setIsRevealed] = useState(false);
  const undo = useStudyStore((s) => s.undo);
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const canUndoCurrent = useStudyStore((s) => s.canUndoCurrent);
  const target = useMemo(
    () => card.examples[Math.floor(Math.random() * card.examples.length)],
    [card.card.kanji.character],
  );
  const p = usePalette();

  return (
    <View style={flowStyles.fill}>
      {isRevealed && (
        <RevealOverlay kanji={card.card.kanji} sentence={target?.sentence ?? null} onAnswer={submitAnswer} />
      )}

      <PromptHeader label="Read this word">
        <Text style={[flowStyles.bigGlyph, { color: p.text }]}>{target?.word.kanjiForm}</Text>
        {target && <SentenceCard sentence={target.sentence} />}
      </PromptHeader>

      <DrawingArea key={card.card.kanji.character} />

      <View style={flowStyles.bottomRow}>
        <Btn label="Undo" variant="outlined" onPress={undo} disabled={!canUndoCurrent()} />
        <Btn label="Show Answer" onPress={() => setIsRevealed(true)} style={flowStyles.flex1} />
      </View>
    </View>
  );
}
