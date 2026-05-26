// Shared search-query handling for the kanji and word search screens. Turns a raw query
// (Latin or Japanese) into the kana forms used for matching, and matches kanji in memory.
import { Kanji } from '@/data/types';
import { hiraganaToKatakana, katakanaToHiragana } from '@/domain/readingFormatter';
import { romajiToHiragana } from '@/domain/romaji';

const JAPANESE = /[぀-ヿ㐀-䶿一-鿿]/;

export interface ParsedQuery {
  /** Trimmed original input. */
  raw: string;
  /** Reading prefix in hiragana (romaji folded to kana; katakana input folded to hiragana). */
  hiragana: string;
  /** Same prefix in katakana, for matching the few katakana-only reading entries. */
  katakana: string;
  /** True when the input contains kana or kanji. */
  hasJapanese: boolean;
  /** True when every Latin letter folded into kana, i.e. the input reads as a reading rather
   *  than English text (used to route "shin" → readings vs "water" → meanings). */
  readingLike: boolean;
}

export function parseQuery(input: string): ParsedQuery | null {
  const raw = input.trim();
  if (!raw) return null;
  const hasJapanese = JAPANESE.test(raw);
  const { kana, complete } = romajiToHiragana(raw);
  const hiragana = katakanaToHiragana(kana);
  return {
    raw,
    hiragana,
    katakana: hiraganaToKatakana(hiragana),
    hasJapanese,
    readingLike: hasJapanese || complete,
  };
}

// Splits an "on"/"kun" field ("しん, じん" / "すす.む, すす.める") into bare hiragana readings,
// dropping the okurigana dots/hyphens and any parenthetical notes used for matching.
function readingTokens(field: string): string[] {
  return field
    .split(',')
    .map((r) => katakanaToHiragana(r).replace(/\([^)]*\)/g, '').replace(/[.\-・]/g, '').trim())
    .filter((r) => r.length > 0);
}

export function matchesKanji(k: Kanji, q: ParsedQuery): boolean {
  // Reading prefix match against on + kun (covers both kana and romaji-derived queries).
  if (q.readingLike && q.hiragana) {
    const readings = [...readingTokens(k.on), ...readingTokens(k.kun)];
    if (readings.some((r) => r.startsWith(q.hiragana))) return true;
  }
  // The kanji itself was typed.
  if (q.hasJapanese && k.character === q.raw) return true;
  // English meaning substring (Latin queries).
  if (!q.hasJapanese && k.meanings.toLowerCase().includes(q.raw.toLowerCase())) return true;
  return false;
}
