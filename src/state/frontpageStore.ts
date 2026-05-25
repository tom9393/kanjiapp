// Ported from frontpage/logic/FrontpageScreenViewModel.kt.
import { create } from 'zustand';
import { countDueAndNew } from '@/domain/studyQueueSource';

interface FrontpageStore {
  dueCount: number;
  newCount: number;
  extraAvailable: boolean;
  loading: boolean;
  load: () => Promise<void>;
}

export const useFrontpageStore = create<FrontpageStore>((set) => ({
  dueCount: 0,
  newCount: 0,
  extraAvailable: false,
  loading: true,
  load: async () => {
    set({ loading: true });
    const counts = await countDueAndNew();
    set({
      dueCount: counts.dueCount,
      newCount: counts.newCount,
      extraAvailable: counts.extraAvailable,
      loading: false,
    });
  },
}));

export function canStudy(s: { dueCount: number; newCount: number }): boolean {
  return s.dueCount > 0 || s.newCount > 0;
}
