// Ported from study/logic/StudyScreenViewModel.kt (+ SessionLoader + Events) as a zustand store.
// The View dispatches user intents by calling these actions and reacts to derived status:
// null active → loading, non-null with cards → active, empty queue → complete.
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
  | { kind: 'extra'; n: number }
  | { kind: 'custom'; filter: queue.CustomFilter; chunk: number };

async function loadCards(req: LoadRequest): Promise<CardWithContext[]> {
  switch (req.kind) {
    case 'year':
      return queue.loadByYear(req.year);
    case 'extra':
      return queue.loadExtra(req.n);
    case 'custom':
      return queue.loadCustomChunk(req.filter, req.chunk);
    case 'dueAndNew':
      return queue.loadDueAndNew();
  }
}

interface StudyStore {
  active: Session | null;

  start: (req: LoadRequest) => Promise<void>;
  submitAnswer: (ease: CardEase) => Promise<void>;
  undo: () => Promise<void>;
  canUndoCurrent: () => boolean;
  studyStatus: () => 'loading' | 'active' | 'complete';
  currentCard: () => CardWithContext;
}

export const useStudyStore = create<StudyStore>((set, get) => ({
  active: null,

  start: async (req) => {
    set({ active: null });
    const cards = await loadCards(req);
    if (cards.length === 0) return;
    set({ active: { queue: cards, history: [], noSrs: req.kind === 'custom' } });
  },

  submitAnswer: async (ease) => {
    const active = get().active;
    if (!active) return;
    const current = active.queue[0] ?? null;
    if (!current) return;

    if (!active.noSrs) {
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
    }

    const wasShifted = ease === CardEase.Again;
    const remaining = active.queue.slice(1);
    set({
      active: {
        queue: wasShifted ? [...remaining, current] : remaining,
        history: [...active.history, { originalCard: current, wasShifted }],
        noSrs: active.noSrs,
      },
    });
  },

  undo: async () => {
    const active = get().active;
    if (!active || !get().canUndoCurrent()) return;

    const last = active.history[active.history.length - 1];
    const restored: Session = {
      queue: [last.originalCard, ...(last.wasShifted ? active.queue.slice(0, -1) : active.queue)],
      history: active.history.slice(0, -1),
      noSrs: active.noSrs,
    };

    if (!active.noSrs) {
      const card = last.originalCard.card;
      await eraseAnswer(card.kanji.character, card.rawSrs);
    }

    set({ active: restored });
  },

  canUndoCurrent: () => {
    const a = get().active;
    if (!a) return false;
    if (a.history.length === 0) return false;
    if (a.noSrs) return true;
    const c = a.queue[0] ?? null;
    return !!c && srsOf(c.card).type === CardState.REVIEW;
  },

  studyStatus: () => {
    const a = get().active;
    if (a === null) return 'loading';
    if (a.queue.length === 0) return 'complete';
    return 'active';
  },

  // Only called from StudyContent, rendered solely while status === 'active', so active and
  // a current card are always present — the non-null assertions pin that invariant to one place.
  currentCard: () => get().active!.queue[0]!,
}));
