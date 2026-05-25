import { getDb } from '@/data/db';
import { Review, Srs } from '@/data/types';
import { deleteSrs, upsertSrs } from '@/data/repository/kanji';
import { insertReview, removeLatestReview } from '@/data/repository/reviews';

export async function recordAnswer(newSrs: Srs, review: Review): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await upsertSrs(newSrs);
    await insertReview(review);
  });
}

// previousSrs: the SRS state before the answer was given, or null if the card was NEW
// (in which case the SRS row is deleted entirely to restore the unseen state).
export async function eraseAnswer(character: string, previousSrs: Srs | null): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await removeLatestReview(character);
    if (previousSrs == null) await deleteSrs(character);
    else await upsertSrs(previousSrs);
  });
}
