// Ported from study/logic/StudyModels.kt (CardState, CardEase).

/** CardState codes are persisted in the Srs/Review tables — keep these stable. */
export enum CardState {
  NEW = 0,
  LEARNING = 1,
  REVIEW = 2,
  RELEARNING = 3,
}

export function cardStateFromCode(code: number): CardState {
  switch (code) {
    case CardState.LEARNING:
      return CardState.LEARNING;
    case CardState.REVIEW:
      return CardState.REVIEW;
    case CardState.RELEARNING:
      return CardState.RELEARNING;
    default:
      return CardState.NEW;
  }
}

/** User ratings. Ordinal is persisted as Review.ease — Again=0, Hard=1, Good=2, Easy=3. */
export enum CardEase {
  Again = 0,
  Hard = 1,
  Good = 2,
  Easy = 3,
}
