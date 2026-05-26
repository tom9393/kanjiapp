// Ported from study/logic/StudyQueueSource.kt. Filters/orders cards from the repository and
// hydrates each with up to WORD_OPTIONS_PER_CARD example words (+ a chosen sentence).
// Examples stay empty until the JMdict/Tatoeba pipeline is ported (word tables are empty).
import {
  countDueCards,
  countNewCards,
  getCharacterByYearWithSrs,
  getDueCardsWithSrs,
  getKanjiByCharacters,
  getNewCardsWithSrs,
  getStudiedCharacters,
} from '@/data/repository/kanji';
import { getSentenceContaining, getWordsForKanji } from '@/data/repository/reference';
import { countNewCardsStudiedToday } from '@/data/repository/reviews';
import { Kanji, KanjiWithSrs } from '@/data/types';
import { getDailyResetMs } from '@/settings/preferences';
import * as settings from '@/settings/settingsProvider';
import { CardWithContext, WordWithSentence } from './models';
import { formatWordReading, isKanji } from './readingFormatter';

const WORD_OPTIONS_PER_CARD = 5;

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
