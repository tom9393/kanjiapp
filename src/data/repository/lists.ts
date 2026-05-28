// User-created study lists. A list can hold kanji members (joined through Kanji + Srs
// so the rows drop straight into KanjiGrid) and word members (resolved against the
// read-only reference.db by id). Membership tables are keyed by (listId, character)
// and (listId, wordId) respectively.
import { getDb } from '@/data/db';
import { KanjiWithSrs, Word } from '@/data/types';
import { JOIN_SELECT, mapKanjiWithSrs } from '@/data/repository/mappers';
import { getWordsByIds } from '@/data/repository/reference';

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
            ((SELECT COUNT(*) FROM KanjiListMember m WHERE m.listId = l.id)
              + (SELECT COUNT(*) FROM WordListMember w WHERE w.listId = l.id)) AS memberCount
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

export async function getListWordIds(listId: number): Promise<number[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ wordId: number }>(
    'SELECT wordId FROM WordListMember WHERE listId = ? ORDER BY addedAt ASC',
    [listId],
  );
  return rows.map((r) => r.wordId);
}

export async function getListWords(listId: number): Promise<Word[]> {
  const ids = await getListWordIds(listId);
  if (ids.length === 0) return [];
  const words = await getWordsByIds(ids);
  // Preserve list order (oldest addition first); getWordsByIds returns DB order.
  const byId = new Map(words.map((w) => [w.id, w]));
  return ids.map((id) => byId.get(id)).filter((w): w is Word => w != null);
}

export async function addWordToList(listId: number, wordId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO WordListMember (listId, wordId, addedAt) VALUES (?, ?, ?)',
    [listId, wordId, Date.now()],
  );
}

export async function removeWordFromList(listId: number, wordId: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM WordListMember WHERE listId = ? AND wordId = ?',
    [listId, wordId],
  );
}

export async function getListIdsContainingWord(wordId: number): Promise<Set<number>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ listId: number }>(
    'SELECT listId FROM WordListMember WHERE wordId = ?',
    [wordId],
  );
  return new Set(rows.map((r) => r.listId));
}
