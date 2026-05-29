// Kanji + Srs reads, writes, and counts over the main DB. Ported from KanjiRepository.kt
// + the Kanji/Srs Room DAOs.
import { getDb } from '@/data/db';
import { Kanji, KanjiWithSrs, Srs } from '@/data/types';
import {
  JOIN_SELECT,
  mapKanji,
  mapKanjiWithSrs,
  placeholders,
  RawKanjiRow,
  RawKanjiWithSrsRow,
} from '@/data/repository/mappers';

// --- Kanji + Srs reads -------------------------------------------------------

export async function getCharactersByYear(year: number): Promise<Kanji[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawKanjiRow>('SELECT * FROM Kanji WHERE grade = ?', [year]);
  return rows.map(mapKanji);
}

export async function getCharacterByYearWithSrs(year: number): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawKanjiWithSrsRow>(`${JOIN_SELECT} WHERE k.grade = ?`, [year]);
  return rows.map(mapKanjiWithSrs);
}

export type LevelField = 'grade' | 'jlpt' | 'kanken';

export async function getCharactersByLevelWithSrs(field: LevelField, value: number): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawKanjiWithSrsRow>(`${JOIN_SELECT} WHERE k.${field} = ?`, [value]);
  return rows.map(mapKanjiWithSrs);
}

export async function getKanjiWithSrs(character: string): Promise<KanjiWithSrs | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<RawKanjiWithSrsRow>(`${JOIN_SELECT} WHERE k.character = ?`, [character]);
  return row ? mapKanjiWithSrs(row) : null;
}

export async function getDueCardsWithSrs(currentTime: number): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawKanjiWithSrsRow>(
    `SELECT k.*, s.type AS s_type, s.due AS s_due, s.interval AS s_interval,
            s.factor AS s_factor, s.lapses AS s_lapses
     FROM Kanji k INNER JOIN Srs s ON k.character = s.character
     WHERE s.due <= ?
       AND s.character NOT IN (SELECT character FROM KanjiFlag WHERE suspended = 1)`,
    [currentTime],
  );
  return rows.map(mapKanjiWithSrs);
}

export async function getNewCardsWithSrs(limit: number): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawKanjiRow>(
    `SELECT * FROM Kanji WHERE character NOT IN (SELECT character FROM Srs)
       AND character NOT IN (SELECT character FROM KanjiFlag WHERE suspended = 1) LIMIT ?`,
    [limit],
  );
  return rows.map(mapKanjiWithSrs); // rawSrs is null (no s_* columns)
}

export async function getKanjiWithSrsByCharacters(characters: string[]): Promise<KanjiWithSrs[]> {
  if (characters.length === 0) return [];
  const db = await getDb();
  const rows = await db.getAllAsync<RawKanjiWithSrsRow>(
    `${JOIN_SELECT} WHERE k.character IN (${placeholders(characters.length)})`,
    characters,
  );
  return rows.map(mapKanjiWithSrs);
}

export async function getAllKanjiWithSrs(): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawKanjiWithSrsRow>(JOIN_SELECT);
  return rows.map(mapKanjiWithSrs);
}

export async function getKanjiByCharacters(characters: string[]): Promise<Kanji[]> {
  if (characters.length === 0) return [];
  const db = await getDb();
  const out: Kanji[] = [];
  const CHUNK = 800; // one placeholder per character; well under SQLite's 999 bound-variable limit
  for (let i = 0; i < characters.length; i += CHUNK) {
    const chunk = characters.slice(i, i + CHUNK);
    const rows = await db.getAllAsync<RawKanjiRow>(
      `SELECT * FROM Kanji WHERE character IN (${placeholders(chunk.length)})`,
      chunk,
    );
    for (const row of rows) out.push(mapKanji(row));
  }
  return out;
}

export async function getKanjiCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM Kanji');
  return row?.c ?? 0;
}

// --- Srs writes + counts -----------------------------------------------------

export async function upsertSrs(srs: Srs): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO Srs (character, type, due, interval, factor, lapses)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [srs.character, srs.type, srs.due, srs.interval, srs.factor, srs.lapses],
  );
}

export const updateState = upsertSrs;

export async function deleteSrs(character: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM Srs WHERE character = ?', [character]);
}

export async function countDueCards(currentTime: number): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM Srs WHERE due <= ?
       AND character NOT IN (SELECT character FROM KanjiFlag WHERE suspended = 1)`,
    [currentTime],
  );
  return row?.c ?? 0;
}

export async function countNewCards(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM Kanji WHERE character NOT IN (SELECT character FROM Srs)
       AND character NOT IN (SELECT character FROM KanjiFlag WHERE suspended = 1)`,
  );
  return row?.c ?? 0;
}

export async function getStudiedCharacters(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ character: string }>('SELECT character FROM Srs');
  return new Set(rows.map((r) => r.character));
}
