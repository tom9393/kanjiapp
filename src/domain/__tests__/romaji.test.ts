import { romajiToHiragana } from '@/domain/romaji';

describe('romajiToHiragana', () => {
  it('folds basic syllables', () => {
    expect(romajiToHiragana('mizu')).toEqual({ kana: 'みず', complete: true });
    expect(romajiToHiragana('sui')).toEqual({ kana: 'すい', complete: true });
  });

  it('prefers the longest syllable match (youon, digraphs)', () => {
    expect(romajiToHiragana('shin').kana).toBe('しん');
    expect(romajiToHiragana('kyo').kana).toBe('きょ');
    expect(romajiToHiragana('cha').kana).toBe('ちゃ');
  });

  it('handles syllabic ん vs na-row syllables', () => {
    expect(romajiToHiragana('onna').kana).toBe('おんな');
    expect(romajiToHiragana('ni').kana).toBe('に');
  });

  it('converts a doubled consonant to sokuon っ', () => {
    expect(romajiToHiragana('kitte').kana).toBe('きって');
  });

  it('reports incomplete when a trailing consonant cannot be voiced yet', () => {
    const r = romajiToHiragana('shink');
    expect(r.kana).toBe('しん');
    expect(r.complete).toBe(false);
  });

  it('flags an English word as incomplete and passes non-letters through', () => {
    expect(romajiToHiragana('water').complete).toBe(false);
    expect(romajiToHiragana('a i').kana).toBe('あ い');
  });
});
