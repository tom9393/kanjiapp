// Ported from frontpage/logic/FrontpageScreenViewModel.kt, extended with the dashboard's
// streak + today summary (see domain/homeSummary.ts).
import { countDueAndNew } from '@/domain/studyQueueSource';
import { getHomeSummary } from '@/domain/homeSummary';
import { create } from 'zustand';

interface FrontpageStore {
  dueCount: number;
  newCount: number;
  extraAvailable: boolean;
  streak: number;
  todayReviews: number;
  todayAgain: number;
  todayNew: number;
  totalReviews: number;
  loading: boolean;
  load: () => Promise<void>;
}

export const useFrontpageStore = create<FrontpageStore>((set) => ({
  dueCount: 0,
  newCount: 0,
  extraAvailable: false,
  streak: 0,
  todayReviews: 0,
  todayAgain: 0,
  todayNew: 0,
  totalReviews: 0,
  loading: true,
  load: async () => {
    const [counts, summary] = await Promise.all([countDueAndNew(), getHomeSummary()]);
    set({
      dueCount: counts.dueCount,
      newCount: counts.newCount,
      extraAvailable: counts.extraAvailable,
      streak: summary.streak,
      todayReviews: summary.todayReviews,
      todayAgain: summary.todayAgain,
      todayNew: summary.todayNew,
      totalReviews: summary.totalReviews,
      loading: false,
    });
  },
}));

export function canStudy(s: { dueCount: number; newCount: number }): boolean {
  return s.dueCount > 0 || s.newCount > 0;
}
