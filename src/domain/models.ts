// Ported from study/logic/StudyModels.kt — the study session data model.
import { ExampleSentence, KanjiWithSrs, Word } from '@/data/types';

export interface WordWithSentence {
  word: Word;
  sentence: ExampleSentence;
  formattedReading: string;
}

export interface CardWithContext {
  card: KanjiWithSrs;
  examples: WordWithSentence[];
  /** Stable identifier for React keys: kanji character, or `w${wordId}` for word-locked cards. */
  cardId: string;
  /** Word-list entries route through the Review flow even when their anchor kanji is NEW. */
  forceReview?: boolean;
}

export interface StudyHistoryItem {
  originalCard: CardWithContext;
  wasShifted: boolean;
}

export interface Session {
  queue: CardWithContext[];
  history: StudyHistoryItem[];
  /** When true, answering a card advances the queue locally without touching SRS / reviews. */
  noSrs?: boolean;
}
