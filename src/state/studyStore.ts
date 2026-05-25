// Ported from study/logic/StudyScreenViewModel.kt (+ SessionLoader + Events) as a zustand store.
// The View dispatches user intents by calling these actions and reacts to `status`: the
// terminal `complete` / `empty` values drive navigation declaratively (no one-shot channel).
import * as repo from '@/data/repository';
import { srsOf } from '@/data/types';
import { CardEase, CardState } from '@/domain/cardState';
import { CardWithContext, Session } from '@/domain/models';
import { calculateNewState } from '@/domain/scheduler';
import { afterAnswer, canUndo, currentCard, isComplete, undoLast } from '@/domain/session';
import * as queue from '@/domain/studyQueueSource';
import * as settings from '@/settings/settingsProvider';
import { create } from 'zustand';

// SessionState.Active fields. Loading state is represented separately in the store.
// Per-card reveal, session settings, and stroke width are view concerns loaded by the
// components that consume them, so they don't live here.
export interface ActiveSession {
  session: Session;
}

export type LoadRequest =
  | { kind: 'dueAndNew' }
  | { kind: 'year'; year: number }
  | { kind: 'extra'; n: number };

interface StudyStore {
  // `complete` / `empty` are terminal: the screen navigates away when it sees them.
  status: 'loading' | 'active' | 'complete' | 'empty';
  active: ActiveSession | null;

  start: (req: LoadRequest) => Promise<void>;
  submitAnswer: (ease: CardEase) => Promise<void>;
  undo: () => Promise<void>;
  canUndoCurrent: () => boolean;
}

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

export const useStudyStore = create<StudyStore>((set, get) => {
  const updateActive = (fn: (a: ActiveSession) => ActiveSession) => {
    const a = get().active;
    if (!a) return;
    set({ active: fn(a) });
  };

  // Advance the active view to `session`. A drained queue is the terminal `complete` status.
  const showSession = (session: Session) => {
    if (isComplete(session)) {
      set({ status: 'complete' });
      return;
    }
    updateActive((a) => ({ ...a, session }));
  };

  const persistAnswer = async (current: CardWithContext, newSrs: ReturnType<typeof calculateNewState>, ease: CardEase) => {
    await repo.updateState(newSrs);
    await repo.insertReview({
      id: Date.now(),
      character: current.card.kanji.character,
      updateSequenceNumber: 0,
      type: newSrs.type,
      interval: newSrs.interval,
      factor: newSrs.factor,
      ease,
    });
  };

  const revertPersistedState = async (card: CardWithContext['card']) => {
    await repo.removeLatestReview(card.kanji.character);
    if (card.rawSrs == null) {
      await repo.deleteSrs(card.kanji.character);
    } else {
      await repo.updateState(srsOf(card));
    }
  };

  return {
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
        active: { session: { queue: cards, history: [] } },
      });
    },

    submitAnswer: async (ease) => {
      const active = get().active;
      if (!active) return;
      const current = currentCard(active.session);
      if (!current) return;

      const config = await settings.getSnapshot();
      const newSrs = calculateNewState(srsOf(current.card), ease, config);
      await persistAnswer(current, newSrs, ease);

      showSession(afterAnswer(active.session, current, ease));
    },

    undo: async () => {
      const active = get().active;
      if (!active || !get().canUndoCurrent()) return;
      const [restored, undone] = undoLast(active.session);
      await revertPersistedState(undone.originalCard.card);
      showSession(restored);
    },

    canUndoCurrent: () => {
      const a = get().active;
      if (!a) return false;
      const c = currentCard(a.session);
      return canUndo(a.session) && !!c && srsOf(c.card).type === CardState.REVIEW;
    },
  };
});

// Selector hook for the current card. Only called from StudyContent, which the screen
// renders solely while `status === 'active'`, so `active` (and a current card) are always
// present — the non-null assertions pin that invariant to one place.
export function useCurrentCard(): CardWithContext {
  return useStudyStore((s) => currentCard(s.active!.session)!);
}
