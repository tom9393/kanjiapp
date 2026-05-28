// Category + level metadata for the Custom Study menu.
// Grade list mirrors GRADE_TABS in kanjiBrowseStore; JLPT covers N5-N1 only (0 = unranked).
// Kanken values are the ×10-encoded DB form documented in data/types.ts.
import type { LevelField } from '@/data/repository/kanji';
import { kankenLabel } from '@/data/types';

export interface LevelOption {
  value: number;
  label: string;
}

export interface CustomCategory {
  field: LevelField;
  title: string;
  levels: LevelOption[];
}

const GRADE_LEVELS: LevelOption[] = [
  { value: 1, label: 'Grade 1' },
  { value: 2, label: 'Grade 2' },
  { value: 3, label: 'Grade 3' },
  { value: 4, label: 'Grade 4' },
  { value: 5, label: 'Grade 5' },
  { value: 6, label: 'Grade 6' },
  { value: 8, label: 'Jr. High' },
];

const JLPT_LEVELS: LevelOption[] = [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `N${n}` }));

const KANKEN_VALUES = [100, 90, 80, 70, 60, 50, 40, 30, 25, 20, 15, 10];
const KANKEN_LEVELS: LevelOption[] = KANKEN_VALUES.map((v) => ({ value: v, label: kankenLabel(v) ?? String(v) }));

export const CUSTOM_CATEGORIES: CustomCategory[] = [
  { field: 'grade', title: 'Grade', levels: GRADE_LEVELS },
  { field: 'jlpt', title: 'JLPT', levels: JLPT_LEVELS },
  { field: 'kanken', title: 'Kanken', levels: KANKEN_LEVELS },
];

export function findCategory(field: string): CustomCategory | undefined {
  return CUSTOM_CATEGORIES.find((c) => c.field === field);
}

export function findLevel(category: CustomCategory, value: number): LevelOption | undefined {
  return category.levels.find((l) => l.value === value);
}
