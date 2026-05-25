// Ported from study/logic/ReadingFormatter.kt. All characters involved are in the BMP,
// so charCodeAt-based code handling matches the Kotlin Char logic exactly.
import { Kanji } from '@/data/types';

const HIRA_KATA_OFFSET = 0x60;
const HIRAGANA_MIN = 0x3041;
const HIRAGANA_MAX = 0x3096;
const KATAKANA_MIN = 0x30a1;
const KATAKANA_MAX = 0x30f6;

const voicedPairs: Record<string, string> = {
  か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご',
  さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ',
  た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど',
  は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ',
};

export function isKanji(c: string): boolean {
  const code = c.charCodeAt(0);
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

export function hiraganaToKatakana(s: string): string {
  let out = '';
  for (const c of s) {
    const code = c.charCodeAt(0);
    out += code >= HIRAGANA_MIN && code <= HIRAGANA_MAX ? String.fromCharCode(code + HIRA_KATA_OFFSET) : c;
  }
  return out;
}

export function katakanaToHiragana(s: string): string {
  let out = '';
  for (const c of s) {
    const code = c.charCodeAt(0);
    out += code >= KATAKANA_MIN && code <= KATAKANA_MAX ? String.fromCharCode(code - HIRA_KATA_OFFSET) : c;
  }
  return out;
}

function parseReadings(field: string): string[] {
  return field
    .split(', ')
    .map((raw) => raw.split('(')[0].trim())
    .filter((r) => r.length > 0);
}

function matchesAt(reading: string, pos: number, candidate: string): boolean {
  if (pos + candidate.length > reading.length) return false;
  for (let i = 0; i < candidate.length; i++) {
    const expected = candidate[i];
    const actual = reading[pos + i];
    if (actual === expected) continue;
    // Tolerate rendaku only on the first character of the segment.
    if (i === 0 && voicedPairs[expected] === actual) continue;
    return false;
  }
  return true;
}

/**
 * Aligns a word's kana reading against its kanji and renders matched on-yomi segments in
 * katakana and matched kun-yomi segments in hiragana. Returns the whole reading in hiragana
 * if alignment fails.
 */
export function formatWordReading(
  kanjiForm: string,
  reading: string,
  kanjiInfo: Map<string, Kanji>,
): string {
  if (reading.length === 0) return reading;
  let out = '';
  let pos = 0;

  for (const ch of kanjiForm) {
    if (!isKanji(ch)) {
      if (pos < reading.length && reading[pos] === ch) {
        out += ch;
        pos++;
      } else {
        return reading;
      }
      continue;
    }

    const info = kanjiInfo.get(ch);
    if (!info) return reading;

    const onReadings = parseReadings(info.on).map(katakanaToHiragana);
    const kunReadings = parseReadings(info.kun);
    const candidates = [
      ...onReadings.map((r) => ({ reading: r, isOn: true })),
      ...kunReadings.map((r) => ({ reading: r, isOn: false })),
    ]
      .filter((c) => c.reading.length > 0)
      .sort((a, b) => b.reading.length - a.reading.length);

    let matched = false;
    for (const candidate of candidates) {
      if (matchesAt(reading, pos, candidate.reading)) {
        const segment = reading.substring(pos, pos + candidate.reading.length);
        out += candidate.isOn ? hiraganaToKatakana(segment) : segment;
        pos += candidate.reading.length;
        matched = true;
        break;
      }
    }
    if (!matched) return reading;
  }

  if (pos < reading.length) out += reading.substring(pos);
  return out;
}
