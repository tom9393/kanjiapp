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
}

export interface StudyHistoryItem {
  originalCard: CardWithContext;
  wasShifted: boolean;
}

export interface Session {
  queue: CardWithContext[];
  history: StudyHistoryItem[];
}
