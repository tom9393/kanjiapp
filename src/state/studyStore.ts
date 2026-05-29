// Ported from study/logic/StudyScreenViewModel.kt (+ SessionLoader + Events) as a zustand store.
// The View dispatches user intents by calling these actions and reacts to derived status:
// null active → loading, non-null with cards → active, empty queue → complete.
import { getKanjiWithSrsByCharacters } from '@/data/repository/kanji';
import {
  eraseAnswer,
  eraseWordAnswer,
  KanjiAnswer,
  KanjiUndo,
  recordAnswer,
  recordWordAnswer,
} from '@/data/repository/srsActions';
import { getWordStat, nextWordStat } from '@/data/repository/wordStats';
import { defaultSrs, srsOf } from '@/data/types';
import { CardEase, CardState } from '@/domain/cardState';
import { CardWithContext, Session } from '@/domain/models';
import { calculateNewState } from '@/domain/scheduler';
import * as queue from '@/domain/studyQueueSource';
import { create } from 'zustand';

export type LoadRequest =
  | { kind: 'dueAndNew' }
  | { kind: 'year'; year: number }
  | { kind: 'extra'; n: number }
  | { kind: 'custom'; filter: queue.CustomFilter; chunk: number }
  | { kind: 'list'; listId: number };

async function loadCards(req: LoadRequest): Promise<CardWithContext[]> {
  switch (req.kind) {
    case 'year':
      return queue.loadByYear(req.year);
    case 'extra':
      return queue.loadExtra(req.n);
    case 'custom':
      return queue.loadCustomChunk(req.filter, req.chunk);
    case 'list':
      return queue.loadList(req.listId);
    case 'dueAndNew':
      return queue.loadDueAndNew();
  }
}

interface StudyStore {
  active: Session | null;

  start: (req: LoadRequest) => Promise<void>;
  submitAnswer: (ease: CardEase) => Promise<void>;
  submitWordAnswer: (eases: Map<string, CardEase>) => Promise<void>;
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
    set({ active: { queue: cards, history: [], noSrs: req.kind === 'custom' || req.kind === 'list' } });
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

  // Word review: rate every kanji in the masked word at once (group mode passes the same ease for
  // all; individual mode passes one per kanji). SRS is read fresh per constituent so a kanji that
  // recurs across words this session — or a requeued word — reschedules from its current state, not
  // a stale snapshot. The word is requeued (Again semantics) iff any constituent was rated Again.
  submitWordAnswer: async (eases) => {
    const active = get().active;
    if (!active) return;
    const current = active.queue[0] ?? null;
    const rw = current?.reviewWord;
    if (!current || !rw) return;
    if (active.noSrs) {
      // noSrs sessions never attach reviewWord, but guard so practice modes can never write SRS.
      const remaining = active.queue.slice(1);
      set({ active: { queue: remaining, history: [...active.history, { originalCard: current, wasShifted: false }], noSrs: true } });
      return;
    }

    const chars = rw.constituents.map((k) => k.kanji.character);
    const fresh = await getKanjiWithSrsByCharacters(chars);
    const byChar = new Map(fresh.map((c) => [c.kanji.character, c]));

    const now = Date.now();
    const answers: KanjiAnswer[] = [];
    const undos: KanjiUndo[] = [];
    let anyAgain = false;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const ease = eases.get(ch) ?? CardEase.Good;
      if (ease === CardEase.Again) anyAgain = true;
      const cur = byChar.get(ch);
      undos.push({ character: ch, prevSrs: cur?.rawSrs ?? null });
      const newSrs = await calculateNewState(cur ? srsOf(cur) : defaultSrs(ch), ease);
      answers.push({
        srs: newSrs,
        review: {
          id: now + i, // Review.id is the global primary key, so each row needs a distinct id
          character: ch,
          updateSequenceNumber: 0,
          type: newSrs.type,
          interval: newSrs.interval,
          factor: newSrs.factor,
          ease,
        },
      });
    }

    const prevWordStat = await getWordStat(rw.word.id);
    const wordStat = nextWordStat(prevWordStat, rw.word.id, !anyAgain, now);
    await recordWordAnswer(answers, wordStat);

    const wasShifted = anyAgain;
    const remaining = active.queue.slice(1);
    set({
      active: {
        queue: wasShifted ? [...remaining, current] : remaining,
        history: [
          ...active.history,
          { originalCard: current, wasShifted, wordUndo: { wordId: rw.word.id, undos, prevWordStat } },
        ],
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
      if (last.wordUndo) {
        await eraseWordAnswer(last.wordUndo.undos, last.wordUndo.prevWordStat, last.wordUndo.wordId);
      } else {
        const card = last.originalCard.card;
        await eraseAnswer(card.kanji.character, card.rawSrs);
      }
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
