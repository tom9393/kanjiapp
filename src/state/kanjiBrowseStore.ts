// Ported from kanji/logic/KanjiScreenViewModel.kt (GRADE + RADICAL browse modes).
import { create } from 'zustand';
import { getKanjiWithSrsByCharacters, getKanjiWithSrsByGrade } from '@/data/repository';
import { KanjiWithSrs } from '@/data/types';

export type BrowseMode = 'grade' | 'radical';

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

interface RadicalEntry {
  r: string;
  s: number;
  k: string[];
}

interface BrowseStore {
  mode: BrowseMode;
  selectedGrade: number;
  kanji: KanjiWithSrs[];
  loading: boolean;
  radicals: RadicalEntry[] | null;
  selectedRadical: string | null;

  selectMode: (mode: BrowseMode) => Promise<void>;
  selectGrade: (grade: number) => Promise<void>;
  selectRadical: (radical: string) => Promise<void>;
  clearRadical: () => void;
  init: () => Promise<void>;
}

export const useBrowseStore = create<BrowseStore>((set, get) => {
  const loadGrade = async (grade: number) => {
    set({ loading: true });
    const kanji = await getKanjiWithSrsByGrade(grade);
    set({ kanji, loading: false });
  };

  const loadRadicals = async () => {
    if (get().radicals) return;
    const radicals = require('../../assets/data/kanji_radicals.json') as RadicalEntry[];
    set({ radicals });
  };

  return {
    mode: 'grade',
    selectedGrade: 1,
    kanji: [],
    loading: true,
    radicals: null,
    selectedRadical: null,

    init: () => loadGrade(get().selectedGrade),

    selectMode: async (mode) => {
      if (get().mode === mode) return;
      set({ mode, selectedRadical: null });
      if (mode === 'grade') {
        await loadGrade(get().selectedGrade);
      } else {
        await loadRadicals();
      }
    },

    selectGrade: async (grade) => {
      set({ selectedGrade: grade });
      await loadGrade(grade);
    },

    selectRadical: async (radical) => {
      const entry = get().radicals?.find((r) => r.r === radical);
      if (!entry) return;
      set({ selectedRadical: radical, loading: true });
      const kanji = await getKanjiWithSrsByCharacters(entry.k);
      set({ kanji, loading: false });
    },

    clearRadical: () => set({ selectedRadical: null }),
  };
});
