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
  getKanjiWithSrs,
  getKanjiWithSrsByCharacters,
  getNewCardsWithSrs,
  getStudiedCharacters,
  type LevelField,
} from '@/data/repository/kanji';
import { getListMembers, getListWords } from '@/data/repository/lists';
import { getSentenceContaining, getWordsForKanji } from '@/data/repository/reference';
import { countNewCardsStudiedToday } from '@/data/repository/reviews';
import { getWordStatsByIds } from '@/data/repository/wordStats';
import { byFrequency, Kanji, KanjiWithSrs, srsOf, Word, WordStat } from '@/data/types';
import { CardState } from '@/domain/cardState';
import { getDailyResetMs, ReviewWordSelection } from '@/settings/preferences';
import * as settings from '@/settings/settingsProvider';
import { CardWithContext, ReviewWord, WordWithSentence } from './models';
import { formatWordReading, isKanji } from './readingFormatter';

const WORD_OPTIONS_PER_CARD = 5;
const REVIEW_WORD_CANDIDATES = 20; // words considered per due kanji before familiarity ordering
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
  const [members, words] = await Promise.all([getListMembers(listId), getListWords(listId)]);
  members.sort(byFrequency);
  const studiedChars = await getStudiedCharacters();
  const kanjiCache = new Map<string, Kanji>();
  const cards: CardWithContext[] = [];
  for (const m of members) cards.push(await hydrate(m, studiedChars, kanjiCache));
  for (const w of words) {
    const card = await hydrateWord(w, studiedChars, kanjiCache);
    if (card) cards.push(card);
  }
  return cards;
}

async function loadCustomSorted(filter: CustomFilter): Promise<KanjiWithSrs[]> {
  const all = await getCharactersByLevelWithSrs(filter.category, filter.level);
  return all.sort(byFrequency);
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
  return hydrateAll(sorted.slice(start, start + CUSTOM_CHUNK_SIZE), false);
}

// Builds the session queue. Review cards are served as a masked word (pickReviewWord); answering
// one rates every kanji in that word, so any of those kanji that are also in this queue are
// "consumed" — dropped here so they don't get a second card. New / learning cards are untouched.
// wordReview is off for noSrs sessions (custom study) so they keep the original single-card
// behaviour; SRS sessions (due/new, year) serve review cards as masked words + consume duplicates.
async function hydrateAll(cards: KanjiWithSrs[], wordReview = true): Promise<CardWithContext[]> {
  const kanjiCache = new Map<string, Kanji>();
  const studiedChars = await getStudiedCharacters();
  const selection = wordReview ? await settings.getReviewWordSelection() : 'weighted';
  const present = new Set(cards.map((c) => c.kanji.character));
  const consumed = new Set<string>();
  const result: CardWithContext[] = [];
  for (const card of cards) {
    if (consumed.has(card.kanji.character)) continue;
    const built = await buildCard(card, studiedChars, kanjiCache, wordReview, selection);
    result.push(built);
    if (built.reviewWord) {
      for (const k of built.reviewWord.constituents) {
        if (present.has(k.kanji.character)) consumed.add(k.kanji.character);
      }
    }
  }
  return result;
}

// Review cards (REVIEW state) are served as a masked word when one is available; everything else
// (new + learning + relearning, or a review kanji with no usable word) falls back to hydrate().
async function buildCard(
  card: KanjiWithSrs,
  studiedChars: Set<string>,
  kanjiCache: Map<string, Kanji>,
  wordReview: boolean,
  selection: ReviewWordSelection,
): Promise<CardWithContext> {
  if (wordReview && card.rawSrs != null && srsOf(card).type === CardState.REVIEW) {
    const reviewWord = await pickReviewWord(card.kanji, studiedChars, selection);
    if (reviewWord) {
      const { word, sentence, formattedReading } = reviewWord;
      return {
        card,
        examples: [{ word, sentence, formattedReading }],
        cardId: card.kanji.character,
        reviewWord,
      };
    }
  }
  return hydrate(card, studiedChars, kanjiCache);
}

// Chooses the word to review for a due kanji: among words containing it whose kanji are ALL already
// studied (so rating them is valid) and that have a usable sentence, ordered per the user's
// reviewWordSelection setting (see orderReviewWords). Returns null when no such word exists.
async function pickReviewWord(
  anchor: Kanji,
  studiedChars: Set<string>,
  selection: ReviewWordSelection,
): Promise<ReviewWord | null> {
  const candidates = await getWordsForKanji(anchor.character, REVIEW_WORD_CANDIDATES);
  const eligible = candidates.filter((w) =>
    [...w.kanjiForm].every((c) => !isKanji(c) || studiedChars.has(c)),
  );
  if (eligible.length === 0) return null;

  const stats = await getWordStatsByIds(eligible.map((w) => w.id));
  const ordered = orderReviewWords(eligible, stats, selection);

  for (const word of ordered) {
    const sentence = await getSentenceContaining(word.kanjiForm, studiedChars);
    if (!sentence) continue;
    const constituents = await constituentCards(word.kanjiForm);
    if (constituents.length === 0) continue;
    const info = new Map(constituents.map((k) => [k.kanji.character, k.kanji]));
    const formattedReading = formatWordReading(word.kanjiForm, word.kana, info);
    return { word, sentence, formattedReading, constituents };
  }
  return null;
}

// Orders eligible review words by the user's chosen strategy; pickReviewWord then walks this list
// and takes the first word with a usable sentence. familiarity is lower the more often a word was
// missed (see WordStat), so all three strategies favour weaker words to differing degrees.
function orderReviewWords(
  eligible: Word[],
  stats: Map<number, WordStat>,
  selection: ReviewWordSelection,
): Word[] {
  const familiarity = (w: Word) => stats.get(w.id)?.familiarity ?? 0;
  if (selection === 'random') return shuffle(eligible);
  if (selection === 'weakest') {
    // Lowest familiarity first; shuffle first so equally-weak words don't always tie-break the same.
    return shuffle(eligible).sort((a, b) => familiarity(a) - familiarity(b));
  }
  // 'weighted': a random order biased toward weaker words. Efraimidis–Spirakis weighted sampling —
  // each word's sort key is random^(familiarity+1), so a low familiarity keeps the key spread near 1
  // (likely to rank high) while a high one crushes it toward 0. (familiarity is clamped at 0 so
  // already-missed words, which can go negative, simply get the maximum weight rather than skewing
  // the exponent.)
  return eligible
    .map((w) => ({ w, key: Math.pow(Math.random(), Math.max(0, familiarity(w)) + 1) }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.w);
}

// The distinct kanji of a word form, in first-appearance order, each with its current SRS — the
// units rated when the word is answered. (Duplicates like 人々 collapse to one row.)
async function constituentCards(kanjiForm: string): Promise<KanjiWithSrs[]> {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const c of kanjiForm) {
    if (isKanji(c) && !seen.has(c)) {
      seen.add(c);
      ordered.push(c);
    }
  }
  const fetched = await getKanjiWithSrsByCharacters(ordered);
  const byChar = new Map(fetched.map((k) => [k.kanji.character, k]));
  return ordered.map((c) => byChar.get(c)).filter((k): k is KanjiWithSrs => k != null);
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
  return { card, examples, cardId: card.kanji.character };
}

// Builds a CardWithContext for a word-list entry. The anchor kanji is the word's first kanji
// (needed by the existing flow components for stroke order / reveal), and the example list is
// locked to the word itself so studying it surfaces this specific word instead of an auto-pick.
// Words whose form contains no kanji are skipped — there's nothing to anchor a card on.
async function hydrateWord(
  word: Word,
  studiedChars: Set<string>,
  kanjiCache: Map<string, Kanji>,
): Promise<CardWithContext | null> {
  const anchorChar = [...word.kanjiForm].find((c) => isKanji(c));
  if (!anchorChar) return null;

  const anchorCard = await getKanjiWithSrs(anchorChar);
  if (!anchorCard) return null;

  const neededChars = new Set([...word.kanjiForm].filter((c) => isKanji(c)) as string[]);
  const allowedKanji = new Set(studiedChars);
  for (const c of neededChars) allowedKanji.add(c);

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

  const sentence = await getSentenceContaining(word.kanjiForm, allowedKanji);
  if (!sentence) return null;

  const formattedReading = formatWordReading(word.kanjiForm, word.kana, info);
  return {
    card: anchorCard,
    examples: [{ word, sentence, formattedReading }],
    cardId: `w${word.id}`,
    forceReview: true,
  };
}

async function buildExamples(
  words: Word[],
  allowedKanji: Set<string>,
  kanjiCache: Map<string, Kanji>,
): Promise<WordWithSentence[]> {
  const result: WordWithSentence[] = [];
  for (const word of words) {
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
