import { getDb } from '@/data/db';
import { Review, Srs, WordStat } from '@/data/types';
import { deleteSrs, upsertSrs } from '@/data/repository/kanji';
import { insertReview, removeLatestReview } from '@/data/repository/reviews';
import { deleteWordStat, upsertWordStat } from '@/data/repository/wordStats';

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

// One review of a masked word: every constituent kanji's new SRS + review row, plus the word's
// updated familiarity stat, committed together. Mirrors recordAnswer for the multi-kanji case.
export interface KanjiAnswer {
  srs: Srs;
  review: Review;
}

export async function recordWordAnswer(answers: KanjiAnswer[], wordStat: WordStat): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const a of answers) {
      await upsertSrs(a.srs);
      await insertReview(a.review);
    }
    await upsertWordStat(wordStat);
  });
}

// Reverses recordWordAnswer. Each prevSrs is the constituent's state before the answer (null when
// it was NEW → delete its row); prevWordStat is null when the word had never been seen before.
export interface KanjiUndo {
  character: string;
  prevSrs: Srs | null;
}

export async function eraseWordAnswer(
  undos: KanjiUndo[],
  prevWordStat: WordStat | null,
  wordId: number,
): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const u of undos) {
      await removeLatestReview(u.character);
      if (u.prevSrs == null) await deleteSrs(u.character);
      else await upsertSrs(u.prevSrs);
    }
    if (prevWordStat == null) await deleteWordStat(wordId);
    else await upsertWordStat(prevWordStat);
  });
}
