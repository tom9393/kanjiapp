// Radical → kanji groupings, loaded from the prebuilt asset.
export interface RadicalEntry {
  r: string; // radical glyph
  s: number; // stroke count
  k: string[]; // kanji that contain this radical
}

export const radicals = require('../../assets/data/kanji_radicals.json') as RadicalEntry[];
