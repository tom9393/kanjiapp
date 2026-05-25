// Ported from stats/logic/StatsViewModel.kt — the zustand store wiring. Holds the loaded
// row cache (see computeStats.ts) and re-derives StatsUiState whenever the filter or a range
// changes. Models live in src/stats/statsModels.ts; the computation in src/stats/computeStats.ts.
import { create } from 'zustand';
import { getAllKanjiWithSrs } from '@/data/repository/kanji';
import { getAllReviews } from '@/data/repository/reviews';
import { StatsCaches, buildCaches, computeStats } from '@/stats/computeStats';
import { StatsFilter, StatsUiState, initialState } from '@/stats/statsModels';

interface StatsStore {
  state: StatsUiState;
  init: () => Promise<void>;
  setFilter: (filter: StatsFilter) => void;
  setFutureDayRange: (days: number) => void;
  setReviewRange: (days: number) => void;
}

export const useStatsStore = create<StatsStore>((set, get) => {
  // Rebuilt only on load — mirrors the ViewModel's private cached rows.
  let caches: StatsCaches | null = null;

  const recompute = (filter: StatsFilter, futureDayRange: number, reviewRange: number): StatsUiState =>
    computeStats(caches!, filter, futureDayRange, reviewRange);

  return {
    state: initialState,

    init: async () => {
      caches = buildCaches(await getAllKanjiWithSrs(), await getAllReviews());
      const s = get().state;
      set({ state: recompute(s.filter, s.futureDayRange, s.reviewRange) });
    },

    setFilter: (filter) => {
      const s = get().state;
      set({ state: recompute(filter, s.futureDayRange, s.reviewRange) });
    },

    setFutureDayRange: (days) => {
      const s = get().state;
      set({ state: recompute(s.filter, days, s.reviewRange) });
    },

    setReviewRange: (days) => {
      const s = get().state;
      set({ state: recompute(s.filter, s.futureDayRange, days) });
    },
  };
});
