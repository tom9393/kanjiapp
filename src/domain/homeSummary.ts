// Lightweight "today + streak" summary for the home dashboard. Computed from small aggregate
// queries rather than the full stats cache (which loads every kanji + review) so it stays cheap
// to recompute on every home-screen focus. The day boundaries mirror computeStats.ts exactly —
// local midnight, ignoring the study reset hour — so the dashboard and the Stats screen agree.
import {
  countAgainSince,
  countAllReviews,
  countNewCardsStudiedToday,
  countReviewsSince,
  getDistinctStudyDays,
} from '@/data/repository/reviews';

export interface HomeSummary {
  streak: number;
  todayReviews: number;
  todayAgain: number;
  todayNew: number;
  totalReviews: number;
}

export async function getHomeSummary(): Promise<HomeSummary> {
  const zoneOffsetSecs = -new Date().getTimezoneOffset() * 60;
  const nowSecs = Math.floor(Date.now() / 1000);
  const todayEpochDay = Math.floor((nowSecs + zoneOffsetSecs) / 86400);
  const todayStartMs = (todayEpochDay * 86400 - zoneOffsetSecs) * 1000;

  const [todayReviews, todayAgain, todayNew, totalReviews, days] = await Promise.all([
    countReviewsSince(todayStartMs),
    countAgainSince(todayStartMs),
    countNewCardsStudiedToday(todayStartMs),
    countAllReviews(),
    getDistinctStudyDays(zoneOffsetSecs),
  ]);

  // Consecutive studied days ending today (or yesterday, if today isn't studied yet).
  const studied = new Set(days);
  let streak = 0;
  let day = studied.has(todayEpochDay) ? todayEpochDay : todayEpochDay - 1;
  while (studied.has(day)) {
    streak++;
    day--;
  }

  return { streak, todayReviews, todayAgain, todayNew, totalReviews };
}
