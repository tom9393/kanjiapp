// Ported from study/logic/StudyScreenViewModel.kt (+ SessionLoader + Events) as a zustand store.
// The View dispatches user intents by calling these actions and reacts to `status`: the
// terminal `complete` / `empty` values drive navigation declaratively (no one-shot channel).
import { create } from 'zustand';
import * as repo from '@/data/repository';
import { srsOf } from '@/data/types';
import { CardEase, CardState } from '@/domain/cardState';
import {
  ActiveSession,
  CardWithContext,
  LearningPhase,
  nextPracticeRound,
  Session,
  SessionSettings,
  StudyMode,
  StudyModesSnapshot,
} from '@/domain/models';
import { calculateNewState } from '@/domain/scheduler';
import { afterAnswer, canUndo, currentCard, isComplete, undoLast } from '@/domain/session';
import * as queue from '@/domain/studyQueueSource';
import * as settings from '@/settings/settingsProvider';

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
  reveal: () => void;
  beginPractice: () => void;
  practiceRoundComplete: () => void;
  undo: () => Promise<void>;
  canUndoCurrent: () => boolean;
}

function pickReviewMode(card: CardWithContext, modes: StudyModesSnapshot): StudyMode {
  const readingAvailable = modes.reading && card.examples.length > 0;
  if (modes.handwriting && readingAvailable) {
    return Math.random() < 0.5 ? 'handwriting' : 'reading';
  }
  return readingAvailable ? 'reading' : 'handwriting';
}

function initialPhaseFor(card: CardWithContext, modes: StudyModesSnapshot): LearningPhase {
  if (srsOf(card.card).type !== CardState.REVIEW) return { kind: 'presentation' };
  return { kind: 'reviewing', mode: pickReviewMode(card, modes) };
}

async function loadSessionSettings(): Promise<SessionSettings> {
  const [learningReps, enabledModes] = await Promise.all([
    settings.getLearningRepetitions(),
    settings.getStudyModes(),
  ]);
  return { learningReps, enabledModes };
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
  const showSession = (session: Session, sessionSettings: SessionSettings, strokeWidth: number) => {
    if (isComplete(session)) {
      set({ status: 'complete' });
      return;
    }
    const card = currentCard(session);
    if (!card) return;
    set({
      status: 'active',
      active: {
        session,
        isRevealed: false,
        learningPhase: initialPhaseFor(card, sessionSettings.enabledModes),
        sessionSettings,
        strokeWidth,
      },
    });
  };

  const updateActive = (fn: (a: ActiveSession) => ActiveSession) => {
    const a = get().active;
    if (!a) return;
    set({ active: fn(a) });
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
      const sessionSettings = await loadSessionSettings();
      const strokeWidth = await settings.getStrokeWidth();
      const cards = await loadCards(req);
      if (cards.length === 0) {
        set({ status: 'empty' });
        return;
      }
      showSession({ queue: cards, history: [] }, sessionSettings, strokeWidth);
    },

    submitAnswer: async (ease) => {
      const active = get().active;
      if (!active) return;
      const current = currentCard(active.session);
      if (!current) return;

      const config = await settings.getSnapshot();
      const newSrs = calculateNewState(srsOf(current.card), ease, config);
      await persistAnswer(current, newSrs, ease);

      showSession(afterAnswer(active.session, current, ease), active.sessionSettings, active.strokeWidth);
    },

    reveal: () => updateActive((a) => ({ ...a, isRevealed: true })),

    beginPractice: () =>
      updateActive((a) => ({
        ...a,
        learningPhase: { kind: 'practice', round: 1, total: a.sessionSettings.learningReps },
      })),

    practiceRoundComplete: () =>
      updateActive((a) => {
        if (a.learningPhase.kind !== 'practice') return a;
        return { ...a, learningPhase: nextPracticeRound(a.learningPhase) };
      }),

    undo: async () => {
      const active = get().active;
      if (!active || !get().canUndoCurrent()) return;
      const [restored, undone] = undoLast(active.session);
      await revertPersistedState(undone.originalCard.card);
      showSession(restored, active.sessionSettings, active.strokeWidth);
    },

    canUndoCurrent: () => {
      const a = get().active;
      if (!a) return false;
      const c = currentCard(a.session);
      return canUndo(a.session) && !!c && srsOf(c.card).type === CardState.REVIEW;
    },
  };
});
