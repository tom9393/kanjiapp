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
