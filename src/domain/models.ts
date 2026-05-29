// Ported from study/logic/StudyModels.kt — the study session data model.
import { ExampleSentence, KanjiWithSrs, Srs, Word, WordStat } from '@/data/types';

export interface WordWithSentence {
  word: Word;
  sentence: ExampleSentence;
  formattedReading: string;
}

/** Word-driven review payload: the chosen word masked in its sentence, plus every kanji in the
 *  word's form (with SRS) — one answer rates them all. Absent on learning + single-kanji cards. */
export interface ReviewWord {
  word: Word;
  sentence: ExampleSentence;
  formattedReading: string;
  constituents: KanjiWithSrs[];
}

export interface CardWithContext {
  card: KanjiWithSrs;
  examples: WordWithSentence[];
  /** Stable identifier for React keys: kanji character, or `w${wordId}` for word-locked cards. */
  cardId: string;
  /** Word-list entries route through the Review flow even when their anchor kanji is NEW. */
  forceReview?: boolean;
  /** Present on SRS review cards served as a masked word; drives the word-review flow + rating. */
  reviewWord?: ReviewWord;
}

export interface StudyHistoryItem {
  originalCard: CardWithContext;
  wasShifted: boolean;
  /** Set when the item was a word answer (submitWordAnswer); carries what undo must reverse —
   *  each constituent's pre-answer SRS and the word's pre-answer stat (null = was unseen). */
  wordUndo?: {
    wordId: number;
    undos: { character: string; prevSrs: Srs | null }[];
    prevWordStat: WordStat | null;
  };
}

export interface Session {
  queue: CardWithContext[];
  history: StudyHistoryItem[];
  /** When true, answering a card advances the queue locally without touching SRS / reviews. */
  noSrs?: boolean;
}
