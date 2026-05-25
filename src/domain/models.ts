// Ported from study/logic/StudyModels.kt — the study session data model.
import { ExampleSentence, KanjiWithSrs, Word } from '@/data/types';

export type StudyMode = 'handwriting' | 'reading';

export interface StudyModesSnapshot {
  handwriting: boolean;
  reading: boolean;
}

export const studyModes = {
  needsWordContext: (m: StudyModesSnapshot) => m.reading,
  anyEnabled: (m: StudyModesSnapshot) => m.handwriting || m.reading,
};

export interface WordWithSentence {
  word: Word;
  sentence: ExampleSentence;
  formattedReading: string;
}

export interface CardWithContext {
  card: KanjiWithSrs;
  examples: WordWithSentence[];
}

export interface StudyHistoryItem {
  originalCard: CardWithContext;
  wasShifted: boolean;
}

export interface Session {
  queue: CardWithContext[];
  history: StudyHistoryItem[];
}

export interface Point {
  x: number;
  y: number;
}

// LearningPhase (sealed interface) as a discriminated union.
export type LearningPhase =
  | { kind: 'presentation' }
  | { kind: 'practice'; round: number; total: number }
  | { kind: 'rating' }
  | { kind: 'reviewing'; mode: StudyMode };

export function nextPracticeRound(phase: { round: number; total: number }): LearningPhase {
  return phase.round < phase.total
    ? { kind: 'practice', round: phase.round + 1, total: phase.total }
    : { kind: 'rating' };
}

export interface SessionSettings {
  learningReps: number;
  enabledModes: StudyModesSnapshot;
}

// SessionState.Active fields. Loading state is represented separately in the store.
export interface ActiveSession {
  session: Session;
  isRevealed: boolean;
  learningPhase: LearningPhase;
  sessionSettings: SessionSettings;
  strokeWidth: number;
}
