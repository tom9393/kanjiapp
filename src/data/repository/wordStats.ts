// Per-word study stats over the main DB. Words live in the read-only reference.db, so wordId
// is a bare integer reference (no foreign key) and stats are merged in JS rather than joined —
// the same split as WordListMember. Drives familiarity-biased word selection in studyQueueSource.
import { getDb } from '@/data/db';
import { WordStat } from '@/data/types';
import { placeholders } from '@/data/repository/mappers';

function mapWordStat(r: any): WordStat {
  return {
    wordId: r.wordId,
    firstSeen: r.firstSeen,
    lastSeen: r.lastSeen,
    timesSeen: r.timesSeen,
    familiarity: r.familiarity,
  };
}

export async function getWordStat(wordId: number): Promise<WordStat | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>('SELECT * FROM WordStat WHERE wordId = ?', [wordId]);
  return row ? mapWordStat(row) : null;
}

export async function getWordStatsByIds(ids: number[]): Promise<Map<number, WordStat>> {
  const out = new Map<number, WordStat>();
  if (ids.length === 0) return out;
  const db = await getDb();
  const CHUNK = 800; // one placeholder per id, well under SQLite's 999 bound-variable limit
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM WordStat WHERE wordId IN (${placeholders(chunk.length)})`,
      chunk,
    );
    for (const row of rows) out.set(row.wordId, mapWordStat(row));
  }
  return out;
}

export async function upsertWordStat(stat: WordStat): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO WordStat (wordId, firstSeen, lastSeen, timesSeen, familiarity)
     VALUES (?, ?, ?, ?, ?)`,
    [stat.wordId, stat.firstSeen, stat.lastSeen, stat.timesSeen, stat.familiarity],
  );
}

export async function deleteWordStat(wordId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM WordStat WHERE wordId = ?', [wordId]);
}

/** The stat row after one review: familiarity ±1 (− when the word was missed), timesSeen +1,
 *  lastSeen = now; firstSeen is preserved (or set to now the first time the word is seen). */
export function nextWordStat(
  prev: WordStat | null,
  wordId: number,
  correct: boolean,
  now: number,
): WordStat {
  const delta = correct ? 1 : -1;
  if (!prev) {
    return { wordId, firstSeen: now, lastSeen: now, timesSeen: 1, familiarity: delta };
  }
  return {
    wordId,
    firstSeen: prev.firstSeen,
    lastSeen: now,
    timesSeen: prev.timesSeen + 1,
    familiarity: prev.familiarity + delta,
  };
}
