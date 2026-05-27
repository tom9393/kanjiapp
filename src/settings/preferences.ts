// Preference keys + defaults ported from settings/PreferenceDataStoreHelper.kt (PreferencesKeys).
// Backed by AsyncStorage instead of DataStore.

// `label` / `description` mirror the native Pref objects (PreferenceDataStoreHelper.kt),
// so the settings screen can render each preference exactly as the Compose version did.
export interface NumberPref {
  key: string;
  default: number;
  label: string;
  description?: string;
}
export interface BoolPref {
  key: string;
  default: boolean;
  label: string;
  description?: string;
}

export const Prefs = {
  newCardsPerDay: { key: 'new_cards_per_day', default: 20, label: 'New cards per day', description: 'New cards introduced each day' } as NumberPref,
  dailyResetHour: { key: 'daily_reset_hour', default: 0, label: 'Daily reset hour', description: 'Hour of day when daily limits reset (0–23)' } as NumberPref,
  startingEase: { key: 'starting_ease', default: 2500, label: 'Starting ease' } as NumberPref,
  easyBonus: { key: 'easy_bonus', default: 140, label: 'Easy bonus' } as NumberPref,
  againDelay: { key: 'again_delay', default: 900, label: 'Again delay', description: 'Seconds before Again cards reappear' } as NumberPref,
  hardDelay: { key: 'hard_delay', default: 28800, label: 'Hard delay', description: 'Seconds before Hard cards reappear' } as NumberPref,
  goodDelay: { key: 'good_delay', default: 86400, label: 'Good delay', description: 'Seconds before Good cards reappear' } as NumberPref,
  easyDelay: { key: 'easy_delay', default: 259200, label: 'Easy delay', description: 'Seconds before Easy cards reappear' } as NumberPref,
  graduatingInterval: { key: 'graduating_interval', default: 518400, label: 'Graduating interval' } as NumberPref,
  hardInterval: { key: 'hard_interval', default: 120, label: 'Hard interval' } as NumberPref, // /100 -> reviewHardMultiplier
  relearningAgainSecs: { key: 'relearning_again_secs', default: 120, label: 'Relearning again delay', description: 'Seconds before a relapsed card reappears after Again' } as NumberPref,
  relearningGoodSecs: { key: 'relearning_good_secs', default: 86400, label: 'Relearning good delay', description: 'Seconds before a relapsed card graduates back to Review' } as NumberPref,
  learningRepetitions: { key: 'learning_repetitions', default: 3, label: 'Learning repetitions', description: 'Number of times to practice drawing new and relearning cards' } as NumberPref,
  strokeWidth: { key: 'stroke_width', default: 15, label: 'Stroke width', description: 'Width of drawing strokes (1–20)' } as NumberPref,
  maxReviewsPerDay: { key: 'max_reviews_per_day', default: 100, label: 'Max reviews per day', description: 'Maximum review cards shown each day' } as NumberPref,
  studyModeHandwriting: { key: 'study_mode_handwriting', default: true, label: 'Handwriting', description: 'Draw the kanji by hand' } as BoolPref,
  studyModeReading: { key: 'study_mode_reading', default: false, label: 'Reading', description: 'Given a word in a sentence, recall its reading' } as BoolPref,
  darkMode: { key: 'dark_mode', default: false, label: 'Dark mode', description: 'Override system theme' } as BoolPref,
  showExampleWords: { key: 'show_example_words', default: true, label: 'Show example words', description: 'Show vocabulary examples when studying or viewing kanji' } as BoolPref,
  showExampleSentences: { key: 'show_example_sentences', default: true, label: 'Show example sentences', description: 'Show example sentences when studying or viewing kanji' } as BoolPref,
  animateStrokes: { key: 'animate_strokes', default: false, label: 'Animate strokes', description: 'Play stroke-order diagrams as an animation, drawing each stroke in order' } as BoolPref,
  decomposeToPrimitives: { key: 'decompose_to_primitives', default: false, label: 'Decompose to primitives', description: 'Break the radical tree down to atomic parts and strokes instead of stopping at known kanji' } as BoolPref,
} as const;

/** Ported from getDailyResetMs() — the ms timestamp of the most recent daily reset boundary. */
export function getDailyResetMs(resetHour: number): number {
  const now = new Date();
  const reset = new Date(now);
  reset.setHours(resetHour, 0, 0, 0);
  if (now.getTime() < reset.getTime()) {
    reset.setDate(reset.getDate() - 1);
  }
  return reset.getTime();
}
