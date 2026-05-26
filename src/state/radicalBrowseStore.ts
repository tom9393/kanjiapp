// Ported from kanji/logic/KanjiScreenViewModel.kt — radical browse, split into its own store.
import { create } from 'zustand';
import { getKanjiWithSrsByCharacters } from '@/data/repository/kanji';
import { KanjiWithSrs } from '@/data/types';

export interface RadicalEntry {
  r: string;
  s: number;
  k: string[];
}

interface RadicalBrowseStore {
  radicals: RadicalEntry[] | null;
  selectedRadical: string | null;
  kanji: KanjiWithSrs[];
  loading: boolean;

  init: () => void;
  selectRadical: (radical: string) => Promise<void>;
  clearRadical: () => void;
}

export const useRadicalBrowseStore = create<RadicalBrowseStore>((set, get) => ({
  radicals: null,
  selectedRadical: null,
  kanji: [],
  loading: false,

  init: () => {
    if (get().radicals) return;
    const radicals = require('../../assets/data/kanji_radicals.json') as RadicalEntry[];
    set({ radicals });
  },

  selectRadical: async (radical) => {
    const entry = get().radicals?.find((r) => r.r === radical);
    if (!entry) return;
    set({ selectedRadical: radical, loading: true });
    const kanji = await getKanjiWithSrsByCharacters(entry.k);
    set({ kanji, loading: false });
  },

  clearRadical: () => set({ selectedRadical: null }),
}));
