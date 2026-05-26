// Splits a word's written form + kana reading into furigana segments: each kanji run is paired
// with the reading that sits above it, and kana stretches (okurigana) carry no reading. Kanji
// runs are anchored on the surrounding okurigana rather than per-kanji readings, so a multi-kanji
// compound with no internal kana (大人 / おとな) keeps the whole reading as one ruby. Falls back
// to a single whole-word ruby when the okurigana can't be matched against the reading.
import { isKanji } from '@/domain/readingFormatter';

export interface FuriganaSegment {
  text: string;
  /** Reading shown above `text`; absent for kana that needs none. */
  reading?: string;
}

interface Run {
  text: string;
  isKanji: boolean;
}

function toRuns(form: string): Run[] {
  const runs: Run[] = [];
  for (const ch of form) {
    const kanji = isKanji(ch);
    const last = runs[runs.length - 1];
    if (last && last.isKanji === kanji) last.text += ch;
    else runs.push({ text: ch, isKanji: kanji });
  }
  return runs;
}

export function splitFurigana(form: string, reading: string): FuriganaSegment[] {
  const runs = toRuns(form);
  if (reading.length === 0 || !runs.some((r) => r.isKanji)) return [{ text: form }];

  const whole: FuriganaSegment[] = [{ text: form, reading }];
  const segments: FuriganaSegment[] = [];
  let pos = 0;
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (!run.isKanji) {
      if (!reading.startsWith(run.text, pos)) return whole;
      segments.push({ text: run.text });
      pos += run.text.length;
      continue;
    }
    // Runs alternate kanji/kana, so the next run is the okurigana bounding this kanji run (if any).
    const next = runs[i + 1];
    const end = next ? reading.indexOf(next.text, pos) : reading.length;
    if (end <= pos) return whole;
    segments.push({ text: run.text, reading: reading.slice(pos, end) });
    pos = end;
  }
  if (pos !== reading.length) return whole;
  return segments;
}
