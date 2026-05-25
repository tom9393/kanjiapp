// Ported from room/repositories/KanjiRepository.kt + the Room DAOs.
// Single access point for all DB operations, over expo-sqlite.
import { cardStateFromCode } from '@/domain/cardState';
import { getDb, getReferenceDb, getStrokesDb } from './db';
import { ExampleSentence, Kanji, KanjiWithSrs, Review, Srs, Word } from './types';

const SENTENCE_CANDIDATE_LIMIT = 500;

function isKanjiCode(code: number): boolean {
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

function placeholders(count: number): string {
  return new Array(count).fill('?').join(',');
}

function mapKanji(r: any): Kanji {
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

function mapKanjiWithSrs(r: any): KanjiWithSrs {
  return { kanji: mapKanji(r), rawSrs: mapSrsFromJoin(r) };
}

function mapWord(r: any): Word {
  return {
    id: r.id,
    kanjiForm: r.kanjiForm,
    kana: r.kana,
    meaning: r.meaning,
    common: !!r.common,
  };
}

function mapSentence(r: any): ExampleSentence {
  return { id: r.id, japanese: r.japanese, english: r.english };
}

const JOIN_SELECT = `
  SELECT k.*, s.type AS s_type, s.due AS s_due, s.interval AS s_interval,
         s.factor AS s_factor, s.lapses AS s_lapses
  FROM Kanji k LEFT JOIN Srs s ON k.character = s.character
`;

// --- Kanji + Srs reads -------------------------------------------------------

export async function getCharactersByYear(year: number): Promise<Kanji[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM Kanji WHERE grade = ?', [year]);
  return rows.map(mapKanji);
}

export async function getCharacterByYearWithSrs(year: number): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`${JOIN_SELECT} WHERE k.grade = ?`, [year]);
  return rows.map(mapKanjiWithSrs);
}

export async function getKanjiWithSrsByGrade(grade: number): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`${JOIN_SELECT} WHERE k.grade = ? ORDER BY k.frequency`, [grade]);
  return rows.map(mapKanjiWithSrs);
}

export async function getKanjiWithSrs(character: string): Promise<KanjiWithSrs | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`${JOIN_SELECT} WHERE k.character = ?`, [character]);
  return row ? mapKanjiWithSrs(row) : null;
}

export async function getDueCardsWithSrs(currentTime: number): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT k.*, s.type AS s_type, s.due AS s_due, s.interval AS s_interval,
            s.factor AS s_factor, s.lapses AS s_lapses
     FROM Kanji k INNER JOIN Srs s ON k.character = s.character
     WHERE s.due <= ?`,
    [currentTime],
  );
  return rows.map(mapKanjiWithSrs);
}

export async function getNewCardsWithSrs(limit: number): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM Kanji WHERE character NOT IN (SELECT character FROM Srs) LIMIT ?',
    [limit],
  );
  return rows.map(mapKanjiWithSrs); // rawSrs is null (no s_* columns)
}

export async function getKanjiWithSrsByCharacters(characters: string[]): Promise<KanjiWithSrs[]> {
  if (characters.length === 0) return [];
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `${JOIN_SELECT} WHERE k.character IN (${placeholders(characters.length)})`,
    characters,
  );
  return rows.map(mapKanjiWithSrs);
}

export async function getAllKanjiWithSrs(): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(JOIN_SELECT);
  return rows.map(mapKanjiWithSrs);
}

export async function getKanjiByCharacters(characters: string[]): Promise<Kanji[]> {
  if (characters.length === 0) return [];
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM Kanji WHERE character IN (${placeholders(characters.length)})`,
    characters,
  );
  return rows.map(mapKanji);
}

export async function getKanjiCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM Kanji');
  return row?.c ?? 0;
}

// --- Srs writes + counts -----------------------------------------------------

export async function upsertSrs(srs: Srs): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO Srs (character, type, due, interval, factor, lapses)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [srs.character, srs.type, srs.due, srs.interval, srs.factor, srs.lapses],
  );
}

export const updateState = upsertSrs;

export async function deleteSrs(character: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM Srs WHERE character = ?', [character]);
}

export async function countDueCards(currentTime: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM Srs WHERE due <= ?', [currentTime]);
  return row?.c ?? 0;
}

export async function countNewCards(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM Kanji WHERE character NOT IN (SELECT character FROM Srs)',
  );
  return row?.c ?? 0;
}

export async function getStudiedCharacters(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ character: string }>('SELECT character FROM Srs');
  return new Set(rows.map((r) => r.character));
}

// --- Review log --------------------------------------------------------------

export async function insertReview(review: Review): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO Review (id, character, updateSequenceNumber, type, interval, factor, ease)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [review.id, review.character, review.updateSequenceNumber, review.type, review.interval, review.factor, review.ease],
  );
}

export async function getLatestReview(character: string): Promise<Review | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Review>(
    'SELECT * FROM Review WHERE id = (SELECT MAX(id) FROM Review WHERE character = ?)',
    [character],
  );
  return row ?? null;
}

export async function removeLatestReview(character: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM Review WHERE id = (SELECT MAX(id) FROM Review WHERE character = ?)',
    [character],
  );
}

export async function getReviewHistory(character: string): Promise<Review[]> {
  const db = await getDb();
  return db.getAllAsync<Review>('SELECT * FROM Review WHERE character = ? ORDER BY id DESC', [character]);
}

export async function countNewCardsStudiedToday(todayStartMs: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(DISTINCT character) AS c FROM Review
     WHERE id >= ?
     AND character NOT IN (SELECT character FROM Review WHERE id < ?)`,
    [todayStartMs, todayStartMs],
  );
  return row?.c ?? 0;
}

export async function getAllReviews(): Promise<Review[]> {
  const db = await getDb();
  return db.getAllAsync<Review>('SELECT * FROM Review ORDER BY id ASC');
}

// --- Words + sentences (served from the prebuilt, read-only reference.db) ----

export async function getWordsForKanji(character: string, limit = 10): Promise<Word[]> {
  const db = await getReferenceDb();
  const rows = await db.getAllAsync<any>(
    `SELECT w.* FROM word w
     INNER JOIN word_char_index wci ON w.id = wci.wordId
     WHERE wci.character = ?
     ORDER BY w.common DESC
     LIMIT ?`,
    [character, limit],
  );
  return rows.map(mapWord);
}

export async function getSentencesForKanji(character: string, limit = 5): Promise<ExampleSentence[]> {
  const db = await getReferenceDb();
  const rows = await db.getAllAsync<any>(
    `SELECT s.* FROM example_sentence s
     INNER JOIN sentence_char_index sci ON s.id = sci.sentenceId
     WHERE sci.character = ?
     LIMIT ?`,
    [character, limit],
  );
  return rows.map(mapSentence);
}

export async function getWordCount(): Promise<number> {
  const db = await getReferenceDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM word');
  return row?.c ?? 0;
}

/**
 * Prefers a sentence whose kanji are all in allowedKanji, falling back to any candidate.
 * Mirrors KanjiRepository.getSentenceContaining.
 */
export async function getSentenceContaining(
  word: string,
  allowedKanji: Set<string>,
): Promise<ExampleSentence | null> {
  const anchor = [...word].find((c) => isKanjiCode(c.codePointAt(0)!));
  if (!anchor) return null;

  const db = await getReferenceDb();
  const candidates = await db.getAllAsync<any>(
    `SELECT DISTINCT s.* FROM example_sentence s
     INNER JOIN sentence_char_index sci ON s.id = sci.sentenceId
     WHERE sci.character = ? AND s.japanese LIKE '%' || ? || '%'
     LIMIT ?`,
    [anchor, word, SENTENCE_CANDIDATE_LIMIT],
  );
  const mapped = candidates.map(mapSentence);
  const preferred = mapped.find((sentence) =>
    [...sentence.japanese].every((ch) => {
      const isKanji = isKanjiCode(ch.codePointAt(0)!);
      return !isKanji || allowedKanji.has(ch);
    }),
  );
  return preferred ?? mapped[0] ?? null;
}

// --- Stroke order (served from the prebuilt, read-only strokes.db) ------------

/**
 * Stroke paths for a character, in stroke order — the `d` attributes KanjiVG defines.
 * Empty if the character has no diagram. The codepoint key matches parseStrokes() in
 * StrokeOrderDiagram.kt: the first code point as zero-padded, 5-digit lowercase hex.
 */
export async function getStrokes(character: string): Promise<string[]> {
  const codepoint = character.codePointAt(0)!.toString(16).padStart(5, '0');
  const db = await getStrokesDb();
  const row = await db.getFirstAsync<{ paths: string }>(
    'SELECT paths FROM stroke WHERE codepoint = ?',
    [codepoint],
  );
  return row ? (JSON.parse(row.paths) as string[]) : [];
}
