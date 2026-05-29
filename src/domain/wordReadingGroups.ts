// Groups a kanji's example words by which of the kanji's readings each word uses, so the detail
// screen can list words per reading (人: ひと, じん, …) instead of one undivided list.
//
// A word's reading for the target kanji is found by aligning the whole written form against its
// kana: each kanji consumes one of its on/kun readings, kana (okurigana) is matched literally, and
// the word is filed under the *dictionary* reading the target matched. Grouping on the dictionary
// reading rather than the surface kana means regular sound changes fold back into the base reading
// — rendaku (恋人 こいびと → ひと), handakuten (一本 いっぽん → ほん), sokuon (学校 がっこう → がく) and
// the 々 repeat mark all stay with their parent reading instead of splitting off. A bounded
// wildcard lets one irregular neighbour be skipped without stranding the word; words whose target
// reading still can't be resolved (大人 おとな and other jukujikun) fall into a final "other" group.
import { Kanji, Word } from '@/data/types';
import { isKanji, katakanaToHiragana } from '@/domain/readingFormatter';

const VOICED: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご',
  さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど',
  は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
};
const HANDAKU: Record<string, string> = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' };
// Readings ending in these mora geminate (→ っ) before a voiceless consonant: がく → がっ(こう).
const GEMINATING = new Set(['ち', 'つ', 'き', 'く']);
const MAX_WILDCARD = 4;
const ITERATION_MARK = '々';

export interface ReadingGroup {
  /** Cleaned hiragana reading the words share, or null for the leftover "other" bucket. */
  reading: string | null;
  words: Word[];
}

// Splits an on/kun field ("じん, にん" / "ひと, -り") into its readings, dropping the parenthesised
// notes ReadingFormatter also strips.
function parseField(field: string): string[] {
  return field
    .split(', ')
    .map((raw) => raw.split('(')[0].trim())
    .filter((r) => r.length > 0);
}

// The kanji's own reading is the stem: kun entries mark okurigana past a dot (い.きる) and position
// with a dash (-り, おお-), neither of which is part of what the kanji itself contributes.
function cleanReading(raw: string): string {
  const noDash = raw.replace(/-/g, '');
  const dot = noDash.indexOf('.');
  return dot === -1 ? noDash : noDash.slice(0, dot);
}

// Distinct cleaned readings of a kanji, on-yomi before kun-yomi (the order the detail screen also
// lists them in), used both as match candidates and as the group ordering for the target kanji.
function readingsOf(k: Kanji): string[] {
  const all = [
    ...parseField(k.on).map(katakanaToHiragana),
    ...parseField(k.kun),
  ].map(cleanReading);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of all) {
    if (r.length > 0 && !seen.has(r)) {
      seen.add(r);
      out.push(r);
    }
  }
  return out;
}

// True if `cand` reads at `reading[pos]`, tolerating the regular sound changes a reading undergoes
// inside a compound: rendaku/handakuten on the first mora and gemination on the last.
function matchesAt(reading: string, pos: number, cand: string): boolean {
  if (pos + cand.length > reading.length) return false;
  const last = cand.length - 1;
  for (let i = 0; i < cand.length; i++) {
    const expected = cand[i];
    const actual = reading[pos + i];
    if (actual === expected) continue;
    if (i === 0 && (VOICED[expected] === actual || HANDAKU[expected] === actual)) continue;
    if (i === last && actual === 'っ' && GEMINATING.has(expected)) continue;
    return false;
  }
  return true;
}

// Resolves the 々 repeat mark to the preceding kanji so 人々 aligns as 人人.
function expandIteration(form: string): string[] {
  const out: string[] = [];
  for (const ch of form) {
    const prev = out[out.length - 1];
    out.push(ch === ITERATION_MARK && prev && isKanji(prev) ? prev : ch);
  }
  return out;
}

// Distinct kanji (with 々 resolved) appearing across the given word forms — the kanji whose
// readings the caller must load before grouping.
export function kanjiInWordForms(words: Word[]): Set<string> {
  const chars = new Set<string>();
  for (const w of words) {
    for (const ch of expandIteration(w.kanjiForm)) {
      if (isKanji(ch)) chars.add(ch);
    }
  }
  return chars;
}

// Aligns the form against the reading and returns the target kanji's matched dictionary reading,
// or null when no alignment resolves it. Neighbouring kanji may consume a bounded run of kana via
// wildcard so an irregular neighbour doesn't strand the word; the target itself must match one of
// its own readings. A dead-state cache keeps the search linear on the words that don't align.
function readingForTarget(
  formChars: string[],
  reading: string,
  target: string,
  candidatesByChar: Map<string, string[]>,
): string | null {
  const n = formChars.length;
  const stride = reading.length + 1;
  const dead = new Set<number>();

  const rec = (i: number, pos: number, found: string | null): string | null => {
    if (i === n) return pos === reading.length ? found : null;
    const key = i * stride + pos;
    if (dead.has(key)) return null;

    const ch = formChars[i];
    if (!isKanji(ch)) {
      const r = pos < reading.length && reading[pos] === ch ? rec(i + 1, pos + 1, found) : null;
      if (r === null) dead.add(key);
      return r;
    }

    const cands = candidatesByChar.get(ch);
    if (cands) {
      for (const c of cands) {
        if (matchesAt(reading, pos, c)) {
          const r = rec(i + 1, pos + c.length, ch === target && found === null ? c : found);
          if (r !== null) return r;
        }
      }
    }
    if (ch !== target) {
      for (let w = 1; w <= MAX_WILDCARD && pos + w <= reading.length; w++) {
        const r = rec(i + 1, pos + w, found);
        if (r !== null) return r;
      }
    }
    dead.add(key);
    return null;
  };

  return rec(0, 0, null);
}

// Groups `words` by the reading the target kanji takes in each, ordered by the target's own reading
// order (on-yomi then kun-yomi) with the unresolved "other" bucket last. `kanjiInfo` must cover the
// target plus every kanji returned by kanjiInWordForms so neighbours can be aligned.
export function groupWordsByReading(
  target: string,
  words: Word[],
  kanjiInfo: Map<string, Kanji>,
): ReadingGroup[] {
  const candidatesByChar = new Map<string, string[]>();
  for (const [ch, k] of kanjiInfo) {
    // Longest reading first so じん wins over a stray じ when both could match at a position.
    candidatesByChar.set(ch, [...readingsOf(k)].sort((a, b) => b.length - a.length));
  }

  const byReading = new Map<string, Word[]>();
  const other: Word[] = [];
  for (const w of words) {
    const r = readingForTarget(expandIteration(w.kanjiForm), w.kana, target, candidatesByChar);
    if (r === null) {
      other.push(w);
    } else {
      const list = byReading.get(r);
      if (list) list.push(w);
      else byReading.set(r, [w]);
    }
  }

  const targetKanji = kanjiInfo.get(target);
  const order = targetKanji ? readingsOf(targetKanji) : [];
  const groups: ReadingGroup[] = [];
  const emitted = new Set<string>();
  for (const r of order) {
    const list = byReading.get(r);
    if (list) {
      groups.push({ reading: r, words: list });
      emitted.add(r);
    }
  }
  for (const [r, list] of byReading) {
    if (!emitted.has(r)) groups.push({ reading: r, words: list });
  }
  if (other.length > 0) groups.push({ reading: null, words: other });
  return groups;
}
