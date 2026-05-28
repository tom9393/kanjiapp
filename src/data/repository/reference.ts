// Words + example sentences, served from the prebuilt, read-only reference.db.
// Ported from KanjiRepository.kt.
import { getReferenceDb } from '@/data/db';
import { ExampleSentence, Word } from '@/data/types';
import {
  SENTENCE_CANDIDATE_LIMIT,
  isKanjiCode,
  mapSentence,
  mapWord,
  placeholders,
} from '@/data/repository/mappers';
import { parseQuery } from '@/domain/search';

const WORD_SEARCH_LIMIT = 60;

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

export async function getWordById(id: number): Promise<Word | null> {
  const db = await getReferenceDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM word WHERE id = ?', [id]);
  return row ? mapWord(row) : null;
}

export async function getWordsByIds(ids: number[]): Promise<Word[]> {
  if (ids.length === 0) return [];
  const db = await getReferenceDb();
  const out: Word[] = [];
  const CHUNK = 800; // one placeholder per id; well under SQLite's 999 bound-variable limit
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM word WHERE id IN (${placeholders(chunk.length)})`,
      chunk,
    );
    for (const row of rows) out.push(mapWord(row));
  }
  return out;
}

export async function getSentenceById(id: number): Promise<ExampleSentence | null> {
  const db = await getReferenceDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM example_sentence WHERE id = ?', [id]);
  return row ? mapSentence(row) : null;
}

// Resolves plain (dictionary) forms to their best matching word, keyed by the form. Used by the
// sentence parser, which generates many candidate forms per sentence and resolves them in one
// pass. A form matches a word's written form OR its reading; when several words share a form the
// common one (then the shortest written form) wins. The kana column is unindexed, so this scans
// the word table — fine for a one-off parse, but the candidate list is chunked to stay under
// SQLite's bound-variable limit.
export async function lookupWordsByForms(forms: string[]): Promise<Map<string, Word>> {
  const unique = [...new Set(forms)].filter((f) => f.length > 0);
  const out = new Map<string, Word>();
  if (unique.length === 0) return out;

  const db = await getReferenceDb();
  const isBetter = (a: Word, b: Word) =>
    a.common !== b.common ? a.common : a.kanjiForm.length < b.kanjiForm.length;

  const CHUNK = 400; // two placeholders per form (kanjiForm + kana), well under SQLite's 999 limit
  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    const ph = placeholders(chunk.length);
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM word WHERE kanjiForm IN (${ph}) OR kana IN (${ph})`,
      [...chunk, ...chunk],
    );
    const wanted = new Set(chunk);
    for (const word of rows.map(mapWord)) {
      for (const key of [word.kanjiForm, word.kana]) {
        if (!wanted.has(key)) continue;
        const current = out.get(key);
        if (!current || isBetter(word, current)) out.set(key, word);
      }
    }
  }
  return out;
}

// Sentences whose Japanese text contains the whole word. Anchored on the word's first kanji
// (via the indexed char column) so the LIKE only scans that kanji's sentences, mirroring
// getSentenceContaining's strategy but returning the full list.
export async function getSentencesContainingWord(word: Word, limit = 20): Promise<ExampleSentence[]> {
  const anchor = [...word.kanjiForm].find((c) => isKanjiCode(c.codePointAt(0)!));
  if (!anchor) return [];
  const db = await getReferenceDb();
  const rows = await db.getAllAsync<any>(
    `SELECT DISTINCT s.* FROM example_sentence s
     INNER JOIN sentence_char_index sci ON s.id = sci.sentenceId
     WHERE sci.character = ? AND s.japanese LIKE '%' || ? || '%'
     LIMIT ?`,
    [anchor, word.kanjiForm, limit],
  );
  return rows.map(mapSentence);
}

// Searches words by reading (kana prefix), kanji form (prefix), or English meaning (substring).
// Latin input is folded to kana for the reading match; English-looking input (e.g. "water")
// falls through to the meaning match. Reading/form matches are listed before meaning matches.
export async function searchWords(input: string, limit = WORD_SEARCH_LIMIT): Promise<Word[]> {
  const q = parseQuery(input);
  if (!q) return [];
  const db = await getReferenceDb();

  const out: Word[] = [];
  const seen = new Set<number>();
  const add = (rows: any[]) => {
    for (const w of rows.map(mapWord)) {
      if (!seen.has(w.id)) {
        seen.add(w.id);
        out.push(w);
      }
    }
  };

  // Reading prefix (kana) and, for kanji input, kanji-form prefix.
  if (q.readingLike || q.hasJapanese) {
    const conds = ['kana LIKE ?', 'kana LIKE ?'];
    const params: (string | number)[] = [`${q.hiragana}%`, `${q.katakana}%`];
    if (q.hasJapanese) {
      conds.push('kanjiForm LIKE ?');
      params.push(`${q.raw}%`);
    }
    add(
      await db.getAllAsync<any>(
        `SELECT * FROM word WHERE ${conds.join(' OR ')}
         ORDER BY common DESC, length(kanjiForm) LIMIT ?`,
        [...params, limit],
      ),
    );
  }

  // English meaning substring (Latin input), filling any remaining slots.
  if (!q.hasJapanese && out.length < limit) {
    add(
      await db.getAllAsync<any>(
        `SELECT * FROM word WHERE meaning LIKE ?
         ORDER BY common DESC, length(kanjiForm) LIMIT ?`,
        [`%${q.raw}%`, limit],
      ),
    );
  }

  return out.slice(0, limit);
}
