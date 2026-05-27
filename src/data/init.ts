// One-time DB bootstrap: create schema, seed kanji, and import the bundled reference.db.
// Memoised so it runs once per launch.
import { getReferenceDb, getStrokesDb, initSchema, migrateKankenColumn } from './db';
import { seedKanjiIfNeeded } from './seed';

let readyPromise: Promise<void> | null = null;

export function ensureDbReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = (async () => {
      await initSchema();
      await migrateKankenColumn(); // no-op on fresh installs; backfills the column on older DBs
      await seedKanjiIfNeeded();
      // Copy reference.db + strokes.db out of assets on first launch (no-op afterwards) so
      // the first study session / kanji detail view doesn't pay for the copy mid-flow.
      await getReferenceDb();
      await getStrokesDb();
    })();
  }
  return readyPromise;
}
