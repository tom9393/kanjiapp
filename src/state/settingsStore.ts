// Ported from settingsmenu/logic/SettingsScreenViewModel.kt as a zustand store.
// Loads the editable preferences into a values map and writes each change through to
// AsyncStorage. The View dispatches updates via updateNumber / updateBoolean.
import { create } from 'zustand';
import { BoolPref, EnumPref, NumberPref, Prefs } from '@/settings/preferences';
import {
  getBoolean,
  getNumber,
  getString,
  setBoolean,
  setNumber,
  setString,
} from '@/settings/settingsProvider';
import { useThemeStore } from '@/state/themeStore';

type AnyPref = NumberPref | BoolPref | EnumPref;

interface SettingsStore {
  values: Record<string, number | boolean | string>;
  loaded: boolean;
  load: (prefs: AnyPref[]) => Promise<void>;
  updateNumber: (pref: NumberPref, value: number) => Promise<void>;
  updateBoolean: (pref: BoolPref, value: boolean) => Promise<void>;
  updateEnum: (pref: EnumPref, value: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  values: {},
  loaded: false,

  load: async (prefs) => {
    const entries = await Promise.all(
      prefs.map(async (pref) => {
        const value =
          'options' in pref
            ? await getString(pref)
            : typeof pref.default === 'boolean'
              ? await getBoolean(pref)
              : await getNumber(pref);
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

  updateEnum: async (pref, value) => {
    set((s) => ({ values: { ...s.values, [pref.key]: value } }));
    await setString(pref, value);
  },
}));
