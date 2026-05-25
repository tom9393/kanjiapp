// Pure Session operations ported from the Session data class in StudyModels.kt.
import { CardEase } from './cardState';
import { CardWithContext, Session, StudyHistoryItem } from './models';

export function currentCard(s: Session): CardWithContext | null {
  return s.queue[0] ?? null;
}

export function isComplete(s: Session): boolean {
  return s.queue.length === 0 && s.history.length > 0;
}

export function canUndo(s: Session): boolean {
  return s.history.length > 0;
}

export function afterAnswer(s: Session, answered: CardWithContext, ease: CardEase): Session {
  const wasShifted = ease === CardEase.Again;
  const remaining = s.queue.slice(1);
  const nextQueue = wasShifted ? [...remaining, answered] : remaining;
  return {
    queue: nextQueue,
    history: [...s.history, { originalCard: answered, wasShifted }],
  };
}

export function undoLast(s: Session): [Session, StudyHistoryItem] {
  const last = s.history[s.history.length - 1];
  const queueAfterDrop = last.wasShifted ? s.queue.slice(0, -1) : s.queue;
  const restored: Session = {
    queue: [last.originalCard, ...queueAfterDrop],
    history: s.history.slice(0, -1),
  };
  return [restored, last];
}
