import { calculateNewState, StudyConfigSnapshot } from '@/domain/scheduler';
import { CardEase, CardState } from '@/domain/cardState';
import { Srs } from '@/data/types';
import { getSnapshot } from '@/settings/settingsProvider';

// calculateNewState reads its config via getSnapshot(); mock it so the SM-2 math is exercised
// against fixed parameters (and so the test doesn't pull in AsyncStorage). jest.mock is hoisted
// above the imports at transform time, so getSnapshot resolves to this mock.
jest.mock('@/settings/settingsProvider', () => ({ getSnapshot: jest.fn() }));
const mockedGetSnapshot = getSnapshot as jest.MockedFunction<typeof getSnapshot>;

const config: StudyConfigSnapshot = {
  newCardsLimit: 20,
  resetHour: 4,
  startingEase: 2500,
  easeBonus: 150,
  learningAgainSecs: 60,
  learningHardSecs: 540,
  learningGoodSecs: 600,
  learningEasySecs: 90000, // > graduationThresholdSecs, so an Easy on a new card graduates
  graduationThresholdSecs: 86400,
  reviewHardMultiplier: 1.2,
  relearningAgainSecs: 600,
  relearningGoodSecs: 86400,
};

const NOW = 1000;
const srs = (over: Partial<Srs>): Srs => ({
  character: '日',
  type: CardState.REVIEW,
  due: 0,
  interval: 86400,
  factor: 2500,
  lapses: 0,
  ...over,
});

beforeEach(() => {
  mockedGetSnapshot.mockResolvedValue(config);
});

describe('calculateNewState — new / learning cards', () => {
  const newCard = srs({ type: CardState.NEW, interval: 0, factor: 9999 });

  it('moves a new card into LEARNING and resets the factor to startingEase', async () => {
    const next = await calculateNewState(newCard, CardEase.Good, NOW);
    expect(next).toMatchObject({
      type: CardState.LEARNING,
      interval: config.learningGoodSecs, // 0 + learningGoodSecs
      factor: config.startingEase,
      lapses: 0,
    });
    expect(next.due).toBe(NOW + config.learningGoodSecs);
  });

  it('uses the fixed Again/Hard delays without accumulating interval', async () => {
    expect((await calculateNewState(newCard, CardEase.Again, NOW)).interval).toBe(60);
    expect((await calculateNewState(newCard, CardEase.Hard, NOW)).interval).toBe(540);
  });

  it('graduates to REVIEW once the interval exceeds the threshold', async () => {
    const easy = await calculateNewState(newCard, CardEase.Easy, NOW);
    expect(easy.type).toBe(CardState.REVIEW);
    expect(easy.interval).toBe(90000);

    const nearGraduation = srs({ type: CardState.LEARNING, interval: 86000, factor: 2500 });
    const good = await calculateNewState(nearGraduation, CardEase.Good, NOW);
    expect(good.type).toBe(CardState.REVIEW);
    expect(good.interval).toBe(86600);
  });
});

describe('calculateNewState — review cards', () => {
  const review = srs({ type: CardState.REVIEW, interval: 86400, factor: 2500, lapses: 0 });

  it('Good multiplies interval by the ease factor and keeps the factor', async () => {
    const next = await calculateNewState(review, CardEase.Good, NOW);
    expect(next.interval).toBe(216000); // trunc(86400 * 2.5)
    expect(next.factor).toBe(2500);
    expect(next.type).toBe(CardState.REVIEW);
    expect(next.due).toBe(NOW + 216000);
  });

  it('Hard uses the hard multiplier and drops the factor by 150', async () => {
    const next = await calculateNewState(review, CardEase.Hard, NOW);
    expect(next.interval).toBe(103680); // trunc(86400 * 1.2)
    expect(next.factor).toBe(2350);
  });

  it('Easy applies the 1.3 bonus multiplier and adds easeBonus', async () => {
    const next = await calculateNewState(review, CardEase.Easy, NOW);
    expect(next.interval).toBe(280800); // trunc(86400 * 2.5 * 1.3)
    expect(next.factor).toBe(2650);
  });

  it('Again lapses the card into RELEARNING, shrinks interval and floors the factor at 1300', async () => {
    const next = await calculateNewState(review, CardEase.Again, NOW);
    expect(next.type).toBe(CardState.RELEARNING);
    expect(next.interval).toBe(8640); // trunc(86400 * 0.1)
    expect(next.lapses).toBe(1);
    expect(next.factor).toBe(2300); // 2500 - 200

    const lowFactor = await calculateNewState(srs({ factor: 1400 }), CardEase.Again, NOW);
    expect(lowFactor.factor).toBe(1300); // max(1300, 1400 - 200)
  });

  it('never lets the factor fall below 1300', async () => {
    const next = await calculateNewState(srs({ factor: 1400 }), CardEase.Hard, NOW);
    expect(next.factor).toBe(1300); // max(1300, 1400 - 150)
  });
});

describe('calculateNewState — relearning cards', () => {
  const relearning = srs({ type: CardState.RELEARNING, interval: 8640 });

  it('Good promotes back to REVIEW with the relearning-good interval', async () => {
    const next = await calculateNewState(relearning, CardEase.Good, NOW);
    expect(next.type).toBe(CardState.REVIEW);
    expect(next.interval).toBe(config.relearningGoodSecs);
  });

  it('Again keeps the card in RELEARNING with the relearning-again interval', async () => {
    const next = await calculateNewState(relearning, CardEase.Again, NOW);
    expect(next.type).toBe(CardState.RELEARNING);
    expect(next.interval).toBe(config.relearningAgainSecs);
  });
});
