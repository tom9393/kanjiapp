import { nextWordStat } from '@/data/repository/wordStats';
import { WordStat } from '@/data/types';

// nextWordStat is pure, but it lives alongside DB code that imports expo-sqlite (via @/data/db).
// Mock that module so importing this file under Node doesn't load the native SQLite binding.
// (jest.mock is hoisted above these imports at transform time, so the mock applies first.)
jest.mock('@/data/db', () => ({ getDb: jest.fn() }));

describe('nextWordStat', () => {
  it('initialises a new stat row, with familiarity reflecting correctness', () => {
    expect(nextWordStat(null, 7, true, 1000)).toEqual({
      wordId: 7,
      firstSeen: 1000,
      lastSeen: 1000,
      timesSeen: 1,
      familiarity: 1,
    });
    expect(nextWordStat(null, 7, false, 1000).familiarity).toBe(-1);
  });

  it('preserves firstSeen and moves familiarity ±1 on subsequent reviews', () => {
    const prev: WordStat = { wordId: 7, firstSeen: 100, lastSeen: 200, timesSeen: 3, familiarity: 2 };

    expect(nextWordStat(prev, 7, true, 500)).toEqual({
      wordId: 7,
      firstSeen: 100,
      lastSeen: 500,
      timesSeen: 4,
      familiarity: 3,
    });
    expect(nextWordStat(prev, 7, false, 500).familiarity).toBe(1);
  });
});
