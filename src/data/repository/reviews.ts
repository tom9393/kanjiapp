// Review-log reads and writes over the main DB. Ported from KanjiRepository.kt + the Review DAO.
import { getDb } from '@/data/db';
import { Review } from '@/data/types';

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

export async function countReviewsSince(startMs: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM Review WHERE id >= ?', [startMs]);
  return row?.c ?? 0;
}

export async function countAgainSince(startMs: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) AS c FROM Review WHERE id >= ? AND ease = 0',
    [startMs],
  );
  return row?.c ?? 0;
}

export async function countAllReviews(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM Review');
  return row?.c ?? 0;
}

/** Distinct local epoch-days that had at least one review, for streak computation. The local
 *  day is derived the same way as computeStats: floor((idSecs + zoneOffsetSecs) / 86400). */
export async function getDistinctStudyDays(zoneOffsetSecs: number): Promise<number[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ day: number }>(
    'SELECT DISTINCT CAST((id / 1000 + ?) / 86400 AS INTEGER) AS day FROM Review',
    [zoneOffsetSecs],
  );
  return rows.map((r) => r.day);
}
