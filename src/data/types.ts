// Entity shapes ported from the Room entities (room/**).
import { CardState } from '@/domain/cardState';

export interface Kanji {
  character: string;
  strokes: number;
  grade: number;
  frequency: number;
  jlpt: number;
  /** Kanji Kentei (漢検) level, ×10-encoded: 10級→100 … 1級→10, 準2級→25, 準1級→15, 0 = none. */
  kanken: number;
  /** Comma-separated, joined in the seeder from a List<String>. */
  meanings: string;
  on: string;
  kun: string;
}

export interface Srs {
  character: string;
  type: CardState;
  due: number; // Unix seconds
  interval: number; // seconds
  factor: number; // ease x1000
  lapses: number;
}

export interface Review {
  id: number; // review time in ms (primary key)
  character: string;
  updateSequenceNumber: number;
  type: number; // CardState code
  interval: number;
  factor: number;
  ease: number; // CardEase ordinal
}

export interface Word {
  id: number;
  kanjiForm: string;
  kana: string;
  meaning: string;
  common: boolean;
}

export interface ExampleSentence {
  id: number;
  japanese: string;
  english: string;
}

/** Per-word study stats (main DB), keyed by the reference.db word id. familiarity starts at 0
 *  and moves ±1 per review; lower means more often missed, so it is served sooner. */
export interface WordStat {
  wordId: number;
  firstSeen: number; // Unix ms
  lastSeen: number; // Unix ms
  timesSeen: number;
  familiarity: number;
}

/** Mirrors room/relations/KanjiWithSrs.kt — rawSrs is null for cards never studied. */
export interface KanjiWithSrs {
  kanji: Kanji;
  rawSrs: Srs | null;
}

/** Default Srs row for a never-studied card (matches Srs(character) default in Kotlin). */
export function defaultSrs(character: string): Srs {
  return {
    character,
    type: CardState.NEW,
    due: 0,
    interval: 0,
    factor: 2500,
    lapses: 0,
  };
}

/** KanjiWithSrs.srs accessor — falls back to a NEW default when rawSrs is null. */
export function srsOf(card: KanjiWithSrs): Srs {
  return card.rawSrs ?? defaultSrs(card.kanji.character);
}

/** Ascending sort key for "most common first": frequency is a rank (1 = 日, the most common),
 *  but the ~10k unranked kanji store 0, so map 0 to Infinity to sort them last instead of first. */
export function frequencyRank(k: Kanji): number {
  return k.frequency || Infinity;
}

/** Decodes a ×10-encoded Kanji Kentei level into its display label, or null when there is none. */
export function kankenLabel(kanken: number): string | null {
  if (!kanken) return null;
  if (kanken === 25) return 'pre-2';
  if (kanken === 15) return 'pre-1';
  return String(kanken / 10);
}
