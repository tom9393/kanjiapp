// Ported from settings/SettingsProvider.kt, backed by AsyncStorage instead of DataStore.
// NOTE: the original's per-field Flow accessors had copy/paste bugs (e.g. easeBonus read
// NEW_CARDS_PER_DAY); the authoritative getSnapshot() is what the scheduler uses, so this
// port reproduces getSnapshot()'s correct mapping.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StudyConfigSnapshot } from '@/domain/scheduler';
import { BoolPref, NumberPref, Prefs } from './preferences';

export interface StudyModesSnapshot {
  handwriting: boolean;
  reading: boolean;
}

export async function getNumber(pref: NumberPref): Promise<number> {
  const raw = await AsyncStorage.getItem(pref.key);
  if (raw == null) return pref.default;
  const n = Number(raw);
  return Number.isFinite(n) ? n : pref.default;
}

export async function getBoolean(pref: BoolPref): Promise<boolean> {
  const raw = await AsyncStorage.getItem(pref.key);
  if (raw == null) return pref.default;
  return raw === 'true';
}

export async function setNumber(pref: NumberPref, value: number): Promise<void> {
  await AsyncStorage.setItem(pref.key, String(value));
}

export async function setBoolean(pref: BoolPref, value: boolean): Promise<void> {
  await AsyncStorage.setItem(pref.key, value ? 'true' : 'false');
}

export async function getSnapshot(): Promise<StudyConfigSnapshot> {
  const [
    newCardsLimit,
    resetHour,
    startingEase,
    easeBonus,
    learningAgainSecs,
    learningHardSecs,
    learningGoodSecs,
    learningEasySecs,
    graduationThresholdSecs,
    hardInterval,
    relearningAgainSecs,
    relearningGoodSecs,
  ] = await Promise.all([
    getNumber(Prefs.newCardsPerDay),
    getNumber(Prefs.dailyResetHour),
    getNumber(Prefs.startingEase),
    getNumber(Prefs.easyBonus),
    getNumber(Prefs.againDelay),
    getNumber(Prefs.hardDelay),
    getNumber(Prefs.goodDelay),
    getNumber(Prefs.easyDelay),
    getNumber(Prefs.graduatingInterval),
    getNumber(Prefs.hardInterval),
    getNumber(Prefs.relearningAgainSecs),
    getNumber(Prefs.relearningGoodSecs),
  ]);

  return {
    newCardsLimit,
    resetHour,
    startingEase,
    easeBonus,
    learningAgainSecs,
    learningHardSecs,
    learningGoodSecs,
    learningEasySecs,
    graduationThresholdSecs,
    reviewHardMultiplier: hardInterval / 100,
    relearningAgainSecs,
    relearningGoodSecs,
  };
}

export async function getStudyModes(): Promise<StudyModesSnapshot> {
  const [handwriting, reading] = await Promise.all([
    getBoolean(Prefs.studyModeHandwriting),
    getBoolean(Prefs.studyModeReading),
  ]);
  if (!handwriting && !reading) {
    return { handwriting: true, reading: false };
  }
  return { handwriting, reading };
}

export function getLearningRepetitions(): Promise<number> {
  return getNumber(Prefs.learningRepetitions);
}

export function getNewCardsLimit(): Promise<number> {
  return getNumber(Prefs.newCardsPerDay);
}

export function getResetHour(): Promise<number> {
  return getNumber(Prefs.dailyResetHour);
}

export function getStrokeWidth(): Promise<number> {
  return getNumber(Prefs.strokeWidth);
}
