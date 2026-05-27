// Settings grouped into submenus. The settings menu lists these by title; each id is the
// route param for /settings/[section], which renders that group's preferences.
import { BoolPref, NumberPref, Prefs } from '@/settings/preferences';

export type AnyPref = NumberPref | BoolPref;

export interface Section {
  id: string;
  title: string;
  prefs: AnyPref[];
}

export const SECTIONS: Section[] = [
  { id: 'appearance', title: 'Appearance', prefs: [Prefs.darkMode, Prefs.strokeWidth] },
  {
    id: 'study',
    title: 'Study',
    prefs: [Prefs.maxReviewsPerDay, Prefs.newCardsPerDay, Prefs.dailyResetHour, Prefs.learningRepetitions],
  },
  { id: 'question-types', title: 'Question Types', prefs: [Prefs.studyModeHandwriting, Prefs.studyModeReading] },
  { id: 'srs-timing', title: 'SRS Timing', prefs: [Prefs.againDelay, Prefs.hardDelay, Prefs.goodDelay, Prefs.easyDelay] },
  { id: 'examples', title: 'Examples', prefs: [Prefs.showExampleWords, Prefs.showExampleSentences] },
];

export const ALL_PREFS: AnyPref[] = SECTIONS.flatMap((s) => s.prefs);
