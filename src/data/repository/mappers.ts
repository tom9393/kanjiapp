// Row → domain-type mappers and SQL helpers shared by the repository modules.
// Ported from the Room DAOs / KanjiRepository.kt.
import { cardStateFromCode } from '@/domain/cardState';
import { ExampleSentence, Kanji, KanjiWithSrs, Srs, Word } from '@/data/types';

export const SENTENCE_CANDIDATE_LIMIT = 500;

export function isKanjiCode(code: number): boolean {
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

export function placeholders(count: number): string {
  return new Array(count).fill('?').join(',');
}

// --- Raw DB row shapes -------------------------------------------------------
// The columns each query returns, before mapping to domain types. Typing getAllAsync/getFirstAsync
// against these instead of `any` catches column renames and typos at the one boundary where
// untyped DB data crosses into the app.

/** A row of the Kanji table (also the `k.*` half of a JOIN_SELECT row). */
export interface RawKanjiRow {
  character: string;
  strokes: number;
  grade: number;
  frequency: number;
  jlpt: number;
  kanken: number;
  meanings: string;
  on: string;
  kun: string;
}

/** The Srs columns aliased as s_* by JOIN_SELECT. They travel as a group: a LEFT JOIN with no
 *  matching Srs row yields all-null, and the new-card queries omit them entirely — so on a
 *  RawKanjiWithSrsRow they are optional, and a present s_type implies the rest are present. */
export interface RawSrsColumns {
  s_type: number;
  s_due: number;
  s_interval: number;
  s_factor: number;
  s_lapses: number;
}

/** A Kanji row plus its optional joined Srs columns — the shape JOIN_SELECT returns. */
export type RawKanjiWithSrsRow = RawKanjiRow & Partial<RawSrsColumns>;

/** A row of the word table in the read-only reference.db (`common` is stored as 0/1). */
export interface RawWordRow {
  id: number;
  kanjiForm: string;
  kana: string;
  meaning: string;
  common: number;
}

/** A row of the example_sentence table in the read-only reference.db. */
export interface RawSentenceRow {
  id: number;
  japanese: string;
  english: string;
}

export function mapKanji(r: RawKanjiRow): Kanji {
  return {
    character: r.character,
    strokes: r.strokes,
    grade: r.grade,
    frequency: r.frequency,
    jlpt: r.jlpt,
    kanken: r.kanken,
    meanings: r.meanings,
    on: r.on,
    kun: r.kun,
  };
}

/** Joined rows alias Srs columns as s_* so they don't clash with Kanji.character. */
function mapSrsFromJoin(r: RawKanjiWithSrsRow): Srs | null {
  if (r.s_type == null) return null;
  // s_type present ⇒ the LEFT JOIN matched a row, so the rest of the s_* group is present too.
  const s = r as RawSrsColumns;
  return {
    character: r.character,
    type: cardStateFromCode(s.s_type),
    due: s.s_due,
    interval: s.s_interval,
    factor: s.s_factor,
    lapses: s.s_lapses,
  };
}

export function mapKanjiWithSrs(r: RawKanjiWithSrsRow): KanjiWithSrs {
  return { kanji: mapKanji(r), rawSrs: mapSrsFromJoin(r) };
}

export function mapWord(r: RawWordRow): Word {
  return {
    id: r.id,
    kanjiForm: r.kanjiForm,
    kana: r.kana,
    meaning: r.meaning,
    common: !!r.common,
  };
}

export function mapSentence(r: RawSentenceRow): ExampleSentence {
  return { id: r.id, japanese: r.japanese, english: r.english };
}

export const JOIN_SELECT = `
  SELECT k.*, s.type AS s_type, s.due AS s_due, s.interval AS s_interval,
         s.factor AS s_factor, s.lapses AS s_lapses
  FROM Kanji k LEFT JOIN Srs s ON k.character = s.character
`;
