// Shared shell for the review flows (ReviewReading / ReviewWriting). Owns the reveal overlay —
// a masked word's full answer + per-kanji rating (reviewWord), or the single-kanji fallback — the
// handwriting canvas, and the Undo / Show Answer row. Each flow supplies only its prompt label +
// body and the sentence to show in the fallback reveal.
import { ReactNode, useState } from 'react';
import { View } from 'react-native';
import { ExampleSentence } from '@/data/types';
import { CardWithContext } from '@/domain/models';
import { useStudyStore } from '@/state/studyStore';
import { PromptHeader } from '@/study/PromptHeader';
import { Btn } from '@/study/components/Btn';
import { DrawingArea } from '@/study/components/DrawingArea';
import { RevealOverlay } from '@/study/components/RevealOverlay';
import { WordReveal } from '@/study/components/WordReveal';
import { flowStyles } from '@/study/flows/styles';

export function ReviewScaffold({
  card,
  label,
  fallbackSentence,
  children,
}: {
  card: CardWithContext;
  label: string;
  fallbackSentence: ExampleSentence | null;
  children: ReactNode;
}) {
  // Per-card reveal: StudyContent remounts the flow (and this) per card, so it resets on its own.
  const [isRevealed, setIsRevealed] = useState(false);
  const undo = useStudyStore((s) => s.undo);
  const submitAnswer = useStudyStore((s) => s.submitAnswer);
  const submitWordAnswer = useStudyStore((s) => s.submitWordAnswer);
  const canUndoCurrent = useStudyStore((s) => s.canUndoCurrent);
  const rw = card.reviewWord;

  return (
    <View style={flowStyles.fill}>
      {isRevealed &&
        (rw ? (
          <WordReveal reviewWord={rw} onSubmit={submitWordAnswer} />
        ) : (
          <RevealOverlay kanji={card.card.kanji} sentence={fallbackSentence} onAnswer={submitAnswer} />
        ))}

      <PromptHeader label={label}>{children}</PromptHeader>

      <DrawingArea key={card.cardId} />

      <View style={flowStyles.bottomRow}>
        <Btn label="Undo" variant="outlined" onPress={undo} disabled={!canUndoCurrent()} />
        <Btn label="Show Answer" onPress={() => setIsRevealed(true)} style={flowStyles.flex1} />
      </View>
    </View>
  );
}
