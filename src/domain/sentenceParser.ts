// Splits a Japanese sentence into component words by greedy longest-match against the word
// dictionary, de-conjugating each candidate so inflected forms resolve to their plain entry
// (かかった → かかる). Words not in the dictionary — particles and grammatical kana words
// (は / が / を / です) — fall through as plain, non-linkable text.
//
// Lookups are batched: candidateForms() lists every plain form the sentence could contain so
// the caller can resolve them in one query, then segment() runs the match against that map.
import { Word } from '@/data/types';
import { deinflect } from '@/domain/deinflect';
import { isKanji } from '@/domain/readingFormatter';

export interface Segment {
  /** The text exactly as it appears in the sentence (still conjugated). */
  text: string;
  /** The matched dictionary word, or null for an unparsed run (particles, punctuation, …). */
  word: Word | null;
}

const MAX_LEN = 8; // longest substring tried as a single word; covers all but rare long compounds

// する and its conjugations collapse to these dictionary readings, whose only kanji entries are
// misleading homographs (刷る "to print", 仕手 "doer") — the grammatical verb する is normally
// written in kana, so a kana match here is glue, not a content word. Left as plain text like
// particles, rather than linked to the wrong entry. (The kanji-written 下/舌/刷る etc. still match.)
const GRAMMATICAL_KANA_READINGS = new Set(['する', 'して', 'した']);

/** Every plain-form candidate across all substrings of the sentence, for one batched lookup. */
export function candidateForms(sentence: string): string[] {
  const chars = [...sentence];
  const forms = new Set<string>();
  for (let i = 0; i < chars.length; i++) {
    const max = Math.min(MAX_LEN, chars.length - i);
    for (let len = 1; len <= max; len++) {
      for (const form of deinflect(chars.slice(i, i + len).join(''))) forms.add(form);
    }
  }
  return [...forms];
}

/**
 * Greedy longest-match segmentation using a resolved form→word map (from candidateForms). At
 * each position the longest substring whose plain form is in the map wins; single-kana matches
 * are skipped so particles and stray okurigana aren't mistaken for words.
 */
export function segment(sentence: string, dict: Map<string, Word>): Segment[] {
  const chars = [...sentence];
  const segments: Segment[] = [];
  let pending = '';
  const flush = () => {
    if (pending) segments.push({ text: pending, word: null });
    pending = '';
  };

  let i = 0;
  while (i < chars.length) {
    let match: { len: number; word: Word } | null = null;
    const max = Math.min(MAX_LEN, chars.length - i);
    for (let len = max; len >= 1; len--) {
      if (len === 1 && !isKanji(chars[i])) continue;
      for (const form of deinflect(chars.slice(i, i + len).join(''))) {
        const word = dict.get(form);
        if (word) {
          match = { len, word };
          break;
        }
      }
      if (match) break;
    }

    if (match) {
      const surface = chars.slice(i, i + match.len).join('');
      const grammatical =
        ![...surface].some(isKanji) && GRAMMATICAL_KANA_READINGS.has(match.word.kana);
      if (grammatical) {
        pending += surface; // glue (する family) — keep as plain text, not a wrong link
      } else {
        flush();
        segments.push({ text: surface, word: match.word });
      }
      i += match.len;
    } else {
      pending += chars[i];
      i++;
    }
  }
  flush();
  return segments;
}
