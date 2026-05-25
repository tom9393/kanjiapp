// Ported from stats/logic/StatsModels.kt + StatsViewModel.kt.
// Loads all KanjiWithSrs + Review rows once, then computes every statistic in a single pass
// over the review history. Filter / range changes re-run the pass against the cached rows.
import { create } from 'zustand';
import { getAllKanjiWithSrs, getAllReviews } from '@/data/repository';
import { KanjiWithSrs, Review, Srs } from '@/data/types';
import { CardEase, CardState } from '@/domain/cardState';

// --- Data models (StatsModels.kt) -------------------------------------------

export interface RetentionData {
  correct: number;
  total: number;
}
export const emptyRetention: RetentionData = { correct: 0, total: 0 };
export function retentionRate(d: RetentionData): number {
  return d.total === 0 ? 0 : d.correct / d.total;
}

export interface GradeTierProgress {
  grade: number;
  total: number;
  learned: number;
  mature: number;
}

export interface HardCard {
  character: string;
  lapses: number;
  factor: number;
}

export interface FutureDueEntry {
  young: number;
  mature: number;
  learning: number;
}
export function entryTotal(e: FutureDueEntry): number {
  return e.young + e.mature + e.learning;
}

export type StatsFilter = { kind: 'all' } | { kind: 'grade'; grade: number };

export interface StatsUiState {
  isLoading: boolean;
  filter: StatsFilter;
  // Today's study
  todayReviews: number;
  todayNew: number;
  todayAgain: number;
  todayMatureCorrect: number;
  todayMatureTotal: number;
  todayLearningCorrect: number;
  todayLearningTotal: number;
  // Lifetime
  totalReviews: number;
  currentStreak: number;
  // Card counts
  unseenCount: number;
  learningCount: number;
  youngCount: number;
  matureCount: number;
  relearningCount: number;
  totalCount: number;
  // Retention by period
  retentionToday: RetentionData;
  retentionYesterday: RetentionData;
  retentionWeek: RetentionData;
  retentionMonth: RetentionData;
  retentionAllTime: RetentionData;
  // Future due — stacked by card type, index = days from today
  futureDue: FutureDueEntry[];
  futureDayRange: number;
  // Calendar: local epochDay → review count
  calendarData: Map<number, number>;
  // Interval histogram (REVIEW cards only, current SRS state)
  intervalBuckets: [string, number][];
  // Retention by interval (computed from historical review pairs)
  retentionByInterval: [string, RetentionData][];
  // Ease histogram
  easeBuckets: [string, number][];
  // Reviews by hour 0..23
  hourlyData: number[];
  // Reviews by day-of-week (Mon=0..Sun=6) × hour 0..23
  dowHourlyData: number[][];
  // Grade tier progress (always from all kanji, not affected by filter)
  gradeProgress: GradeTierProgress[];
  // Top 10 hardest cards by lapses then lowest ease
  hardestCards: HardCard[];
  // Cards first reaching REVIEW per week, last 26 weeks, oldest first
  maturityTimeline: [string, number][];
  // Review history bars (stacked by type), oldest first
  reviewHistory: FutureDueEntry[];
  reviewHistoryLabels: string[];
  reviewRange: number; // 30, 90, 365, or -1 (all time)
  reviewDaysStudied: number;
  reviewPeriodDays: number;
  reviewPeriodTotal: number;
  reviewPeriodAvg: number;
  reviewStudiedAvg: number;
}

const initialState: StatsUiState = {
  isLoading: true,
  filter: { kind: 'all' },
  todayReviews: 0,
  todayNew: 0,
  todayAgain: 0,
  todayMatureCorrect: 0,
  todayMatureTotal: 0,
  todayLearningCorrect: 0,
  todayLearningTotal: 0,
  totalReviews: 0,
  currentStreak: 0,
  unseenCount: 0,
  learningCount: 0,
  youngCount: 0,
  matureCount: 0,
  relearningCount: 0,
  totalCount: 0,
  retentionToday: emptyRetention,
  retentionYesterday: emptyRetention,
  retentionWeek: emptyRetention,
  retentionMonth: emptyRetention,
  retentionAllTime: emptyRetention,
  futureDue: [],
  futureDayRange: 30,
  calendarData: new Map(),
  intervalBuckets: [],
  retentionByInterval: [],
  easeBuckets: [],
  hourlyData: new Array(24).fill(0),
  dowHourlyData: Array.from({ length: 7 }, () => new Array(24).fill(0)),
  gradeProgress: [],
  hardestCards: [],
  maturityTimeline: [],
  reviewHistory: [],
  reviewHistoryLabels: [],
  reviewRange: 30,
  reviewDaysStudied: 0,
  reviewPeriodDays: 0,
  reviewPeriodTotal: 0,
  reviewPeriodAvg: 0,
  reviewStudiedAvg: 0,
};

// --- Bucketing constants (StatsViewModel companion object) ------------------

const INTERVAL_LABELS = [
  '<1d', '1d', '2d', '3-5d', '6-10d', '11-20d',
  '21-30d', '1-2m', '2-3m', '3-6m', '6-12m', '>1yr',
];
const EASE_LABELS = ['<150%', '150%', '170%', '190%', '210%', '230%', '250%', '270%+'];
const MATURE_SECS = 21 * 86400;
const DAY_MS = 86_400_000;

function intervalBucket(days: number): number {
  if (days < 1) return 0;
  if (days === 1) return 1;
  if (days === 2) return 2;
  if (days <= 5) return 3;
  if (days <= 10) return 4;
  if (days <= 20) return 5;
  if (days <= 30) return 6;
  if (days <= 60) return 7;
  if (days <= 90) return 8;
  if (days <= 180) return 9;
  if (days <= 365) return 10;
  return 11;
}

function easeBucket(factor: number): number {
  if (factor < 1500) return 0;
  if (factor < 1700) return 1;
  if (factor < 1900) return 2;
  if (factor < 2100) return 3;
  if (factor < 2300) return 4;
  if (factor < 2500) return 5;
  if (factor < 2700) return 6;
  return 7;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// --- Store -------------------------------------------------------------------

interface StatsStore {
  state: StatsUiState;
  init: () => Promise<void>;
  setFilter: (filter: StatsFilter) => void;
  setFutureDayRange: (days: number) => void;
  setReviewRange: (days: number) => void;
}

export const useStatsStore = create<StatsStore>((set, get) => {
  // Caches, rebuilt only on load — mirror the ViewModel's private fields.
  let allKanji: KanjiWithSrs[] = [];
  let allReviews: Review[] = []; // sorted by id ASC from the DAO
  let gradeCharSets = new Map<number, Set<string>>();
  let gradeProgress: GradeTierProgress[] = [];

  const buildCaches = () => {
    gradeCharSets = new Map();
    gradeProgress = [];
    for (let grade = 1; grade <= 6; grade++) {
      const chars = allKanji.filter((k) => k.kanji.grade === grade);
      gradeCharSets.set(grade, new Set(chars.map((k) => k.kanji.character)));
      if (chars.length === 0) continue;
      const srsFor = chars.map((c) => c.rawSrs).filter((s): s is Srs => s != null);
      gradeProgress.push({
        grade,
        total: chars.length,
        learned: srsFor.length,
        mature: srsFor.filter((s) => s.type === CardState.REVIEW && s.interval >= MATURE_SECS).length,
      });
    }
  };

  const buildMaturityTimeline = (
    maturityByChar: Map<string, number>,
    zoneOffsetSecs: number,
  ): [string, number][] => {
    const weeksToShow = 26;
    const nowEpochDay = Math.floor((Math.floor(Date.now() / 1000) + zoneOffsetSecs) / 86400);
    const currentMonday = nowEpochDay - ((nowEpochDay + 3) % 7);
    const firstMonday = currentMonday - (weeksToShow - 1) * 7;

    const weekCounts = new Array(weeksToShow).fill(0);
    for (const ms of maturityByChar.values()) {
      const epochDay = Math.floor((Math.floor(ms / 1000) + zoneOffsetSecs) / 86400);
      const monday = epochDay - ((epochDay + 3) % 7);
      const weekIdx = Math.floor((monday - firstMonday) / 7);
      if (weekIdx >= 0 && weekIdx < weeksToShow) weekCounts[weekIdx]++;
    }

    return weekCounts.map((count, i) => {
      const weeksAgo = weeksToShow - 1 - i;
      let label = '';
      if (i === weeksToShow - 1) label = 'Now';
      else if (i % 4 === 0) label = `-${weeksAgo}w`;
      return [label, count] as [string, number];
    });
  };

  const recompute = (filter: StatsFilter, futureDayRange: number, reviewRange: number): StatsUiState => {
    const zoneOffsetSecs = -new Date().getTimezoneOffset() * 60;
    const nowSecs = Math.floor(Date.now() / 1000);

    const todayEpochDay = Math.floor((nowSecs + zoneOffsetSecs) / 86400);
    const todayStartMs = (todayEpochDay * 86400 - zoneOffsetSecs) * 1000;
    const yesterdayStartMs = todayStartMs - DAY_MS;
    const weekAgoMs = todayStartMs - 7 * DAY_MS;
    const monthAgoMs = todayStartMs - 30 * DAY_MS;

    const filteredKanji =
      filter.kind === 'all' ? allKanji : allKanji.filter((k) => k.kanji.grade === filter.grade);
    const chars: Set<string> | null =
      filter.kind === 'all' ? null : gradeCharSets.get(filter.grade) ?? new Set();
    const filteredSrs = filteredKanji.map((k) => k.rawSrs).filter((s): s is Srs => s != null);
    // allReviews is pre-sorted ASC by id; filtering preserves order.
    const filteredReviews = chars === null ? allReviews : allReviews.filter((r) => chars.has(r.character));

    // === Single pass over sorted reviews ===
    let todayTotal = 0;
    let todayAgain = 0;
    let todayMatureTotal = 0;
    let todayMatureCorrect = 0;
    let todayLearningTotal = 0;
    let todayLearningCorrect = 0;
    const charStudiedBeforeToday = new Set<string>();
    const charStudiedToday = new Set<string>();

    let retTodayC = 0, retTodayT = 0;
    let retYestC = 0, retYestT = 0;
    let retWeekC = 0, retWeekT = 0;
    let retMonthC = 0, retMonthT = 0;
    let retAllC = 0, retAllT = 0;

    const calendarData = new Map<number, number>();
    const streakDays = new Set<number>();
    const hourly = new Array(24).fill(0);
    const dowHourly = Array.from({ length: 7 }, () => new Array(24).fill(0));

    // Retention-by-interval: the previous review's resulting interval is the interval the
    // card had at the start of the current review.
    const intervalRetC = new Array(12).fill(0);
    const intervalRetT = new Array(12).fill(0);
    const prevIntervalByChar = new Map<string, number>();

    const maturityByChar = new Map<string, number>();

    for (const r of filteredReviews) {
      const isCorrect = r.ease !== CardEase.Again;
      // Arithmetic epoch calculation (id is in ms).
      const localSecs = Math.floor(r.id / 1000) + zoneOffsetSecs;
      const epochDay = Math.floor(localSecs / 86400);
      const hour = clamp(Math.floor((localSecs % 86400) / 3600), 0, 23);
      const dow = (epochDay + 3) % 7; // Mon=0..Sun=6 (epoch day 0 was Thursday=3)

      calendarData.set(epochDay, (calendarData.get(epochDay) ?? 0) + 1);
      streakDays.add(epochDay);
      hourly[hour]++;
      dowHourly[dow][hour]++;

      retAllT++;
      if (isCorrect) retAllC++;
      if (r.id >= monthAgoMs) { retMonthT++; if (isCorrect) retMonthC++; }
      if (r.id >= weekAgoMs) { retWeekT++; if (isCorrect) retWeekC++; }
      if (r.id >= yesterdayStartMs && r.id < todayStartMs) { retYestT++; if (isCorrect) retYestC++; }

      if (r.id >= todayStartMs) {
        retTodayT++;
        if (isCorrect) retTodayC++;
        todayTotal++;
        charStudiedToday.add(r.character);
        if (!isCorrect) todayAgain++;
        if (r.type === CardState.REVIEW || r.type === CardState.RELEARNING) {
          todayMatureTotal++;
          if (isCorrect) todayMatureCorrect++;
        } else {
          todayLearningTotal++;
          if (isCorrect) todayLearningCorrect++;
        }
      } else {
        charStudiedBeforeToday.add(r.character);
      }

      const prevInterval = prevIntervalByChar.get(r.character);
      if (prevInterval !== undefined) {
        const bi = intervalBucket(Math.floor(prevInterval / 86400));
        intervalRetT[bi]++;
        if (isCorrect) intervalRetC[bi]++;
      }
      prevIntervalByChar.set(r.character, r.interval);

      if (r.type === CardState.REVIEW && !maturityByChar.has(r.character)) {
        maturityByChar.set(r.character, r.id);
      }
    }

    const todayNew = [...charStudiedToday].filter((c) => !charStudiedBeforeToday.has(c)).length;

    let streak = 0;
    let streakDay = streakDays.has(todayEpochDay) ? todayEpochDay : todayEpochDay - 1;
    while (streakDays.has(streakDay)) {
      streak++;
      streakDay--;
    }

    // === SRS-based computations ===
    const learningCount = filteredSrs.filter((s) => s.type === CardState.LEARNING).length;
    const youngCount = filteredSrs.filter((s) => s.type === CardState.REVIEW && s.interval < MATURE_SECS).length;
    const matureCount = filteredSrs.filter((s) => s.type === CardState.REVIEW && s.interval >= MATURE_SECS).length;
    const relearningCount = filteredSrs.filter((s) => s.type === CardState.RELEARNING).length;

    const futureMature = new Array(futureDayRange).fill(0);
    const futureYoung = new Array(futureDayRange).fill(0);
    const futureLearning = new Array(futureDayRange).fill(0);
    for (const srs of filteredSrs) {
      if (srs.type === CardState.NEW) continue;
      const days = clamp(Math.trunc((srs.due - nowSecs) / 86400), 0, futureDayRange - 1);
      if (srs.type === CardState.REVIEW && srs.interval >= MATURE_SECS) futureMature[days]++;
      else if (srs.type === CardState.REVIEW) futureYoung[days]++;
      else futureLearning[days]++;
    }
    const futureDue: FutureDueEntry[] = Array.from({ length: futureDayRange }, (_, i) => ({
      young: futureYoung[i],
      mature: futureMature[i],
      learning: futureLearning[i],
    }));

    const intervalCounts = new Array(12).fill(0);
    for (const srs of filteredSrs) {
      if (srs.type === CardState.REVIEW) intervalCounts[intervalBucket(Math.floor(srs.interval / 86400))]++;
    }

    const easeCounts = new Array(8).fill(0);
    for (const srs of filteredSrs) {
      if (srs.type === CardState.REVIEW || srs.type === CardState.RELEARNING) {
        easeCounts[easeBucket(srs.factor)]++;
      }
    }

    const hardestCards = filteredSrs
      .filter((s) => s.lapses > 0)
      .sort((a, b) => b.lapses - a.lapses || a.factor - b.factor)
      .slice(0, 10)
      .map((s) => ({ character: s.character, lapses: s.lapses, factor: s.factor }));

    // === Review history ===
    const reviewBarsPerDay = reviewRange === -1 || reviewRange > 90 ? 7 : 1;
    let reviewPeriodDays: number;
    if (reviewRange === -1) {
      let minEpoch = Infinity;
      for (const r of filteredReviews) {
        const e = Math.floor((Math.floor(r.id / 1000) + zoneOffsetSecs) / 86400);
        if (e < minEpoch) minEpoch = e;
      }
      reviewPeriodDays = minEpoch === Infinity ? 0 : todayEpochDay - minEpoch;
    } else {
      reviewPeriodDays = reviewRange;
    }
    const reviewNumBars = Math.floor(reviewPeriodDays / reviewBarsPerDay) + 1;
    const reviewStartDay = todayEpochDay - reviewPeriodDays;
    const reviewYoung = new Array(reviewNumBars).fill(0);
    const reviewMature = new Array(reviewNumBars).fill(0);
    const reviewLearning = new Array(reviewNumBars).fill(0);
    const reviewDaysWithStudy = new Set<number>();
    for (const r of filteredReviews) {
      const epochDay = Math.floor((Math.floor(r.id / 1000) + zoneOffsetSecs) / 86400);
      if (epochDay < reviewStartDay) continue;
      const barIdx = clamp(Math.floor((epochDay - reviewStartDay) / reviewBarsPerDay), 0, reviewNumBars - 1);
      reviewDaysWithStudy.add(epochDay);
      if (r.type === CardState.REVIEW && r.interval >= MATURE_SECS) reviewMature[barIdx]++;
      else if (r.type === CardState.REVIEW) reviewYoung[barIdx]++;
      else reviewLearning[barIdx]++;
    }
    const reviewEntries: FutureDueEntry[] = Array.from({ length: reviewNumBars }, (_, i) => ({
      young: reviewYoung[i],
      mature: reviewMature[i],
      learning: reviewLearning[i],
    }));
    const labelStep = Math.max(1, Math.floor(reviewNumBars / 6));
    const reviewLabels = reviewEntries.map((_, i) => {
      const barsFromEnd = reviewNumBars - 1 - i;
      if (i === reviewNumBars - 1) return '0';
      if (barsFromEnd % labelStep === 0) {
        const offset = -(barsFromEnd * reviewBarsPerDay);
        return reviewBarsPerDay === 1 ? `${offset}` : `${Math.trunc(offset / 7)}w`;
      }
      return '';
    });
    const reviewPeriodTotal = reviewEntries.reduce((acc, e) => acc + entryTotal(e), 0);

    return {
      isLoading: false,
      filter,
      futureDayRange,
      todayReviews: todayTotal,
      todayNew,
      todayAgain,
      todayMatureCorrect,
      todayMatureTotal,
      todayLearningCorrect,
      todayLearningTotal,
      totalReviews: retAllT,
      currentStreak: streak,
      unseenCount: filteredKanji.length - filteredSrs.length,
      learningCount,
      youngCount,
      matureCount,
      relearningCount,
      totalCount: filteredKanji.length,
      retentionToday: { correct: retTodayC, total: retTodayT },
      retentionYesterday: { correct: retYestC, total: retYestT },
      retentionWeek: { correct: retWeekC, total: retWeekT },
      retentionMonth: { correct: retMonthC, total: retMonthT },
      retentionAllTime: { correct: retAllC, total: retAllT },
      futureDue,
      calendarData,
      intervalBuckets: INTERVAL_LABELS.map((label, i) => [label, intervalCounts[i]] as [string, number]),
      retentionByInterval: INTERVAL_LABELS.map(
        (label, i) => [label, { correct: intervalRetC[i], total: intervalRetT[i] }] as [string, RetentionData],
      ),
      easeBuckets: EASE_LABELS.map((label, i) => [label, easeCounts[i]] as [string, number]),
      hourlyData: hourly,
      dowHourlyData: dowHourly,
      gradeProgress,
      hardestCards,
      maturityTimeline: buildMaturityTimeline(maturityByChar, zoneOffsetSecs),
      reviewHistory: reviewEntries,
      reviewHistoryLabels: reviewLabels,
      reviewRange,
      reviewDaysStudied: reviewDaysWithStudy.size,
      reviewPeriodDays,
      reviewPeriodTotal,
      reviewPeriodAvg: reviewPeriodDays > 0 ? reviewPeriodTotal / (reviewPeriodDays + 1) : 0,
      reviewStudiedAvg: reviewDaysWithStudy.size > 0 ? reviewPeriodTotal / reviewDaysWithStudy.size : 0,
    };
  };

  return {
    state: initialState,

    init: async () => {
      allKanji = await getAllKanjiWithSrs();
      allReviews = await getAllReviews();
      buildCaches();
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
