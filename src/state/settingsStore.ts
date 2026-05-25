// Ported from settingsmenu/logic/SettingsScreenViewModel.kt as a zustand store.
// Loads the editable preferences into a values map and writes each change through to
// AsyncStorage. The View dispatches updates via updateNumber / updateBoolean.
import { create } from 'zustand';
import { BoolPref, NumberPref, Prefs } from '@/settings/preferences';
import {
  getBoolean,
  getNumber,
  setBoolean,
  setNumber,
} from '@/settings/settingsProvider';
import { useThemeStore } from '@/state/themeStore';

type AnyPref = NumberPref | BoolPref;

interface SettingsStore {
  values: Record<string, number | boolean>;
  loaded: boolean;
  load: (prefs: AnyPref[]) => Promise<void>;
  updateNumber: (pref: NumberPref, value: number) => Promise<void>;
  updateBoolean: (pref: BoolPref, value: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  values: {},
  loaded: false,

  load: async (prefs) => {
    const entries = await Promise.all(
      prefs.map(async (pref) => {
        const value =
          typeof pref.default === 'boolean'
            ? await getBoolean(pref as BoolPref)
            : await getNumber(pref as NumberPref);
        return [pref.key, value] as const;
      }),
    );
    set({ values: Object.fromEntries(entries), loaded: true });
  },

  updateNumber: async (pref, value) => {
    set((s) => ({ values: { ...s.values, [pref.key]: value } }));
    await setNumber(pref, value);
  },

  updateBoolean: async (pref, value) => {
    set((s) => ({ values: { ...s.values, [pref.key]: value } }));
    await setBoolean(pref, value);
    // dark_mode drives the app-wide palette (read from themeStore), so reflect it live.
    if (pref.key === Prefs.darkMode.key) {
      useThemeStore.getState().setDarkMode(value);
    }
  },
}));
