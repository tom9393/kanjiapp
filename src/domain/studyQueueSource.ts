// Ported from study/logic/StudyQueueSource.kt. Filters/orders cards from the repository and
// hydrates each with up to WORD_OPTIONS_PER_CARD example words (+ a chosen sentence).
// Examples stay empty until the JMdict/Tatoeba pipeline is ported (word tables are empty).
import {
  countDueCards,
  countNewCards,
  getCharacterByYearWithSrs,
  getCharactersByLevelWithSrs,
  getDueCardsWithSrs,
  getKanjiByCharacters,
  getNewCardsWithSrs,
  getStudiedCharacters,
  type LevelField,
} from '@/data/repository/kanji';
import { getListMembers } from '@/data/repository/lists';
import { getSentenceContaining, getWordsForKanji } from '@/data/repository/reference';
import { countNewCardsStudiedToday } from '@/data/repository/reviews';
import { frequencyRank, Kanji, KanjiWithSrs } from '@/data/types';
import { getDailyResetMs } from '@/settings/preferences';
import * as settings from '@/settings/settingsProvider';
import { CardWithContext, WordWithSentence } from './models';
import { formatWordReading, isKanji } from './readingFormatter';

const WORD_OPTIONS_PER_CARD = 5;
export const CUSTOM_CHUNK_SIZE = 10;

export interface CustomFilter {
  category: LevelField;
  level: number;
}

export interface TodayCounts {
  dueCount: number;
  newCount: number;
  extraAvailable: boolean;
}

export async function countDueAndNew(): Promise<TodayCounts> {
  const remainingNew = await remainingNewCards();
  const currentTime = Math.floor(Date.now() / 1000);
  const dueCount = await countDueCards(currentTime);
  const totalNewInDb = await countNewCards();
  const newCount = Math.min(totalNewInDb, remainingNew);
  const extraAvailable = remainingNew === 0 && totalNewInDb > 0;
  return { dueCount, newCount, extraAvailable };
}

export async function loadDueAndNew(): Promise<CardWithContext[]> {
  const remainingNew = await remainingNewCards();
  const currentTime = Math.floor(Date.now() / 1000);
  const due = await getDueCardsWithSrs(currentTime);
  const newCards = remainingNew > 0 ? await getNewCardsWithSrs(remainingNew) : [];
  return hydrateAll([...due, ...newCards]);
}

export async function loadByYear(year: number): Promise<CardWithContext[]> {
  return hydrateAll(await getCharacterByYearWithSrs(year));
}

export async function loadExtra(n: number): Promise<CardWithContext[]> {
  return hydrateAll(await getNewCardsWithSrs(n));
}

export async function loadList(listId: number): Promise<CardWithContext[]> {
  const members = await getListMembers(listId);
  members.sort((a, b) => frequencyRank(a.kanji) - frequencyRank(b.kanji));
  return hydrateAll(members);
}

async function loadCustomSorted(filter: CustomFilter): Promise<KanjiWithSrs[]> {
  const all = await getCharactersByLevelWithSrs(filter.category, filter.level);
  return all.sort((a, b) => frequencyRank(a.kanji) - frequencyRank(b.kanji));
}

export async function listCustomChunks(filter: CustomFilter): Promise<{ start: number; characters: string[] }[]> {
  const sorted = await loadCustomSorted(filter);
  const chunks: { start: number; characters: string[] }[] = [];
  for (let i = 0; i < sorted.length; i += CUSTOM_CHUNK_SIZE) {
    chunks.push({ start: i, characters: sorted.slice(i, i + CUSTOM_CHUNK_SIZE).map((k) => k.kanji.character) });
  }
  return chunks;
}

export async function loadCustomChunk(filter: CustomFilter, chunkIndex: number): Promise<CardWithContext[]> {
  const sorted = await loadCustomSorted(filter);
  const start = chunkIndex * CUSTOM_CHUNK_SIZE;
  return hydrateAll(sorted.slice(start, start + CUSTOM_CHUNK_SIZE));
}

async function hydrateAll(cards: KanjiWithSrs[]): Promise<CardWithContext[]> {
  const kanjiCache = new Map<string, Kanji>();
  const studiedChars = await getStudiedCharacters();
  const result: CardWithContext[] = [];
  for (const card of cards) {
    result.push(await hydrate(card, studiedChars, kanjiCache));
  }
  return result;
}

async function hydrate(
  card: KanjiWithSrs,
  studiedChars: Set<string>,
  kanjiCache: Map<string, Kanji>,
): Promise<CardWithContext> {
  const allowedKanji = new Set(studiedChars);
  allowedKanji.add(card.kanji.character);
  const words = shuffle(await getWordsForKanji(card.kanji.character, 10));
  const examples = await buildExamples(words, allowedKanji, kanjiCache);
  return { card, examples };
}

async function buildExamples(
  words: { kanjiForm: string; kana: string }[],
  allowedKanji: Set<string>,
  kanjiCache: Map<string, Kanji>,
): Promise<WordWithSentence[]> {
  const result: WordWithSentence[] = [];
  for (const word of words as any[]) {
    if (result.length >= WORD_OPTIONS_PER_CARD) break;
    const neededChars = new Set([...word.kanjiForm].filter((c) => isKanji(c as string)) as string[]);
    if ([...neededChars].some((c) => !allowedKanji.has(c))) continue;
    const sentence = await getSentenceContaining(word.kanjiForm, allowedKanji);
    if (!sentence) continue;

    const missing = [...neededChars].filter((c) => !kanjiCache.has(c));
    if (missing.length > 0) {
      const fetched = await getKanjiByCharacters(missing);
      for (const k of fetched) kanjiCache.set(k.character, k);
    }
    const info = new Map<string, Kanji>();
    for (const ch of neededChars) {
      const k = kanjiCache.get(ch);
      if (k) info.set(ch, k);
    }
    const formatted = formatWordReading(word.kanjiForm, word.kana, info);
    result.push({ word, sentence, formattedReading: formatted });
  }
  return result;
}

async function remainingNewCards(): Promise<number> {
  const resetHour = await settings.getResetHour();
  const todayStartMs = getDailyResetMs(resetHour);
  const studiedToday = await countNewCardsStudiedToday(todayStartMs);
  const newLimit = await settings.getNewCardsLimit();
  return Math.max(0, newLimit - studiedToday);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
