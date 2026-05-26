// Words + example sentences, served from the prebuilt, read-only reference.db.
// Ported from KanjiRepository.kt.
import { getReferenceDb } from '@/data/db';
import { ExampleSentence, Word } from '@/data/types';
import {
  SENTENCE_CANDIDATE_LIMIT,
  isKanjiCode,
  mapSentence,
  mapWord,
} from '@/data/repository/mappers';

// limit omitted → all rows (SQLite treats LIMIT -1 as no upper bound).
export async function getWordsForKanji(character: string, limit?: number): Promise<Word[]> {
  const db = await getReferenceDb();
  const rows = await db.getAllAsync<any>(
    `SELECT w.* FROM word w
     INNER JOIN word_char_index wci ON w.id = wci.wordId
     WHERE wci.character = ?
     ORDER BY w.common DESC
     LIMIT ?`,
    [character, limit ?? -1],
  );
  return rows.map(mapWord);
}

export async function getSentencesForKanji(character: string, limit?: number): Promise<ExampleSentence[]> {
  const db = await getReferenceDb();
  const rows = await db.getAllAsync<any>(
    `SELECT s.* FROM example_sentence s
     INNER JOIN sentence_char_index sci ON s.id = sci.sentenceId
     WHERE sci.character = ?
     LIMIT ?`,
    [character, limit ?? -1],
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
