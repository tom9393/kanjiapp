// Ported from study/logic/StudyScreenViewModel.kt (+ SessionLoader + Events) as a zustand store.
// The View dispatches user intents by calling these actions and reacts to `status`: the
// terminal `complete` / `empty` values drive navigation declaratively (no one-shot channel).
import { eraseAnswer, recordAnswer } from '@/data/repository/srsActions';
import { srsOf } from '@/data/types';
import { CardEase, CardState } from '@/domain/cardState';
import { CardWithContext, Session } from '@/domain/models';
import { calculateNewState } from '@/domain/scheduler';
import * as queue from '@/domain/studyQueueSource';
import { create } from 'zustand';

export type LoadRequest =
  | { kind: 'dueAndNew' }
  | { kind: 'year'; year: number }
  | { kind: 'extra'; n: number };

async function loadCards(req: LoadRequest): Promise<CardWithContext[]> {
  switch (req.kind) {
    case 'year':
      return queue.loadByYear(req.year);
    case 'extra':
      return queue.loadExtra(req.n);
    case 'dueAndNew':
      return queue.loadDueAndNew();
  }
}

interface StudyStore {
  // `complete` / `empty` are terminal: the screen navigates away when it sees them.
  status: 'loading' | 'active' | 'complete' | 'empty';
  active: Session | null;

  start: (req: LoadRequest) => Promise<void>;
  submitAnswer: (ease: CardEase) => Promise<void>;
  undo: () => Promise<void>;
  canUndoCurrent: () => boolean;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  status: 'loading',
  active: null,

  start: async (req) => {
    set({ status: 'loading', active: null });
    const cards = await loadCards(req);
    if (cards.length === 0) {
      set({ status: 'empty' });
      return;
    }
    set({
      status: 'active',
      active: { queue: cards, history: [] },
    });
  },

  submitAnswer: async (ease) => {
    const active = get().active;
    if (!active) return;
    const current = active.queue[0] ?? null;
    if (!current) return;

    const newSrs = await calculateNewState(srsOf(current.card), ease);
    await recordAnswer(newSrs, {
      id: Date.now(),
      character: current.card.kanji.character,
      updateSequenceNumber: 0,
      type: newSrs.type,
      interval: newSrs.interval,
      factor: newSrs.factor,
      ease,
    });

    const wasShifted = ease === CardEase.Again;
    const remaining = active.queue.slice(1);
    const nextSession: Session = {
      queue: wasShifted ? [...remaining, current] : remaining,
      history: [...active.history, { originalCard: current, wasShifted }],
    };
    if (nextSession.queue.length === 0 && nextSession.history.length > 0) {
      set({ status: 'complete' });
      return;
    }
    set({ active: nextSession });
  },

  undo: async () => {
    const active = get().active;
    if (!active || !get().canUndoCurrent()) return;

    const last = active.history[active.history.length - 1];
    const restored: Session = {
      queue: [last.originalCard, ...(last.wasShifted ? active.queue.slice(0, -1) : active.queue)],
      history: active.history.slice(0, -1),
    };

    const card = last.originalCard.card;
    await eraseAnswer(card.kanji.character, card.rawSrs);

    if (restored.queue.length === 0 && restored.history.length > 0) {
      set({ status: 'complete' });
      return;
    }
    set({ active: restored });
  },

  canUndoCurrent: () => {
    const a = get().active;
    if (!a) return false;
    const c = a.queue[0] ?? null;
    return a.history.length > 0 && !!c && srsOf(c.card).type === CardState.REVIEW;
  },
}));

// Selector hook for the current card. Only called from StudyContent, which the screen
// renders solely while `status === 'active'`, so `active` (and a current card) are always
// present — the non-null assertions pin that invariant to one place.
export function useCurrentCard(): CardWithContext {
  return useStudyStore((s) => s.active!.queue[0]!);
}
