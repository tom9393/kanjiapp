// Stats data models, ported from stats/logic/StatsModels.kt. Pure types + the
// StatsUiState the screen renders; the computation that fills it lives in computeStats.ts
// and the store wiring in src/state/statsStore.ts.

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

export const initialState: StatsUiState = {
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
