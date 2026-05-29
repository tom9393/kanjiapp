// Per-kanji user flags (favorite / suspended) over the KanjiFlag table. A row is created
// lazily the first time either flag is set; the upsert preserves the flag it isn't changing.
import { getDb } from '@/data/db';
import { KanjiWithSrs } from '@/data/types';
import { JOIN_SELECT, mapKanjiWithSrs, RawKanjiWithSrsRow } from '@/data/repository/mappers';

export interface KanjiFlags {
  favorite: boolean;
  suspended: boolean;
}

export async function getFlags(character: string): Promise<KanjiFlags> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ favorite: number; suspended: number }>(
    'SELECT favorite, suspended FROM KanjiFlag WHERE character = ?',
    [character],
  );
  return { favorite: !!row?.favorite, suspended: !!row?.suspended };
}

export async function setFavorite(character: string, value: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO KanjiFlag (character, favorite, suspended) VALUES (?, ?, 0)
     ON CONFLICT(character) DO UPDATE SET favorite = excluded.favorite`,
    [character, value ? 1 : 0],
  );
}

export async function setSuspended(character: string, value: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO KanjiFlag (character, favorite, suspended) VALUES (?, 0, ?)
     ON CONFLICT(character) DO UPDATE SET suspended = excluded.suspended`,
    [character, value ? 1 : 0],
  );
}

export async function getSuspendedCharacters(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ character: string }>(
    'SELECT character FROM KanjiFlag WHERE suspended = 1',
  );
  return new Set(rows.map((r) => r.character));
}

export async function getFavoriteKanji(): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawKanjiWithSrsRow>(
    `${JOIN_SELECT} INNER JOIN KanjiFlag f ON k.character = f.character WHERE f.favorite = 1`,
  );
  return rows.map(mapKanjiWithSrs);
}
