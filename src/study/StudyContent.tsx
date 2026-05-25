// Ported from study/view: routes the current card to a flow. The card's SRS state selects
// review vs. learning; review mode and the learning-phase progression are local view state.
// The flow screens live in src/study/flows/.
import { useState } from 'react';
import { srsOf } from '@/data/types';
import { CardState } from '@/domain/cardState';
import { getStudyModes, type StudyModesSnapshot } from '@/settings/settingsProvider';
import { useSetting } from '@/settings/useSetting';
import { useCurrentCard } from '@/state/studyStore';
import { Presentation } from '@/study/flows/Presentation';
import { Practice } from '@/study/flows/Practice';
import { Rating } from '@/study/flows/Rating';
import { ReviewReading } from '@/study/flows/ReviewReading';
import { ReviewWriting } from '@/study/flows/ReviewWriting';

export function StudyContent() {
  const character = useCurrentCard().card.kanji.character;
  // Remount per card so review mode and the learning phase reset when the card advances.
  return <CardFlow key={character} />;
}

function CardFlow() {
  const card = useCurrentCard();
  return srsOf(card.card).type === CardState.REVIEW ? <Review /> : <Learning />;
}

function Review() {
  const modes = useSetting(getStudyModes);
  // Wait for the real modes before picking — the fallback would always force handwriting.
  if (!modes) return null;
  return <ReviewCard modes={modes} />;
}

function ReviewCard({ modes }: { modes: StudyModesSnapshot }) {
  const handwriting = modes.handwriting;
  const reading = modes.reading;

  if (handwriting && reading) {
    return Math.random() < 0.5 ? <ReviewReading /> : <ReviewWriting />;
  }

  return reading ? <ReviewReading /> : <ReviewWriting />;
}

function Learning() {
  const [step, setStep] = useState('presentation');

  switch (step) {
    case 'presentation':
      return <Presentation onBegin={() => setStep('practice')} />;
    case 'practice':
      return <Practice onFinished={() => setStep('rating')} />;
    case 'rating':
      return <Rating />;
  }
}
