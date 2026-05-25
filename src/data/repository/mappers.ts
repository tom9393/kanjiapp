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

export function mapKanji(r: any): Kanji {
  return {
    character: r.character,
    strokes: r.strokes,
    grade: r.grade,
    frequency: r.frequency,
    jlpt: r.jlpt,
    meanings: r.meanings,
    on: r.on,
    kun: r.kun,
  };
}

/** Joined rows alias Srs columns as s_* so they don't clash with Kanji.character. */
function mapSrsFromJoin(r: any): Srs | null {
  if (r.s_type == null) return null;
  return {
    character: r.character,
    type: cardStateFromCode(r.s_type),
    due: r.s_due,
    interval: r.s_interval,
    factor: r.s_factor,
    lapses: r.s_lapses,
  };
}

export function mapKanjiWithSrs(r: any): KanjiWithSrs {
  return { kanji: mapKanji(r), rawSrs: mapSrsFromJoin(r) };
}

export function mapWord(r: any): Word {
  return {
    id: r.id,
    kanjiForm: r.kanjiForm,
    kana: r.kana,
    meaning: r.meaning,
    common: !!r.common,
  };
}

export function mapSentence(r: any): ExampleSentence {
  return { id: r.id, japanese: r.japanese, english: r.english };
}

export const JOIN_SELECT = `
  SELECT k.*, s.type AS s_type, s.due AS s_due, s.interval AS s_interval,
         s.factor AS s_factor, s.lapses AS s_lapses
  FROM Kanji k LEFT JOIN Srs s ON k.character = s.character
`;
