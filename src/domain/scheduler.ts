// SM-2 variant scheduler ported from study/logic/Scheduler.kt.
import { Srs } from '@/data/types';
import { CardEase, CardState } from './cardState';
import { getSnapshot } from '@/settings/settingsProvider';

export interface StudyConfigSnapshot {
  newCardsLimit: number;
  resetHour: number;
  startingEase: number;
  easeBonus: number;
  learningAgainSecs: number;
  learningHardSecs: number;
  learningGoodSecs: number;
  learningEasySecs: number;
  graduationThresholdSecs: number;
  reviewHardMultiplier: number;
  relearningAgainSecs: number;
  relearningGoodSecs: number;
}

export async function calculateNewState(
  current: Srs,
  ease: CardEase,
  now: number = Math.floor(Date.now() / 1000),
): Promise<Srs> {
  const config = await getSnapshot();
  const state = current.type;
  const actualState = state === CardState.NEW ? CardState.LEARNING : state;
  const initialFactor = state === CardState.NEW ? config.startingEase : current.factor;

  const working: Srs = { ...current, type: actualState, factor: initialFactor };

  let updated: Srs;
  switch (actualState) {
    case CardState.LEARNING:
      updated = handleLearning(working, ease, config);
      break;
    case CardState.REVIEW:
      updated = handleReview(working, ease, config);
      break;
    case CardState.RELEARNING:
      updated = handleRelearning(working, ease, config);
      break;
    default:
      throw new Error('State cannot be NEW at this stage');
  }

  return { ...updated, due: now + updated.interval };
}

function handleLearning(state: Srs, ease: CardEase, config: StudyConfigSnapshot): Srs {
  let newInterval = state.interval;
  switch (ease) {
    case CardEase.Again:
      newInterval = config.learningAgainSecs;
      break;
    case CardEase.Hard:
      newInterval = config.learningHardSecs;
      break;
    case CardEase.Good:
      newInterval += config.learningGoodSecs;
      break;
    case CardEase.Easy:
      newInterval += config.learningEasySecs;
      break;
  }
  const newType = newInterval > config.graduationThresholdSecs ? CardState.REVIEW : CardState.LEARNING;
  return { ...state, interval: newInterval, type: newType };
}

function handleReview(state: Srs, ease: CardEase, config: StudyConfigSnapshot): Srs {
  if (ease === CardEase.Again) {
    const newInterval = Math.trunc(state.interval * 0.1);
    return {
      ...state,
      lapses: state.lapses + 1,
      interval: newInterval,
      type: CardState.RELEARNING,
      factor: Math.max(1300, state.factor - 200),
    };
  }

  const factorMultiplier = Math.max(1300, state.factor) / 1000;
  let newFactor = state.factor;
  let newInterval = state.interval;

  switch (ease) {
    case CardEase.Hard:
      newInterval = Math.trunc(state.interval * config.reviewHardMultiplier);
      newFactor -= 150;
      break;
    case CardEase.Good:
      newInterval = Math.trunc(state.interval * factorMultiplier);
      break;
    case CardEase.Easy:
      newInterval = Math.trunc(state.interval * factorMultiplier * 1.3);
      newFactor += config.easeBonus;
      break;
    // CardEase.Again is handled by the early return above.
  }

  return { ...state, interval: newInterval, factor: Math.max(1300, newFactor) };
}

function handleRelearning(state: Srs, ease: CardEase, config: StudyConfigSnapshot): Srs {
  const newInterval = ease === CardEase.Again ? config.relearningAgainSecs : config.relearningGoodSecs;
  const newType = ease === CardEase.Again ? CardState.RELEARNING : CardState.REVIEW;
  return { ...state, interval: newInterval, type: newType };
}
