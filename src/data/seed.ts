// Ported from lib/AssetLoader.kt — seeds the Kanji table on first run. Instead of inlining
// kanji.json into the JS bundle (~4 MB) and parsing it here, the data ships as a compact,
// prebuilt SQLite file (kanjiseed.db, built offline by scripts/build-kanji-db.mjs with the
// meanings/on/kun arrays already joined into comma-separated strings — see db.ts). We import
// it, copy its rows into the main DB with a single ATTACH + INSERT … SELECT, then delete it:
// it is purely a seed source and is never queried at runtime.
import * as SQLite from 'expo-sqlite';
import { getDb, importKanjiSeedDb, KANJI_SEED_DB } from './db';

/** Seeds the Kanji table if empty. Returns true if seeding actually ran. */
export async function seedKanjiIfNeeded(): Promise<boolean> {
  const db = await getDb();
  const existing = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM Kanji');
  if ((existing?.c ?? 0) > 0) return false;

  await importKanjiSeedDb();
  const seedPath = `${SQLite.defaultDatabaseDirectory}/${KANJI_SEED_DB}`;
  await db.runAsync('ATTACH DATABASE ? AS kseed', seedPath);
  try {
    // Single atomic statement — column order matches the bundled table (see build script).
    await db.execAsync(
      `INSERT OR IGNORE INTO Kanji (character, strokes, grade, frequency, jlpt, kanken, meanings, "on", kun)
       SELECT character, strokes, grade, frequency, jlpt, kanken, meanings, "on", kun FROM kseed.Kanji`,
    );
  } finally {
    await db.runAsync('DETACH DATABASE kseed');
  }
  // The seed DB is no longer needed; drop it so we don't keep a redundant copy on disk.
  await SQLite.deleteDatabaseAsync(KANJI_SEED_DB);

  return true;
}
