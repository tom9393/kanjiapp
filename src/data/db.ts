import * as SQLite from 'expo-sqlite';

// Schema mirrors room/Db.kt (version 4) entities. Table names follow Room defaults:
// entity class name for Kanji/Srs/Review. "on" is quoted because it is a SQLite keyword.
// The reference data (word/example_sentence + char-index tables) lives in a separate,
// read-only, prebuilt database (reference.db) bundled in assets — see getReferenceDb().
const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS Kanji (
  character TEXT PRIMARY KEY NOT NULL,
  strokes INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  frequency INTEGER NOT NULL,
  jlpt INTEGER NOT NULL,
  kanken INTEGER NOT NULL DEFAULT 0,
  meanings TEXT NOT NULL,
  "on" TEXT NOT NULL,
  kun TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Srs (
  character TEXT PRIMARY KEY NOT NULL,
  type INTEGER NOT NULL,
  due INTEGER NOT NULL,
  interval INTEGER NOT NULL,
  factor INTEGER NOT NULL,
  lapses INTEGER NOT NULL,
  FOREIGN KEY (character) REFERENCES Kanji (character) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Review (
  id INTEGER PRIMARY KEY NOT NULL,
  character TEXT NOT NULL,
  updateSequenceNumber INTEGER NOT NULL,
  type INTEGER NOT NULL,
  interval INTEGER NOT NULL,
  factor INTEGER NOT NULL,
  ease INTEGER NOT NULL,
  FOREIGN KEY (character) REFERENCES Kanji (character) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS index_Review_character ON Review (character);

-- Per-kanji user flags, separate from Srs because a never-studied kanji has no Srs row
-- (see getNewCardsWithSrs) yet can still be favorited or suspended. Suspended kanji are
-- excluded from the study queue; favorites are listed on the Favorites screen.
CREATE TABLE IF NOT EXISTS KanjiFlag (
  character TEXT PRIMARY KEY NOT NULL,
  favorite INTEGER NOT NULL DEFAULT 0,
  suspended INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (character) REFERENCES Kanji (character) ON DELETE CASCADE
);
`;

// The prebuilt reference database, bundled in assets. It is generated offline by
// scripts/build-reference-db.mjs (the replacement for the native ReferenceDataDownloader)
// and holds the word / example_sentence tables and their char-index tables.
const REFERENCE_DB = 'reference.db';
const REFERENCE_ASSET = require('../../assets/data/reference.db');

// The prebuilt stroke-order database, bundled in assets. Generated offline by
// scripts/build-stroke-db.mjs from the KanjiVG SVG set; holds one row of stroke paths
// per kanji (replacing the native app's bundled per-file SVG parsing).
const STROKES_DB = 'strokes.db';
const STROKES_ASSET = require('../../assets/data/strokes.db');

// The prebuilt kanji-seed database, bundled in assets. Generated offline by
// scripts/build-kanji-db.mjs from kanji.json; holds only the Kanji table, pre-joined.
// Unlike reference.db/strokes.db it is NOT queried at runtime: seedKanjiIfNeeded() copies
// its rows into the main DB once and then deletes it (see seed.ts). Its name is distinct
// from the main app DB ('kanji.db') so the import can never clobber user SRS data.
export const KANJI_SEED_DB = 'kanjiseed.db';
const KANJI_SEED_ASSET = require('../../assets/data/kanjiseed.db');

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let referenceDbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let strokesDbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('kanji.db');
  }
  return dbPromise;
}

export async function initSchema(): Promise<void> {
  const db = await getDb();
  await db.execAsync(SCHEMA);
}

// Adds the kanken column to a pre-existing Kanji table and backfills it from the bundled
// seed DB. Fresh installs already get the column (and its values) from SCHEMA + seeding, so
// this is a no-op there: the missing column is the sole trigger. Must run after initSchema()
// and before any query that reads kanken. Idempotent — once the column exists it returns.
export async function migrateKankenColumn(): Promise<void> {
  const db = await getDb();
  const cols = await db.getAllAsync<{ name: string }>("PRAGMA table_info('Kanji')");
  if (cols.some((c) => c.name === 'kanken')) return;

  await db.execAsync('ALTER TABLE Kanji ADD COLUMN kanken INTEGER NOT NULL DEFAULT 0');
  await importKanjiSeedDb();
  const seedPath = `${SQLite.defaultDatabaseDirectory}/${KANJI_SEED_DB}`;
  await db.runAsync('ATTACH DATABASE ? AS kseed', seedPath);
  try {
    // Both databases have a table named Kanji, so the outer table must be qualified as
    // main.Kanji — an unqualified "Kanji" inside the subquery binds to kseed.Kanji instead,
    // making the correlation always true and copying one arbitrary row's value into every row.
    await db.execAsync(
      `UPDATE Kanji SET kanken = (SELECT kanken FROM kseed.Kanji WHERE kseed.Kanji.character = main.Kanji.character)
       WHERE main.Kanji.character IN (SELECT character FROM kseed.Kanji)`,
    );
  } finally {
    await db.runAsync('DETACH DATABASE kseed');
  }
  await SQLite.deleteDatabaseAsync(KANJI_SEED_DB);
}

// Imports reference.db from the bundled asset into the SQLite directory on first launch
// (a no-op on later launches), then opens it. Kept as a second connection rather than an
// ATTACH because no query joins reference data against the Kanji/Srs/Review tables.
export function getReferenceDb(): Promise<SQLite.SQLiteDatabase> {
  if (!referenceDbPromise) {
    referenceDbPromise = (async () => {
      await SQLite.importDatabaseFromAssetAsync(REFERENCE_DB, { assetId: REFERENCE_ASSET });
      return SQLite.openDatabaseAsync(REFERENCE_DB);
    })().catch((e) => {
      referenceDbPromise = null; // allow a later retry instead of caching the failure
      throw e;
    });
  }
  return referenceDbPromise;
}

// Imports strokes.db from the bundled asset on first launch (a no-op afterwards), then
// opens it. A separate read-only connection like reference.db — nothing joins stroke data
// to the Kanji/Srs/Review tables.
export function getStrokesDb(): Promise<SQLite.SQLiteDatabase> {
  if (!strokesDbPromise) {
    strokesDbPromise = (async () => {
      await SQLite.importDatabaseFromAssetAsync(STROKES_DB, { assetId: STROKES_ASSET });
      return SQLite.openDatabaseAsync(STROKES_DB);
    })().catch((e) => {
      strokesDbPromise = null; // allow a later retry instead of caching the failure
      throw e;
    });
  }
  return strokesDbPromise;
}

// Imports kanjiseed.db from the bundled asset into the SQLite directory (a no-op if it
// already exists), so seedKanjiIfNeeded() can ATTACH it by path. No connection is opened
// or kept: it is read once via ATTACH and then deleted.
export function importKanjiSeedDb(): Promise<void> {
  return SQLite.importDatabaseFromAssetAsync(KANJI_SEED_DB, { assetId: KANJI_SEED_ASSET });
}
