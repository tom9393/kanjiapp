import { defaultSrs, frequencyRank, kankenLabel, srsOf, Kanji, KanjiWithSrs } from '@/data/types';
import { CardState } from '@/domain/cardState';

const kanji = (over: Partial<Kanji> = {}): Kanji => ({
  character: '日',
  strokes: 4,
  grade: 1,
  frequency: 1,
  jlpt: 5,
  kanken: 100,
  meanings: 'day',
  on: 'ニチ',
  kun: 'ひ',
  ...over,
});

describe('defaultSrs / srsOf', () => {
  it('builds a NEW default row keyed by character', () => {
    expect(defaultSrs('水')).toEqual({
      character: '水',
      type: CardState.NEW,
      due: 0,
      interval: 0,
      factor: 2500,
      lapses: 0,
    });
  });

  it('srsOf returns the stored row, or the NEW default when unstudied', () => {
    const stored = defaultSrs('水');
    const studied: KanjiWithSrs = { kanji: kanji({ character: '水' }), rawSrs: { ...stored, type: CardState.REVIEW } };
    expect(srsOf(studied).type).toBe(CardState.REVIEW);

    const fresh: KanjiWithSrs = { kanji: kanji({ character: '水' }), rawSrs: null };
    expect(srsOf(fresh)).toEqual(stored);
  });
});

describe('frequencyRank', () => {
  it('sorts ranked kanji ascending and pushes unranked (0) to the end', () => {
    expect(frequencyRank(kanji({ frequency: 5 }))).toBe(5);
    expect(frequencyRank(kanji({ frequency: 0 }))).toBe(Infinity);
  });
});

describe('kankenLabel', () => {
  it('decodes the ×10-encoded level, with the pre-2 / pre-1 special cases', () => {
    expect(kankenLabel(0)).toBeNull();
    expect(kankenLabel(100)).toBe('10');
    expect(kankenLabel(10)).toBe('1');
    expect(kankenLabel(25)).toBe('pre-2');
    expect(kankenLabel(15)).toBe('pre-1');
  });
});
