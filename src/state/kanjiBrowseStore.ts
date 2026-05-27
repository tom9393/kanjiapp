// Ported from kanji/logic/KanjiScreenViewModel.kt — grade browse mode.
import { create } from 'zustand';
import { getAllKanjiWithSrs } from '@/data/repository/kanji';
import { getSuspendedCharacters } from '@/data/repository/flags';
import { KanjiWithSrs } from '@/data/types';

export interface GradeTab {
  value: number;
  label: string;
}

export const GRADE_TABS: GradeTab[] = [
  { value: 1, label: 'Grade 1' },
  { value: 2, label: 'Grade 2' },
  { value: 3, label: 'Grade 3' },
  { value: 4, label: 'Grade 4' },
  { value: 5, label: 'Grade 5' },
  { value: 6, label: 'Grade 6' },
  { value: 8, label: 'Jr. High' },
  { value: 0, label: 'Other' },
];

interface BrowseStore {
  selectedGrade: number;
  allKanji: KanjiWithSrs[];
  kanji: KanjiWithSrs[];
  suspended: Set<string>;
  loading: boolean;

  selectGrade: (grade: number) => void;
  init: () => Promise<void>;
}

export const useBrowseStore = create<BrowseStore>((set, get) => {
  // The full list is loaded once in init(); selecting a grade just filters it.
  const kanjiForGrade = (grade: number) => get().allKanji.filter((k) => k.kanji.grade === grade);

  return {
    selectedGrade: 1,
    allKanji: [],
    kanji: [],
    suspended: new Set<string>(),
    loading: true,

    init: async () => {
      // Match the old per-grade query's frequency ordering, then filter in memory.
      const [all, suspended] = await Promise.all([getAllKanjiWithSrs(), getSuspendedCharacters()]);
      const allKanji = all.sort((a, b) => a.kanji.frequency - b.kanji.frequency);
      set({ allKanji, suspended, loading: false, kanji: allKanji.filter((k) => k.kanji.grade === get().selectedGrade) });
    },

    selectGrade: (grade) => {
      set({ selectedGrade: grade, kanji: kanjiForGrade(grade) });
    },
  };
});
