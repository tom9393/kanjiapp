// User-created study lists. A kanji can appear in any number of lists; membership
// rows are keyed by (listId, character). Member reads join through Kanji + Srs so
// callers can drop the result straight into KanjiGrid.
import { getDb } from '@/data/db';
import { KanjiWithSrs } from '@/data/types';
import { JOIN_SELECT, mapKanjiWithSrs } from '@/data/repository/mappers';

export interface KanjiList {
  id: number;
  name: string;
  createdAt: number;
}

export interface KanjiListSummary extends KanjiList {
  memberCount: number;
}

export async function getLists(): Promise<KanjiListSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: number; name: string; createdAt: number; memberCount: number }>(
    `SELECT l.id, l.name, l.createdAt,
            (SELECT COUNT(*) FROM KanjiListMember m WHERE m.listId = l.id) AS memberCount
     FROM KanjiList l ORDER BY l.createdAt DESC`,
  );
  return rows;
}

export async function getList(id: number): Promise<KanjiList | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<KanjiList>(
    'SELECT id, name, createdAt FROM KanjiList WHERE id = ?',
    [id],
  );
  return row ?? null;
}

export async function createList(name: string): Promise<number> {
  const db = await getDb();
  const res = await db.runAsync(
    'INSERT INTO KanjiList (name, createdAt) VALUES (?, ?)',
    [name, Date.now()],
  );
  return res.lastInsertRowId as number;
}

export async function renameList(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE KanjiList SET name = ? WHERE id = ?', [name, id]);
}

export async function deleteList(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM KanjiList WHERE id = ?', [id]);
}

export async function getListMembers(listId: number): Promise<KanjiWithSrs[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `${JOIN_SELECT} INNER JOIN KanjiListMember m ON k.character = m.character WHERE m.listId = ?`,
    [listId],
  );
  return rows.map(mapKanjiWithSrs);
}

export async function getListMemberCharacters(listId: number): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ character: string }>(
    'SELECT character FROM KanjiListMember WHERE listId = ?',
    [listId],
  );
  return new Set(rows.map((r) => r.character));
}

export async function addKanjiToList(listId: number, character: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO KanjiListMember (listId, character, addedAt) VALUES (?, ?, ?)',
    [listId, character, Date.now()],
  );
}

export async function removeKanjiFromList(listId: number, character: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM KanjiListMember WHERE listId = ? AND character = ?',
    [listId, character],
  );
}

export async function getListIdsContaining(character: string): Promise<Set<number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ listId: number }>(
    'SELECT listId FROM KanjiListMember WHERE character = ?',
    [character],
  );
  return new Set(rows.map((r) => r.listId));
}
