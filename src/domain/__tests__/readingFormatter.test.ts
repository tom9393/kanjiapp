import {
  formatWordReading,
  hiraganaToKatakana,
  isKanji,
  katakanaToHiragana,
} from '@/domain/readingFormatter';
import { Kanji } from '@/data/types';

const kanji = (character: string, on: string, kun: string): Kanji => ({
  character,
  strokes: 0,
  grade: 0,
  frequency: 0,
  jlpt: 0,
  kanken: 0,
  meanings: '',
  on,
  kun,
});

describe('isKanji', () => {
  it('recognises CJK characters and rejects kana / latin', () => {
    expect(isKanji('日')).toBe(true);
    expect(isKanji('あ')).toBe(false);
    expect(isKanji('a')).toBe(false);
  });
});

describe('kana conversion', () => {
  it('round-trips hiragana ↔ katakana and passes other characters through', () => {
    expect(hiraganaToKatakana('しゃ')).toBe('シャ');
    expect(katakanaToHiragana('シャ')).toBe('しゃ');
    expect(hiraganaToKatakana('aあ')).toBe('aア');
  });
});

describe('formatWordReading', () => {
  it('renders matched on-yomi segments in katakana', () => {
    const info = new Map([
      ['三', kanji('三', 'サン', '')],
      ['角', kanji('角', 'カク', '')],
    ]);
    expect(formatWordReading('三角', 'さんかく', info)).toBe('サンカク');
  });

  it('keeps matched kun-yomi segments in hiragana', () => {
    const info = new Map([
      ['山', kanji('山', 'サン', 'やま')],
      ['川', kanji('川', 'セン', 'かわ')],
    ]);
    expect(formatWordReading('山川', 'やまかわ', info)).toBe('やまかわ');
  });

  it('tolerates rendaku on the first character of a segment', () => {
    const info = new Map([['川', kanji('川', 'セン', 'かわ')]]);
    expect(formatWordReading('川', 'がわ', info)).toBe('がわ');
  });

  it('passes through non-kanji characters in the form', () => {
    const info = new Map([['茶', kanji('茶', 'チャ', '')]]);
    expect(formatWordReading('お茶', 'おちゃ', info)).toBe('おチャ');
  });

  it('returns the raw reading when alignment fails', () => {
    const info = new Map([['山', kanji('山', 'サン', 'やま')]]);
    expect(formatWordReading('山', 'zzz', info)).toBe('zzz'); // no candidate matches
    expect(formatWordReading('山', 'やま', new Map())).toBe('やま'); // kanji info missing
  });
});
